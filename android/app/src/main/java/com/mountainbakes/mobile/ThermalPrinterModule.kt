package com.mountainbakes.mobile

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Base64
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import java.io.OutputStream
import java.util.UUID
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Sends ESC/POS bytes to a paired Bluetooth Classic receipt printer.
 *
 * The whole of the printing feature that has to be native is here: open a
 * serial port, write, close. What to write — the command stream, the 48-column
 * layout, the transliteration — is TypeScript in `common/printing/`, so it can
 * be tested without a printer on the desk. See `src/specs/NativeThermalPrinter.ts`
 * for why this is not a library.
 *
 * ---------------------------------------------------------------------------
 * Everything runs off the JS thread, and nothing outlives a call
 * ---------------------------------------------------------------------------
 * `BluetoothSocket.connect()` blocks — up to about twelve seconds against a
 * printer that is switched off — and `write` on the resulting stream blocks
 * until the roll has physically taken the bytes. Both go on [io], a single
 * thread, which also serialises two prints fired at once: a thermal printer has
 * one head and interleaving two receipts on it produces one unreadable receipt.
 *
 * The socket is opened and closed inside each call. See the spec for why a
 * held-open connection is the wrong shape for a till.
 */
class ThermalPrinterModule(reactContext: ReactApplicationContext) :
    NativeThermalPrinterSpec(reactContext) {

  /**
   * One thread, so prints queue instead of colliding. Not shut down on
   * `invalidate()`: a receipt half-written when the React instance reloads
   * should finish rather than leave the printer waiting mid-command for the
   * next connection to make sense of.
   */
  private val io: ExecutorService = Executors.newSingleThreadExecutor { r ->
    Thread(r, "mb-thermal-printer")
  }

  override fun getName(): String = NAME

  override fun isEnabled(promise: Promise) {
    val adapter = adapter()
    // A phone with no Bluetooth radio and a phone with it switched off are the
    // same answer here — see the spec.
    promise.resolve(adapter != null && adapter.isEnabled)
  }

  /**
   * `MissingPermission` is suppressed here and on [write] because lint cannot
   * see through [hasConnectPermission] — the guard is a call away rather than
   * an inline `checkSelfPermission`, and the `SecurityException` catch handles
   * the revoked-mid-call race lint is really warning about. Without the
   * suppression `lintVitalRelease` fails the release build.
   */
  @SuppressLint("MissingPermission")
  override fun getPairedDevices(promise: Promise) {
    if (!hasConnectPermission()) {
      promise.reject(ERR_UNAUTHORIZED, "Bluetooth permission has not been granted.")
      return
    }
    val adapter = adapter()
    if (adapter == null || !adapter.isEnabled) {
      promise.reject(ERR_BLUETOOTH_OFF, "Bluetooth is off.")
      return
    }

    io.execute {
      try {
        val out = Arguments.createArray()
        // Unfiltered by device class on purpose — printers at this end of the
        // market report an inconsistent one, and hiding a printer that is
        // sitting right there leaves the user no way to say otherwise.
        for (device in adapter.bondedDevices.orEmpty()) {
          val row = Arguments.createMap()
          // A bonded device can report a null name while the cache is cold.
          // Its address is what `write` actually addresses, so a nameless row
          // is still selectable rather than dropped.
          row.putString("name", device.name ?: device.address)
          row.putString("address", device.address)
          out.pushMap(row)
        }
        promise.resolve(out)
      } catch (e: SecurityException) {
        // The permission was revoked between the check above and this read.
        promise.reject(ERR_UNAUTHORIZED, "Bluetooth permission has not been granted.", e)
      } catch (e: Exception) {
        promise.reject(ERR_CONNECT_FAILED, e.message ?: "Could not read paired devices.", e)
      }
    }
  }

  @SuppressLint("MissingPermission")
  override fun write(address: String, payloadBase64: String, promise: Promise) {
    if (!hasConnectPermission()) {
      promise.reject(ERR_UNAUTHORIZED, "Bluetooth permission has not been granted.")
      return
    }
    val adapter = adapter()
    if (adapter == null || !adapter.isEnabled) {
      promise.reject(ERR_BLUETOOTH_OFF, "Bluetooth is off.")
      return
    }
    if (!BluetoothAdapter.checkBluetoothAddress(address)) {
      promise.reject(ERR_UNKNOWN_DEVICE, "That is not a Bluetooth address.")
      return
    }

    val bytes =
        try {
          Base64.decode(payloadBase64, Base64.DEFAULT)
        } catch (e: IllegalArgumentException) {
          promise.reject(ERR_WRITE_FAILED, "The receipt could not be decoded.", e)
          return
        }

    val device: BluetoothDevice =
        try {
          adapter.getRemoteDevice(address)
        } catch (e: IllegalArgumentException) {
          promise.reject(ERR_UNKNOWN_DEVICE, "No printer at that address.", e)
          return
        }

    io.execute {
      var socket: BluetoothSocket? = null
      try {
        socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
        // Discovery and an outgoing connection share the radio, and discovery
        // wins — connecting during one is the classic intermittent failure.
        // Nothing here starts a scan, but another app on the phone can.
        try {
          adapter.cancelDiscovery()
        } catch (_: SecurityException) {
          // Needs BLUETOOTH_SCAN on API 31+, which this app never asks for.
          // It is an optimisation, not a requirement — connect anyway.
        }
        socket.connect()
        socket.outputStream.use { stream -> sendChunked(stream, bytes) }
        promise.resolve(null)
      } catch (e: SecurityException) {
        promise.reject(ERR_UNAUTHORIZED, "Bluetooth permission has not been granted.", e)
      } catch (e: Exception) {
        // One reason for the whole connect-and-write, because from the till's
        // side they are the same event: the printer did not take the receipt.
        // Distinguishing "refused the socket" from "dropped mid-roll" would
        // give a cashier two messages with the same next step.
        promise.reject(
            if (socket?.isConnected == true) ERR_WRITE_FAILED else ERR_CONNECT_FAILED,
            e.message ?: "The printer did not respond.",
            e,
        )
      } finally {
        try {
          socket?.close()
        } catch (_: Exception) {
          // Already gone. Nothing useful left to do with the failure.
        }
      }
    }
  }

  /**
   * Write in small blocks with a pause between them.
   *
   * Cheap thermal printers carry a receive buffer of a few hundred bytes and no
   * flow control worth the name. Handed a whole receipt in one write, they take
   * the first block and drop the rest — which prints as a receipt that stops
   * mid-line rather than as an error. [CHUNK] and [CHUNK_PAUSE_MS] are the
   * conservative values that leave the buffer time to drain.
   */
  private fun sendChunked(stream: OutputStream, bytes: ByteArray) {
    var offset = 0
    while (offset < bytes.size) {
      val length = minOf(CHUNK, bytes.size - offset)
      stream.write(bytes, offset, length)
      stream.flush()
      offset += length
      if (offset < bytes.size) Thread.sleep(CHUNK_PAUSE_MS)
    }
  }

  private fun adapter(): BluetoothAdapter? =
      (reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)
          ?.adapter

  /**
   * `BLUETOOTH_CONNECT` is a runtime permission from API 31 only. Below that
   * the manifest's install-time `BLUETOOTH` covers both reading the bonded set
   * and opening a socket, so there is nothing to check and nothing to prompt
   * for.
   */
  private fun hasConnectPermission(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    return ContextCompat.checkSelfPermission(
        reactApplicationContext,
        Manifest.permission.BLUETOOTH_CONNECT,
    ) == PackageManager.PERMISSION_GRANTED
  }

  companion object {
    const val NAME: String = "ThermalPrinter"

    /**
     * The Serial Port Profile UUID, which is what every ESC/POS printer of this
     * class exposes. Not a device-specific value — it is the well-known SPP
     * service record from the Bluetooth assigned numbers.
     */
    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    private const val CHUNK = 256
    private const val CHUNK_PAUSE_MS = 24L

    /** Codes the JS side switches on. Kept in step with `printService.ts`. */
    const val ERR_UNAUTHORIZED = "unauthorized"
    const val ERR_BLUETOOTH_OFF = "bluetooth-off"
    const val ERR_UNKNOWN_DEVICE = "unknown-device"
    const val ERR_CONNECT_FAILED = "connect-failed"
    const val ERR_WRITE_FAILED = "write-failed"
  }
}
