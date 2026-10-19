# Mobile setup

React Native CLI (not Expo), TypeScript. See the repo's `mobile/README.md` for the
standard React Native environment setup and `npm run android`/`npm run ios` steps; this
file covers only what's specific to this app.

## API configuration

`src/config/env.ts` points `apiBaseUrl` at the live Railway-hosted backend
(`https://mountainbakes-server-production.up.railway.app/api`) so the app works without a
local backend running. To point at a local backend during development, edit
`apiBaseUrl` directly — there is no `.env`/build-variant switch yet (plain config, no
`react-native-config` dependency). No secrets live in this file; it's just a base URL.

## Auth / session

Access token lives in memory only (`state/authStore.ts`, zustand). Refresh token persists
in `react-native-keychain` under service `com.mountainbakes.branch.refreshToken`. A
remembered login email (not a password) persists in AsyncStorage. Nothing else is
persisted client-side.

## Commands

```sh
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm test            # jest
npm run android
npm run ios
```

Run `typecheck`, `lint`, and `test` after every change — this is the convention the whole
codebase follows (see `docs/mobile-testing-report.md` for real per-slice output).

## Android builds (stuck on the logo)

A stock RN debug APK has no JS inside — it downloads it from Metro (`localhost:8081`) on
every launch, so with Metro stopped, the cable out, or `adb reverse` lost on reconnect, the
app sits on the BootSplash logo. `android/app/build.gradle` sets `debuggableVariants = []`,
so debug APKs now also embed the bundle: Metro is used when reachable (fast refresh still
works), the embedded bundle otherwise. Debug builds are slower because of this.

The embedded bundle is a snapshot from build time — rebuild to ship JS changes.

```sh
npm run android:release   # build + install a release build on the connected phone
npm run android:apk       # android/app/build/outputs/apk/release/app-release.apk
```

Release is signed with the debug key until `MB_UPLOAD_STORE_FILE`, `MB_UPLOAD_STORE_PASSWORD`,
`MB_UPLOAD_KEY_ALIAS`, `MB_UPLOAD_KEY_PASSWORD` are set in `~/.gradle/gradle.properties`
(required before Play Store; switching keys means uninstalling the old app once).

## Photo capture (Return Items)

`react-native-image-picker@8.3.1` powers Return Items' Camera/Gallery buttons. Needs a
native build before it will work on a device: iOS `pod install` plus camera/photo-library
usage-description strings in `Info.plist`; Android autolinking plus a camera/media
permission in `AndroidManifest.xml`. Not yet done in this environment — see
`mobile-testing-report.md`'s Slice 3 entry.

## Theme

The app renders in a single fixed dark theme (`shared/theme/colors.ts` → `darkColors`,
matching `design UIandUX/mountainbakesBranch.html`'s default look). There is no light
theme or OS-driven toggle — `useAppTheme()` always returns the dark palette.
