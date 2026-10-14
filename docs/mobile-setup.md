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
