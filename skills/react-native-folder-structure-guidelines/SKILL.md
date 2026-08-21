---
name: react-native-folder-structure-guidelines
description: The canonical folder structure, file naming, and barrel-export conventions for this React Native scanner app (feature-sliced src/ layout with api, config, features, navigation, shared, state). Use when creating any new file, screen, component, hook, store, service, or feature — or when reviewing where existing code should live.
license: MIT
metadata:
  author: Shahnawaz Hussain
  tags: react-native, folder-structure, project-structure, conventions, feature-sliced, barrel-exports
---

# React Native Folder Structure Guidelines

## Purpose

This skill documents the **actual folder structure of this app** (`scanner/`) so that new code is placed
exactly where existing code lives. It is descriptive, not aspirational: every path below exists in the repo.

Use it whenever you:

- add a screen, component, hook, store, service, type, or translation
- are unsure whether something is `feature`-local or `shared`
- review a diff for structural drift

Related skills: `mobile-app-architecture-guideline` (the "why"), `react-native-design-guidelines` (UI specs),
`react-native-best-practices` (performance).

---

## Top-Level Layout

```
scanner/
├── android/                  # Native Android project
├── ios/                      # Native iOS project
├── __tests__/                # Jest tests (App.test.tsx)
├── .claude/skills/           # Project skills (this file lives here)
├── App.tsx                   # Root component: providers only, no business logic
├── index.js                  # RN entry point (registerComponent)
├── app.json
├── babel.config.js           # RN preset + module-resolver (@ alias) + export-namespace-from + worklets
├── metro.config.js
├── jest.config.js
├── tsconfig.json             # @react-native/typescript-config + paths: { "@/*": ["src/*"] }
├── react-native.config.js
├── .eslintrc.js / .prettierrc.js
├── Gemfile
└── src/                      # ALL application code
```

`App.tsx` is composition only — providers in this order:
`QueryClientProvider → SafeAreaProvider → StatusBar → ToastProvider → RootNavigator`, with
`import '@/shared/i18n'` as a side-effect import. Never add screens or business logic to `App.tsx`.

The `@/` alias is defined in **two places that must stay in sync**: `tsconfig.json` (`baseUrl` + `paths`,
for typechecking and editor navigation) and `babel.config.js` (`babel-plugin-module-resolver`, which does
the actual rewriting for Metro *and* Jest). Changing one without the other silently breaks the build or the
types.

---

## `src/` — The Six Buckets

```
src/
├── api/            # HTTP client, services, react-query hooks, query keys, DTO types
├── assets/         # fonts, icons, images + a typed barrel
├── config/         # env/config values
├── features/       # feature slices — the bulk of the app
├── navigation/     # navigators, routes, params, header, helpers
├── shared/         # cross-feature: ui, theme, i18n, hooks, utils, helpers
└── state/          # global Zustand stores (auth, app)
```

**Rule:** if code is used by exactly one feature, it lives inside that feature.
The moment a second feature needs it, promote it to `shared/` (or `api/`, `state/`).

---

## `src/api/` — Network Layer

```
src/api/
├── client.ts               # axios/fetch wrapper: apiClient, setTokenAccessor, isApiError, ApiError
├── queryClient.ts          # QueryClient instance + setQueryLogoutHandler
├── queryKeys.ts            # centralized query key factory
├── types.ts                # request/response DTOs (re-exported via `export type *`)
├── index.ts                # barrel
├── services/               # one file per domain, thin transport functions
│   ├── authService.ts
│   ├── inventoryService.ts
│   ├── ordersService.ts
│   ├── profileService.ts
│   ├── scannerService.ts
│   ├── syncService.ts
│   └── index.ts
└── hooks/                  # react-query wrappers, one file per domain
    ├── useOrdersApi.ts     # useOrders, useOrder, useFulfillOrder, ...
    ├── useInventoryApi.ts
    ├── useProfileApi.ts
    ├── useScanApi.ts
    ├── useSyncApi.ts
    └── index.ts
```

Conventions:

- Service files are named `<domain>Service.ts` and export plain async functions.
- Hook files are named `use<Domain>Api.ts` and export **named** hooks (`useOrders`, `useAdjustStock`).
  One file may export many hooks; list them all explicitly in `hooks/index.ts`.
- Screens/components call the `hooks/`, never `services/` or `client.ts` directly.
- Every query key comes from `queryKeys.ts` — no inline string arrays.

---

## `src/features/` — Feature Slices

Existing features: `app`, `auth`, `inventory`, `orders`, `profile`, `scanner`, `placeholder`.

A full slice (see `features/scanner/` and `features/auth/`):

```
src/features/<feature>/
├── components/     # feature-only presentational components + index.ts
├── screens/        # screen components (see the two screen shapes below)
├── hooks/          # feature-only hooks (useLoginForm, useBarcodeScanner) + index.ts
├── store/          # feature-local Zustand store (scannerStore.ts) + index.ts
├── types/          # domain types (index.ts, validation.ts)
├── utils/          # mappers.ts, packingSlipHtml.ts, scanBeep.ts — pure functions
├── config/         # static feature data (onboardingSlides.ts)
├── i18n/           # en.json + zh.json — this feature's namespace
└── index.ts        # PUBLIC API of the feature — the only import surface for outsiders
```

Take only the subfolders you need — `inventory` has no `hooks/`, `profile` is just
`i18n/ + screens/ + index.ts`, and `placeholder` is a single screen + barrel. Do not create empty
directories. **Every feature has an `index.ts`, without exception** — including small ones like `app`
(splash + language selection) and `placeholder`.

### The feature barrel (`features/<feature>/index.ts`)

The public contract of the slice. Example (`features/scanner/index.ts`):

```ts
/**
 * Scanner feature barrel export.
 */

export { ScannerScreen } from './screens';
export { useScannerStore } from './store';
export { useCameraPermission, useBarcodeScanner } from './hooks';
export type { ScanResult, BarcodeFormat, ScannerOrigin } from './types';
```

Cross-feature imports go through this barrel only — never reach into
`features/orders/components/OrderCard` from another feature. Concretely: `orders` reads scanner state via
`import { useScannerStore } from '@/features/scanner'`, **not** `@/features/scanner/store/scannerStore`.

When adding to a barrel, prefer exporting hooks, stores, and types over screens — a barrel that re-exports
screens pulls the whole feature into any consumer and is the usual source of require cycles.

### Two accepted screen shapes

**1. Folder-per-screen** — use when the screen has its own styles or sub-parts:

```
screens/LoginScreen/
├── index.tsx       # the screen component itself
└── styles.ts       # StyleSheet.create, imports tokens from shared/theme
```

Variant in use for `SplashScreen` and `LanguageSelectionScreen`:

```
screens/SplashScreen/
├── index.ts            # re-export: export { SplashScreen } from './SplashScreen';
├── SplashScreen.tsx
└── styles.ts
```

```
screens/LanguageSelectionScreen/
├── index.tsx
├── LanguageCard.tsx    # screen-local sub-component
└── styles.ts
```

**2. Flat file** — use for simple screens with few styles:
`screens/OrdersListScreen.tsx`, `screens/ProfileScreen.tsx`, `screens/SignUpScreen.tsx`.

Both shapes exist in the repo. Pick the folder shape when you need a `styles` file or a screen-local
sub-component; otherwise the flat file. When a flat screen grows a `styles` file, convert it to a folder.

**Styles files are always `styles.ts`, never `styles.tsx`** — they contain no JSX. Importers write
`import { styles } from './styles'` (extension-less), so converting one is a rename with no import changes.

### Feature components

`components/` holds only components used by ≥2 screens *within the feature*, or components extracted to
keep a screen readable (`OrderCard.tsx`, `ScannerOverlay.tsx`, `StockAdjustmentModal.tsx`).
Always add a `components/index.ts` barrel and import via `from '../../components'`.

Screen-local one-offs (like `LanguageCard.tsx`) stay next to the screen instead.

---

## `src/navigation/`

```
src/navigation/
├── RootNavigator/index.tsx        # root switch: auth vs main
├── AuthNavigator/index.tsx
├── TabsNavigator/index.tsx
├── OrdersNavigator/index.tsx
├── InventoryNavigator/index.tsx
├── ScannerNavigator/index.tsx
├── ProfileNavigator/index.tsx
├── NavigationHeader/index.tsx     # navigationHeaderOptions
├── routes.ts                      # Routes const — the only place route names are written
├── types.ts                       # *StackParamList / MainTabsParamList
├── helpers.ts                     # navigate, resetTo, openModal, goBack, navigationRef
└── index.ts                       # barrel
```

Conventions:

- One folder per navigator, component in `index.tsx`, named export matching the folder.
- Never hardcode a route string — use `Routes.AUTH_FORGOT_PASSWORD` from `navigation/routes`.
- Typed navigation: `useNavigation<NativeStackNavigationProp<AuthStackParamList>>()`, param lists in `types.ts`.
- Navigation imports feature screens through the feature barrel; features import only `Routes`, param-list
  types, and `helpers` from navigation — never a navigator.

---

## `src/shared/`

```
src/shared/
├── ui/            # design-system components, one folder each
├── theme/         # design tokens
├── i18n/          # i18next setup + shared locales
├── hooks/         # useDebouncedValue.ts
├── utils/         # pure generic: formatters.ts, debounce.ts, logger.ts + index.ts
└── helpers/       # domain-aware helpers: errorMapper.ts + index.ts
```

`utils` = pure, no domain knowledge, no UI. `helpers` = knows about app concepts (e.g. mapping API errors
to user messages). Keep the split.

### `shared/ui/`

```
shared/ui/
├── <Component>/
│   ├── <Component>.tsx     # named export
│   └── index.ts            # export { X } from './X'; export type { XProps } from './X';
└── index.ts                # aggregate barrel, exports component + its prop/variant types
```

Existing: `AlertDialog, AppText, Badge, Button, Card, IconButton, Input, ScreenState, SearchBar, Skeleton
(SkeletonBox), Toast`.

Import as `import { AppText, Button, Input } from '@/shared/ui';` — never deep-import
`@/shared/ui/Button/Button`.

Adding a UI component is three files, all required: `<Component>/<Component>.tsx`, `<Component>/index.ts`,
and a new entry in the aggregate `shared/ui/index.ts` (component **and** its exported prop type).
A component missing from the aggregate barrel gets deep-imported by the next person and drifts.

### `shared/theme/`

```
theme/
├── colors.ts  spacing.ts  typography.ts  radii.ts  shadows.ts  zIndex.ts
└── index.ts   # named exports + a combined `theme` object
```

Styles import tokens, never literals:
`import { colors, radii, spacing } from '@/shared/theme';`

### `shared/i18n/`

```
i18n/
├── index.ts
└── locales/
    ├── en/common.json
    └── zh/common.json
```

`shared/i18n/index.ts` is the single registration point: it imports `locales/*/common.json` plus every
feature's `features/<feature>/i18n/{en,zh}.json` and maps them to namespaces
(`common, auth, profile, orders, inventory, scanner`).

**Adding a feature namespace requires 3 edits:** create `features/<x>/i18n/en.json` + `zh.json`, then register
both in `shared/i18n/index.ts` `resources`. Screens read it with `useTranslation('<namespace>')`.

---

## `src/state/`

```
state/
├── authStore.ts   # useAuthStore
├── appStore.ts    # useAppStore
└── index.ts
```

Global Zustand stores only (session/auth, app-wide prefs). Feature-scoped state goes in
`features/<feature>/store/<feature>Store.ts` (see `scanner/store/scannerStore.ts`). Server state belongs in
react-query (`src/api/hooks`), not in a store.

---

## `src/assets/` and `src/config/`

```
assets/
├── fonts/     # *.ttf + index.tsx
├── icons/     # *.png
├── images/    # *.png
└── index.ts   # export const images = { logo: require('./images/rocket_sport_logo.png') }
                # export const icons  = { google: require('./icons/google.png'), ... }

config/
└── env.ts
```

Add every new image/icon to the `assets/index.ts` map and consume it as `icons.google` — no inline
`require()` inside components.

---

## Naming Rules

| Thing | Convention | Example |
|---|---|---|
| Component / screen file | `PascalCase.tsx` | `OrderCard.tsx`, `ScannerScreen.tsx` |
| Screen name | ends with `Screen` | `InventoryListScreen` |
| Navigator folder | ends with `Navigator` | `OrdersNavigator/` |
| Hook file | `use<Thing>.ts` | `useBarcodeScanner.ts`, `useOrdersApi.ts` |
| Store file | `<domain>Store.ts` | `scannerStore.ts`, `authStore.ts` |
| Service file | `<domain>Service.ts` | `ordersService.ts` |
| Utils / helpers | `camelCase.ts` | `mappers.ts`, `errorMapper.ts` |
| Styles | `styles.ts` (never `.tsx`), exporting `styles` | `screens/LoginScreen/styles.ts` |
| Barrel | `index.ts` (`index.tsx` only when it *is* the component) | |
| Types | `types/index.ts`, extra files by concern | `types/validation.ts` |
| Locales | `en.json`, `zh.json` | |

Everything uses **named exports** (`export const LoginScreen: React.FC = ...`). `App.tsx` is the one
default export.

---

## Import Rules

**The `@/` rule — one line to remember:** anything that would need `../../` or deeper is written `@/…`;
`./x` and a single `../x` stay relative.

```ts
import { colors, spacing } from '@/shared/theme';   // crosses a module boundary → alias
import { AppText, Button } from '@/shared/ui';
import { Routes } from '@/navigation/routes';
import { useLoginForm } from '@/features/auth/hooks/useLoginForm';

import { OrderCard } from '../components';           // inside the same feature → relative
import { styles } from './styles';                   // same folder → relative
```

Why the split: the alias kills the fragile `../../../../` chains that break whenever a file moves, while
short relative imports keep a feature internally self-contained (and visibly so — a `../../` inside a
feature is a hint you're reaching too far).

- `@/` maps to `src/`. Configured in `tsconfig.json` (`paths`) **and** `babel.config.js`
  (`babel-plugin-module-resolver`, a devDependency). Babel does the rewriting, so Metro and Jest both work
  without extra config; TypeScript needs the `paths` entry for typechecking and go-to-definition.
- Import order used across the codebase: React → react-native → third-party → `@/shared` (theme/ui) →
  `@/features` / `@/api` / `@/state` → `@/navigation` → local (`../components`, `./styles`) → assets.
- Always import through the nearest barrel (`@/shared/ui`, `@/shared/theme`, `../components`,
  `@/features/<x>`).
- Allowed direction: `features → shared / api / state / navigation(routes,types,helpers) / assets`.
  Forbidden: `shared → features`, and feature → another feature's internals.
  (`shared/i18n/index.ts` importing feature locale JSON is the single sanctioned exception.)

---

## Checklist: Adding a New Feature

1. `src/features/<feature>/` with only the subfolders you need.
2. `types/index.ts` — domain types first.
3. `api/services/<feature>Service.ts` + `api/hooks/use<Feature>Api.ts`, registered in both barrels, keys in `queryKeys.ts`.
4. `screens/` — folder-per-screen if it needs `styles`, flat file otherwise.
5. `components/` + `components/index.ts` for reusable pieces; screen-local one-offs stay beside the screen.
6. `hooks/`, `store/`, `utils/` as needed, each with an `index.ts`.
7. `i18n/en.json` + `i18n/zh.json`, registered in `shared/i18n/index.ts`.
8. `features/<feature>/index.ts` exposing only the public surface.
9. `navigation/<Feature>Navigator/index.tsx`, route names in `routes.ts`, param list in `types.ts`,
   wired into `TabsNavigator` or `RootNavigator`.

## Anti-Patterns (reject in review)

- New top-level folder under `src/` outside the six buckets.
- A `components/` folder at `src/` root, or generic `Utils.ts` / `Constants.ts` dumping grounds.
- Deep-importing another feature's internals, or `shared/` importing from `features/` (except i18n registry).
- Hardcoded colors, spacing, route strings, or `require()` paths inside components.
- Inline `StyleSheet.create` in a screen that already has a `styles` file, or styles in a `.tsx` component
  file once it exceeds a handful of rules.
- A component folder without an `index.ts`, or a new export missing from `shared/ui/index.ts`.
- Business logic or providers added to `App.tsx`.
- Server data cached in a Zustand store instead of react-query.
- `../../` or deeper in an import — use `@/`. Equally, `@/features/<own-feature>/…` inside that same
  feature, where a short relative path is clearer.
- A feature folder with no `index.ts`.

---

## Known Gaps (not yet addressed)

Honest list of what this structure does *not* currently solve, so nobody mistakes silence for approval:

1. **Oversized screens.** `MarkFulfilledScreen.tsx` (~970 lines), `FilterModal.tsx` (~800),
   `OrderFulfillmentScreen.tsx` (~770), `OrderDetailScreen.tsx` (~650). The folder-per-screen shape is the
   intended remedy (extract sub-components + `styles.ts` beside the screen); it just hasn't been applied.
   Treat ~300 lines as the point to split.
2. **Flat `components/` piles.** `orders/components/` holds 30 files with no subgrouping. If it keeps
   growing, group by area (`orders/components/detail/`, `.../picklist/`) — each with its own `index.ts`.
3. **`shared/i18n` depends on `features/`.** The central registry is the one inverted dependency and must be
   edited for every new feature; it also bundles all locales eagerly. Acceptable at this size; revisit with
   per-feature `i18n.addResourceBundle` self-registration if the app grows or splits.
4. **No test structure.** Only `__tests__/App.test.tsx` exists; nothing is co-located. Decide a convention
   (`<Component>.test.tsx` beside the source is the usual choice for this layout) before tests get written
   ad hoc.
