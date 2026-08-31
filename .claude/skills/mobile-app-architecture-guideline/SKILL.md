---
name: mobile-app-architecture-guideline
description: Comprehensive architectural guidelines for building scalable and maintainable mobile applications, covering best practices in project structure, state management, navigation, and performance optimization. Use when designing or reviewing the architecture of mobile apps.
license: MIT
metadata:
  author: Shahnawaz Hussain
  tags: mobile-app, architecture, best-practices, project-structure, state-management, navigation, performance-optimization
---

# Mobile App Architecture Guidelines

## Purpose

This document defines a **general, scalable mobile app architecture guideline** (React Native friendly, but adaptable) covering:

- Navigation
- Theme/design system
- Multi-language (i18n)
- Components & screens
- Hooks
- Helpers/utils
- Assets (fonts/images/icons)
- State management
- Input validation
- Error handling & offline patterns

Use this as the "rules of the project" for humans and AI agents.

---

## 1) Core Principles

1. **Single source of truth**

   - Tokens for theme (colors, spacing, typography)
   - Typed route params for navigation
   - Centralized error and logging strategy

2. **Consistency over cleverness**

   - Reuse patterns and components
   - One styling method across the codebase
   - One state management approach (plus React Query for server state if used)

3. **Modular ownership**

   - Feature modules own their screens, feature components, services, and translations.
   - Shared module owns reusable UI and utilities.

4. **Production-minded**
   - Handle loading/empty/error/offline for every network screen.
   - Accessibility and performance considered from day 1.

---

## 2) Recommended Project Structure (General)

A scalable structure typically looks like:

```
src/
  app/              # App entry, providers, bootstrap
  navigation/       # Navigators, route types, linking
  features/         # Feature modules (screens + feature logic)
  shared/           # Shared UI components, theme, i18n, utils, services
  assets/           # Fonts, images, icons, illustrations
  state/            # Global state store and slices/atoms
  tests/            # Unit/integration/e2e
```

### Feature module template

Each feature should follow:

```
src/features/<feature>/
  screens/
  components/
  hooks/
  services/
  types/
  i18n/
  index.ts
```

---

## 3) Navigation Guidelines

### Goals

- Predictable routing
- Clear separation between auth flow and main app flow
- Typed routes
- Deep-link ready (optional)

### Recommended pattern

- **RootNavigator** decides between:
  - Auth stack
  - Main app tabs
- Each tab can have its own stack.

Example structure:

```
Root Stack
├── AuthStack (Login, Signup, Reset Password)
└── MainTabs
    ├── OrdersStack
    ├── InventoryStack
    ├── ScannerStack
    ├── LabelsStack
    └── ProfileStack
```

### Rules

1. **All route names must be constants or enums** (avoid string typos).
2. **All route params must be typed** (TypeScript route param lists).
3. Screens should not navigate using magic strings; use typed helpers.
4. Use a consistent back behavior:
   - Back arrow on deep screens
   - Close button for modal-like screens

### Navigation utilities

Create helpers for:

- `navigate(route, params)`
- `resetTo(route)`
- `openModal(route)`
- Deep linking config (optional)

---

## 4) Theme & Design System Guidelines

### Goals

- Consistent look and feel
- Easy global updates
- Minimal UI drift across screens

### Theme tokens (single source of truth)

Maintain:

- Colors
- Spacing
- Typography
- Radii
- Shadows
- Z-index levels
- Breakpoints (if needed)

### Rules

1. **Never hardcode colors/spacing** in screens.
2. **Use tokens** (`theme.colors.primary`) not literals (`#00FF00`).
3. Use an **8pt spacing scale** (4/8/12/16/24/32).
4. Keep component variants consistent:
   - Button: primary/secondary/ghost/destructive
   - Input: default/error/disabled
   - Badge: success/warning/error/info

### Typography

- Define a type scale
- Use 2–3 font weights consistently
- Ensure readable line height (1.2–1.4 typical)

---

## 5) Multi-language (i18n) Guidelines

### Goals

- No hardcoded strings
- Easy to add languages
- Correct formatting of dates/numbers/currency
- Future-proof RTL support

### Rules

1. **All visible text must come from translations**
   - Titles, buttons, placeholders, validation messages, empty states
2. Use predictable keys:
   - `common.save`, `common.cancel`
   - `auth.login.title`
   - `profile.changePassword.success`
3. Keep shared vs feature translations separated:
   - Shared common dictionaries: `shared/i18n/locales/<lang>/common.json`
   - Feature dictionaries: `features/<feature>/i18n/<lang>.json`
4. Use formatters for:
   - currency
   - dates
   - numbers
   - relative times

### RTL readiness

- Always prefer `start/end` alignment over `left/right`.
- Provide a `rtl.ts` utility to switch layouts when needed.

---

## 6) Components Guidelines

### Component categories

1. **Shared UI components** (`shared/ui`)

   - Dumb, reusable, theme-driven
   - No feature-specific business logic
   - Examples: Button, Input, Card, Badge, AppBar, SearchBar, Toast

2. **Feature components** (`features/<feature>/components`)

   - Use-case specific
   - May include domain logic (but keep heavy logic in hooks)

3. **Screen components**
   - Screens should orchestrate layout + use hooks/services
   - Avoid heavy rendering logic inside screens

### Rules

1. Shared components must support:
   - disabled/loading states
   - accessibility labels
   - theme variants
2. Components must be composable (small, reusable).
3. Keep component APIs stable:
   - avoid passing huge objects, prefer typed props.

---

## 7) Hooks Guidelines

### Purpose

Hooks encapsulate:

- data fetching
- state selection
- business logic
- UI event handlers

### Categories

- `useFeatureQuery()` for server data
- `useFeatureMutations()` for actions
- `useForm()` wrappers for input
- `useDebounce()`, `useNetworkStatus()`, `usePermissions()`

### Rules

1. Hooks should return:
   - `data`, `isLoading`, `error`
   - action callbacks
2. Hooks should not render UI.
3. Avoid side effects in render; use `useEffect` carefully.

---

## 8) Helpers & Utils Guidelines

### Helper vs util definition

- **Helpers**: domain-specific convenience functions (business meanings)
- **Utils**: generic reusable functions (formatting, debounce, etc.)

### Folder suggestion

- `shared/utils/` (generic)
- `shared/helpers/` or `features/<feature>/helpers/` (domain)

### Rules

1. Keep utilities **pure** (no UI, no side effects).
2. Centralize formatters:
   - `formatCurrency`, `formatDate`, `formatBarcode`
3. Never duplicate logic across features.

---

## 9) Assets, Fonts, Images, Icons

### Folder structure

```
src/assets/
  fonts/
  images/
  icons/
  illustrations/
```

### Fonts

- Define font family map in theme:
  - Regular/Medium/SemiBold/Bold
- Load fonts during app bootstrap.
- Use consistent fallback on Android/iOS.

### Icons

- Prefer a single icon system:
  - SVG icons (recommended) or vector icons
- Keep icon naming consistent:
  - `ic_scan`, `ic_orders`, `ic_inventory`

### Images

- Optimize sizes
- Use `@2x/@3x` variants if needed
- Keep "illustrations" separate from product images

---

## 10) State Management Guidelines

### Recommended split

1. **Server state** (API data)
   - React Query / Apollo / RTK Query
2. **Client state** (UI state)
   - Zustand / Redux Toolkit / Context (limited)

### Rules

1. Do not store server responses in global state if using React Query.
2. Global state should store:
   - auth session
   - selected warehouse/location
   - user preferences (language, theme toggles)
   - feature flags
3. Keep state normalized where it matters.
4. Avoid prop drilling by using hooks/selectors.

---

## 11) Input Validation Guidelines

### Goals

- Prevent invalid data
- Provide friendly errors
- Keep forms accessible and consistent

### Rules

1. Validation must be centralized:
   - Schema-based (Zod/Yup) or form library rules
2. Button disabled until valid.
3. Show inline error messages under fields.
4. Never rely only on placeholders; always show labels.
5. Password fields must include show/hide toggle.
6. All validation errors must be translatable via i18n keys.

### Common validations to standardize

- Email format
- Required fields
- Password strength
- Confirm password match
- Numeric bounds (quantity >= 0)
- Barcode/SKU format (if applicable)

---

## 12) Error Handling Guidelines

### Goals

- Clear user feedback
- Stable app behavior
- Easy debugging for developers

### Error categories

1. Validation errors (client)
2. Network/API errors
3. Permission errors
4. Unexpected runtime errors

### Rules

1. Create a **central error mapper**:
   - API error -> user-friendly message key
2. Use consistent UI for errors:
   - Toast/snackbar for transient issues
   - Inline errors for form fields
   - Full-screen error state for screen-level failures
3. Always provide a recovery action:
   - Retry button
   - Reconnect flow
4. Log errors:
   - Use a `logger` utility
   - Include context (screen, action, user role)
5. Never show raw server stack traces to users.

### Offline handling (recommended)

- Detect offline state
- Show offline banner
- Queue mutations if needed (optional)
- Provide "Sync now" button

---

## 13) Screen State Requirements (Mandatory)

Every screen that fetches data must handle:

1. **Loading state** (skeleton or spinner)
2. **Empty state** (message + CTA)
3. **Error state** (retry)
4. **Offline state** (banner + cached view if possible)
5. **Success feedback** (toast/banner)

---

## 14) Performance Guidelines

1. Lists must use `FlatList`/`SectionList` (not `ScrollView`).
2. Memoize heavy list items.
3. Avoid anonymous functions in large lists.
4. Use image caching for thumbnails.
5. Keep render trees shallow.

---

## 15) Security Guidelines (Basic)

1. Store tokens in secure storage (Keychain/Keystore).
2. Never log secrets.
3. Time out sessions if needed.
4. Validate on both client and server.
5. Handle logout + token refresh safely.

---

## 16) Definition of Done (DoD)

A feature/screen is "done" only if:

- [ ] Navigation route types updated
- [ ] All UI strings in i18n (all supported languages)
- [ ] Theme tokens used (no hardcoded colors/spacing)
- [ ] Loading/empty/error/offline states implemented
- [ ] Validation and user-friendly errors included
- [ ] Reusable components extracted where appropriate
- [ ] Basic accessibility checks applied
