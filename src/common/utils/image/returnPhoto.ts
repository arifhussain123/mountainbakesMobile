import ReactNativeBlobUtil from 'react-native-blob-util';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type ImagePickerResponse,
  type PhotoQuality,
} from 'react-native-image-picker';
import { v4 as uuidv4 } from 'uuid';

import {
  ATTACHMENT_MIME_TYPES,
  RETURN_PHOTO_MAX_BYTES,
  RETURN_PHOTO_MAX_DIMENSION,
  RETURN_PHOTO_MAX_ORIGINAL_BYTES,
  RETURN_PHOTO_QUALITY,
} from '@/shared/types/attachment.types';

/**
 * The photo a branch attaches to a stock return: capture, shrink, keep.
 *
 * ---------------------------------------------------------------------------
 * Shrunk by the picker, at the moment it is chosen
 * ---------------------------------------------------------------------------
 * `react-native-image-picker` scales and re-encodes natively when it is handed
 * `maxWidth` / `maxHeight` / `quality`, so there is no second resizer library
 * and the full-size frame never crosses into JS. The numbers come from the
 * shared `RETURN_PHOTO_*` constants, which the server reads too.
 *
 * Two things about that native pass are worth knowing, because both are silent:
 *
 *  - It never upscales, and it keeps the aspect ratio — the bounds are a box.
 *  - **When it cannot resize, it hands back the ORIGINAL file** rather than
 *    failing. So the size check below is not belt-and-braces: it is the only
 *    thing that stops a 6 MB camera frame being queued as if it had been
 *    optimised. A photo over the server's ceiling is refused here, never
 *    uploaded as a fallback.
 *
 * ---------------------------------------------------------------------------
 * No permissions are declared for this
 * ---------------------------------------------------------------------------
 * The camera is opened through the system capture intent, which needs no
 * `CAMERA` permission as long as the app does not declare one (declaring it and
 * not holding it is what makes the intent throw). The gallery is the Android
 * photo picker, which needs no storage permission at all. The `permission`
 * error code is still handled, because a device policy or a future manifest
 * change can produce it and "nothing happened" is not an answer.
 *
 * ---------------------------------------------------------------------------
 * Kept somewhere the OS will not clean
 * ---------------------------------------------------------------------------
 * The picker writes into the app's CACHE directory, which Android may empty
 * whenever storage is short. A return queued at 9pm with no signal has to
 * still have its photo at 7am, so `persistPhoto` copies it into the documents
 * directory, and the copy is deleted only once the server holds the return.
 */

export type PhotoSource = 'camera' | 'gallery';

/** A photo that exists only on this device. `uri` always carries `file://`. */
export interface LocalPhoto {
  uri: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  /** Size before the picker shrank it, when the platform can tell us. */
  originalBytes?: number;
}

export type PhotoPickErrorCode =
  | 'permission'
  | 'camera_unavailable'
  | 'unprocessable'
  | 'too_large';

export type PickPhotoResult =
  | { status: 'picked'; photo: LocalPhoto }
  | { status: 'cancelled' }
  | {
      status: 'error';
      code: PhotoPickErrorCode;
      message: string;
      /** True when the fix is in system settings, so the UI can offer the trip. */
      canOpenSettings: boolean;
    };

export const PHOTO_MESSAGES = {
  permission: 'Camera permission is required to capture a return photo.',
  cameraUnavailable: 'No camera is available on this device. Choose a photo from the gallery instead.',
  unprocessable: 'Unable to process this photo. Please try another image.',
} as const;

/**
 * The options handed to the native picker — exported so a test can pin them
 * and so the numbers in the docs are the numbers in the code.
 *
 * `includeBase64` stays off: a base64 copy of the frame in JS memory is the
 * thing this whole arrangement avoids. `saveToPhotos` stays off because it is
 * the one option that needs the legacy storage permission on old Androids.
 */
export const RETURN_PHOTO_PICKER_OPTIONS = {
  mediaType: 'photo',
  maxWidth: RETURN_PHOTO_MAX_DIMENSION,
  maxHeight: RETURN_PHOTO_MAX_DIMENSION,
  quality: RETURN_PHOTO_QUALITY as PhotoQuality,
  includeBase64: false,
  includeExtra: false,
} as const;

const CAMERA_OPTIONS = {
  ...RETURN_PHOTO_PICKER_OPTIONS,
  saveToPhotos: false,
  cameraType: 'back',
} as const;

const LIBRARY_OPTIONS = {
  ...RETURN_PHOTO_PICKER_OPTIONS,
  selectionLimit: 1,
} as const;

const PHOTO_DIR_NAME = 'return-photos';

function failure(code: PhotoPickErrorCode, message: string): PickPhotoResult {
  return { status: 'error', code, message, canOpenSettings: code === 'permission' };
}

function isAcceptedMime(mime: string): boolean {
  return (ATTACHMENT_MIME_TYPES as readonly string[]).includes(mime);
}

/** blob-util wants a bare path; the picker and `<Image>` want a `file://` URI. */
function toPath(uri: string): string {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

function extensionFor(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

/**
 * The size of what the user actually chose, before the picker shrank it.
 *
 * Best-effort and gallery-only in practice: a camera capture's original is
 * deleted by the picker as soon as it has been re-encoded, so there is nothing
 * left to measure. Never fatal — it feeds a development log and one guard.
 */
async function originalSize(asset: Asset): Promise<number | undefined> {
  const original = asset.originalPath;
  if (!original || original === asset.uri) return undefined;
  try {
    const stat = await ReactNativeBlobUtil.fs.stat(original);
    const size = Number(stat?.size);
    return Number.isFinite(size) && size > 0 ? size : undefined;
  } catch {
    return undefined;
  }
}

function logReduction(photo: LocalPhoto): void {
  // `babel-plugin-transform-remove-console` strips this from a release build,
  // and the `__DEV__` guard keeps the arithmetic out of it as well.
  if (!__DEV__) return;
  const optimisedKb = (photo.sizeBytes / 1024).toFixed(1);
  if (photo.originalBytes && photo.originalBytes > 0) {
    const originalKb = (photo.originalBytes / 1024).toFixed(1);
    const reduction = (100 * (1 - photo.sizeBytes / photo.originalBytes)).toFixed(1);
    console.log(
      `[return-photo] original ${originalKb} KB → optimised ${optimisedKb} KB ` +
        `(${reduction}% smaller), ${photo.width}×${photo.height}`,
    );
  } else {
    console.log(
      `[return-photo] optimised ${optimisedKb} KB, ${photo.width}×${photo.height} ` +
        '(original size not reported by the picker)',
    );
  }
}

/**
 * Turn the picker's answer into a photo this app is willing to queue.
 *
 * Exported for the tests; screens call `pickReturnPhoto`.
 */
export async function validatePickedAsset(asset: Asset | undefined): Promise<PickPhotoResult> {
  if (!asset?.uri) return failure('unprocessable', PHOTO_MESSAGES.unprocessable);

  const mimeType = (asset.type ?? '').toLowerCase();
  if (!isAcceptedMime(mimeType)) return failure('unprocessable', PHOTO_MESSAGES.unprocessable);

  const sizeBytes = Number(asset.fileSize);
  // No size is no proof the file was written, and it is the one figure the
  // ceiling below depends on.
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return failure('unprocessable', PHOTO_MESSAGES.unprocessable);
  }

  const originalBytes = await originalSize(asset);
  if (originalBytes !== undefined && originalBytes > RETURN_PHOTO_MAX_ORIGINAL_BYTES) {
    return failure('too_large', PHOTO_MESSAGES.unprocessable);
  }

  // Over the server's ceiling means the native pass did not compress it (see
  // the header). The original is never sent as a fallback.
  if (sizeBytes > RETURN_PHOTO_MAX_BYTES) {
    return failure('too_large', PHOTO_MESSAGES.unprocessable);
  }

  const photo: LocalPhoto = {
    uri: toFileUri(asset.uri),
    mimeType,
    sizeBytes,
    width: Number(asset.width) || 0,
    height: Number(asset.height) || 0,
    ...(originalBytes !== undefined ? { originalBytes } : {}),
  };
  logReduction(photo);
  return { status: 'picked', photo };
}

/**
 * Open the camera or the system photo picker and return one optimised photo.
 *
 * Never throws: every way this can go wrong comes back as a typed result, so a
 * screen has nothing to catch and a native failure cannot take the form down.
 */
export async function pickReturnPhoto(source: PhotoSource): Promise<PickPhotoResult> {
  let response: ImagePickerResponse;
  try {
    response =
      source === 'camera'
        ? await launchCamera(CAMERA_OPTIONS)
        : await launchImageLibrary(LIBRARY_OPTIONS);
  } catch {
    return failure('unprocessable', PHOTO_MESSAGES.unprocessable);
  }

  if (response.didCancel) return { status: 'cancelled' };

  if (response.errorCode === 'permission') {
    return failure('permission', PHOTO_MESSAGES.permission);
  }
  if (response.errorCode === 'camera_unavailable') {
    return failure('camera_unavailable', PHOTO_MESSAGES.cameraUnavailable);
  }
  if (response.errorCode) {
    return failure('unprocessable', PHOTO_MESSAGES.unprocessable);
  }

  try {
    return await validatePickedAsset(response.assets?.[0]);
  } catch {
    return failure('unprocessable', PHOTO_MESSAGES.unprocessable);
  }
}

/** Where queued return photos live. Documents, not cache — see the header. */
export function returnPhotoDir(): string {
  return `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${PHOTO_DIR_NAME}`;
}

/**
 * Copy an optimised photo out of the cache into app-controlled storage.
 *
 * A COPY, not a move: the screen is still showing the cache file as its
 * preview, and a queued return keeps its form on screen. Returns the `file://`
 * URI of the copy, which is what goes into the queued payload.
 */
export async function persistPhoto(tempUri: string, mimeType = 'image/jpeg'): Promise<string> {
  const dir = returnPhotoDir();
  if (!(await ReactNativeBlobUtil.fs.exists(dir))) {
    await ReactNativeBlobUtil.fs.mkdir(dir);
  }
  const destination = `${dir}/${uuidv4()}.${extensionFor(mimeType)}`;
  await ReactNativeBlobUtil.fs.cp(toPath(tempUri), destination);
  return toFileUri(destination);
}

/** True when the file behind a stored photo URI is still on the device. */
export async function photoExists(uri: string): Promise<boolean> {
  try {
    return await ReactNativeBlobUtil.fs.exists(toPath(uri));
  } catch {
    return false;
  }
}

/**
 * Remove a photo file. Never throws — it runs after a return has synced, and a
 * cleanup that fails must not turn a success into an error.
 */
export async function deletePersistedPhoto(uri: string | null | undefined): Promise<void> {
  if (!uri) return;
  try {
    await ReactNativeBlobUtil.fs.unlink(toPath(uri));
  } catch {
    // Already gone, or not ours to remove. Either way there is nothing to do.
  }
}
