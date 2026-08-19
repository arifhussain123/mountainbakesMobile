# Troubleshooting

## The app builds but every screen is empty

`API_URL` is almost certainly unreachable. `localhost` resolves to the *phone*,
not to your machine, so one of these has to bridge the gap:

- **`adb reverse tcp:3001 tcp:3001`** — what `.env.development` assumes. Works on
  a physical device and an emulator, and needs no edit to the file. Re-run it
  after replugging the device; it does not survive a disconnect.
- `10.0.2.2` — the emulator's alias for the host. Emulator **only**; unroutable
  from a real phone.
- Your machine's LAN address — physical device on the same Wi-Fi.

The server listens on `0.0.0.0` either way (it does).

Remember `react-native-config` bakes values in at **build** time. Editing
`.env.development` and pressing reload does nothing; rebuild.

## Sign-in fails with "This account has no role assigned"

The Supabase account has no `role` in its `app_metadata`. This is deliberate
fail-closed behaviour, not a bug — an account with no recognised role gets no
session rather than a default one. Fix it server-side with
`POST /api/auth/set-custom-claims` (super_admin only).

## A figure disagrees with the web app

Check `npm run shared:check` first. `src/shared/` is a mirror of the server's
copy and **nothing mechanically enforces it** — a stale `timezone.ts` would bill
sales to the wrong business day.

If the mirror is clean, the likely cause is a numeric field used without
`toNumber()`. PostgREST serialises `numeric` as a JSON **string**, so
`"1250.00" + 100` concatenates instead of adding.

## A sale or expense says "Saved offline" while online

That is the honest report: the operation reached the queue but the drain did not
confirm it. Open the **Sync Center** — a `failed` or `conflict` row shows the
server's reason. Common causes: an expired session (the drain pauses on 401
rather than burning retries), or a 409 because stock changed.

## Stock looks wrong after a delivery

Stock moves when the **branch verifies** receipt, not when Production approves
(migration `20260810000058`). Between those two steps the pool is deliberately
unchanged. Several comments in the server tree still describe the older
behaviour and are wrong — trust the migration.

## Tests pass but the screen is blank in the app

Check for a missing `await` on `render`/`fireEvent` in the test — RTL v14 made
them async and a missing await fails silently, so the test proves nothing.

## Gradle build is extremely slow

The project sits on an external `/run/media` mount. Native compilation is
I/O-bound there — a clean build takes ~38 minutes, incremental ~5–6. Moving the
checkout to internal storage is the fix.

## `useSafeAreaInsets` throws in a test

Use `renderScreen` from `src/test-utils/render` rather than RTL's `render`.
`SafeAreaProvider` needs `initialMetrics` under Jest; without it, it waits for a
native measurement that never arrives.

## The release build warns that it is signed with the debug key

```
  ⚠  RELEASE BUILD IS SIGNED WITH THE DEBUG KEY — NOT DISTRIBUTABLE.
```

Expected on any machine that has not been given the upload key, and the build
still finishes so a local size or smoke check works. **The artefact cannot be
distributed.** The React Native template signs `release` with
`signingConfigs.debug`, whose keystore is committed, whose password is the
literal string `android`, and which is the same key on every RN install on
earth — anyone can re-sign that APK and it will install over the real one. Play
rejects it outright.

To produce a distributable build, generate the key once:

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore ~/keys/mountainbakes-upload.keystore \
  -alias mountainbakes -keyalg RSA -keysize 2048 -validity 10000
```

and put the four properties in **`~/.gradle/gradle.properties`** — outside every
repository, so the signing identity is never in a clone or a CI log:

```properties
MB_RELEASE_STORE_FILE=/home/you/keys/mountainbakes-upload.keystore
MB_RELEASE_STORE_PASSWORD=…
MB_RELEASE_KEY_ALIAS=mountainbakes
MB_RELEASE_KEY_PASSWORD=…
```

`npm run build:android` then picks up `signingConfigs.release` and the warning
stops. **Back the keystore up.** Losing it means the app can never be updated in
place again — every installed copy has to be uninstalled first.

## Release build fails on a manifest that "doesn't exist"

```
A problem was found with the configuration of task ':app:processReleaseManifest'
  - property 'mainMergedManifest' specifies file
    .../intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml
    which doesn't exist.
```

Stale `android/app/build/`, not a code fault — Gradle believed a task was
up-to-date and its output had been removed underneath it. It happens after the
dependency set changes (this tree hit it with intermediates left over from before
`@shopify/react-native-skia` was dropped, still holding a 52 MB `librnskia.so`).

```bash
npm run clean:android && npm run build:android
```

Note the giveaway: the failure is in **manifest merging**, which runs long before
any JavaScript is bundled. If your change is JS-only it cannot be the cause —
confirm that separately with

```bash
npx react-native bundle --platform android --dev false \
  --entry-file index.js --bundle-output /tmp/mb.bundle --assets-dest /tmp/mb-assets
```

Budget the full ~28 minutes for the rebuild; see **Gradle build is extremely
slow** above for why.

## `npm test` is green but prints "A worker process has failed to exit gracefully"

Something left a live handle — usually a timer — in a Jest worker. It is worth
chasing rather than living with, because it is exactly the noise a real leak
hides inside. **Do not reach for `--forceExit`**: that silences the message and
keeps the handle.

Two things make it awkward to locate:

- **A single test file never reproduces it.** Jest runs one file in-band, so
  there is no worker to fail. Pair the suspect with any trivial suite to force
  worker mode:
  `npx jest <suspect> src/utils/__tests__/money.test.ts --maxWorkers=2`
- **`--detectOpenHandles` is too slow here**, running serially with async tracing
  on. Bisect by directory, then by file, then with `-t` by test case instead.

The known instance was `renderScreen` setting `gcTime: 0` on queries but not on
mutations. A settled mutation calls `scheduleGc()` — `setTimeout(remove, gcTime)`
— and an unset mutation `gcTime` defaults to **five minutes**, so every screen
test that completed a mutation left a five-minute timer in the worker. Fixed in
`src/test-utils/render.tsx` and pinned by
`src/test-utils/__tests__/render.test.tsx`.

The other half of this pair is already handled in `jest.after-env.js`: React
Query's default notify scheduler is `setTimeout(..., 0)`, swapped there for
`queueMicrotask`.
