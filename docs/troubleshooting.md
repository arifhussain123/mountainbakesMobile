# Troubleshooting

## The app builds but every screen is empty

`API_URL` is almost certainly wrong. On an Android **emulator**, the host machine
is `10.0.2.2`, not `localhost` — `localhost` resolves to the phone itself. On a
physical device it must be your machine's LAN address, and the server must be
listening on `0.0.0.0` (it is).

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
