# MOUNTAIN BAKES — COMPLETE AGENTIC IMPLEMENTATION PROMPT
## Convert the supplied Mountain Bakes mobile UI reference into a production-ready React Native app

You are the autonomous Lead Mobile Architect, React Native/TypeScript Engineer, Backend Integration Engineer, UI/UX Engineer, QA Engineer, Security Engineer, and DevOps Engineer for **Mountain Bakes**.

Your input includes an HTML design-reference file containing mobile screen mockups and interactive prototype logic. Treat that file as the visual and workflow reference for the **Branch mobile experience**. Build the actual app in the existing repository, using the current Mountain Bakes backend and Railway database. Do not merely describe what should be done: inspect, plan, implement, test, fix, and document the working application.

## 1. Mission and non-negotiable rules

1. Inspect the entire existing repository before editing. Identify whether this workspace contains the current server, web client, mobile app, or more than one package.
2. Preserve the existing backend, API contracts, Railway schema, authentication, permissions, and business rules. Reuse existing code wherever appropriate.
3. Do not create a disconnected demo, fake API, hard-coded production data, or a second source of truth.
4. Treat the supplied HTML as a **design reference**, not as code to paste into React Native. Rebuild its screens with native React Native components and TypeScript.
5. Do not assume mockup numbers, names, dates, branches, or sample records are real data. They are illustrative. All business data must come from the backend.
6. Do not invent endpoints, database tables, role names, statuses, or workflows. Audit the current implementation first.
7. Never expose service-role keys, database passwords, AWS secrets, signing secrets, or other server-only credentials in the app or source control.
8. Do not silently remove existing functionality or change financial, stock, or historical records.
9. Make small, coherent changes; run tests and type checks regularly; fix errors introduced by your work.
10. If a required backend capability is missing, document the gap and implement it only when justified by the existing architecture. Add migrations and tests for justified changes.
11. Do not claim that a feature works unless you have verified it through code inspection and appropriate tests.
12. Do not stop after producing a plan. Continue through implementation and verification unless blocked by missing credentials, unavailable infrastructure, or a decision only the owner can make.

## 2. Start with a repository audit

Run safe inspection commands first, for example:

```bash
pwd
ls -la
find . -maxdepth 3 -type f | sort
git status --short
```

Read all relevant `package.json` files, lockfiles, README files, environment examples, app entry points, navigation, API clients, auth middleware, route handlers, database schema/migrations, and existing tests. Do not print secrets from `.env` files. Record only variable names and whether configuration appears present.

Find the actual backend routes and document their method, path, auth requirements, request body, response shape, errors, and permissions. Inspect the existing Railway/Prisma setup and determine which layer owns database access. Check existing sales, orders, stock, expenses, branch closing, reporting, help desk, and production logic before implementing any of them.

Create or update:

- `docs/mobile-architecture-audit.md`
- `docs/mobile-api-contract.md`
- `docs/mobile-implementation-plan.md`

The audit must clearly distinguish existing functionality, missing functionality, assumptions, and risks. Then implement the app in the repository's established structure. If no mobile app exists, create a clearly separated mobile package (for example `mountain-bakes-mobile/`) without breaking the current server or web app.

## 3. Source design reference: screen inventory

The supplied HTML includes these 28 Branch app screen references. Implement each as a real, navigable screen or a native modal/flow where appropriate:

1. Splash
2. Onboarding 1
3. Onboarding 3 / business-day explanation
4. Login
5. Home / branch dashboard
6. New Orders
7. Create Order
8. Return Items
9. Request Discount
10. Cash Deposit
11. Sales
12. New Sale
13. Stock
14. Stock Check
15. Return Stock
16. Discounts
17. Cash Transfers
18. Shop Expenses
19. New Shop Expense
20. Special Events
21. Event Demand
22. Branch Closing
23. Daily Sale Record
24. Manual Feed
25. Reports
26. Help Desk
27. New Query
28. More / secondary navigation

The HTML's component styling, screen labels, layouts, data grouping, and interaction intent should guide the implementation. Where a mockup has nonfunctional placeholder buttons, replace them with working native interactions. Where a design shows sample figures, use live backend data and proper empty/loading/error states.

The reference has a dark, premium visual direction. Retain its visual character: near-black backgrounds, warm orange accent, bakery-inspired glow, cream/white primary text, muted secondary text, rounded cards, subtle borders, strong headings, readable labels, and clear active states. Use the actual Mountain Bakes logo asset already in the project; do not assume a new file path without checking. Preserve aspect ratio and provide a graceful fallback if the logo is missing.

## 4. Technology and architecture

Use the existing compatible stack if one already exists. Otherwise prefer:

- React Native with TypeScript
- React Navigation
- TanStack Query for server state, caching, invalidation, and refetching
- Zustand (or the repository's existing state manager) for small pieces of client state
- React Hook Form and Zod for form handling and validation
- Secure platform storage for credentials/tokens
- NetInfo or an equivalent maintained network-state library
- SQLite only where real offline persistence is required
- A maintained icon library and chart library compatible with the installed React Native version
- Native printing/share capabilities where supported and appropriate

Before adding packages, check installed dependencies and compatibility. Avoid redundant libraries and unnecessary abstractions.

Use a clean, feature-oriented structure appropriate to the repository. A suggested structure is:

```text
src/
  app/
  navigation/
  screens/
    auth/
    home/
    orders/
    sales/
    stock/
    discounts/
    cash/
    expenses/
    events/
    closing/
    daily-record/
    manual-feed/
    reports/
    help-desk/
    more/
  components/
    common/
    cards/
    forms/
    lists/
    charts/
    modals/
    feedback/
  services/
    api/
    auth/
    network/
    sync/
    printing/
  database/
    migrations/
    repositories/
  store/
  hooks/
  schemas/
  types/
  utils/
  theme/
  assets/
```

Do not force this structure if the project already has a sound convention. Keep domain logic out of UI components.

## 5. Design system and responsive behavior

Create reusable theme tokens rather than repeating colors and dimensions throughout the app. Include:

- Colors: background, elevated surface, primary accent, text, muted text, border, success, warning, danger, information.
- Typography: heading, body, label, numeric/currency styles.
- Spacing, radii, shadows/elevation, icon sizes, touch-target sizes.
- Dark theme matching the supplied reference. Add light theme only if it fits the existing product requirements or settings.
- Centralized logo/icon/image handling.

Requirements:

- Support small and large phones and tablets.
- Respect safe areas, status/navigation bars, keyboard, and platform conventions.
- Avoid fixed-height web-style layouts that clip on small screens.
- Use scroll views and virtualized lists for long content.
- Use at least 44–48 dp touch targets for important controls.
- Keep forms usable when the keyboard is open.
- Use accessible labels, readable contrast, dynamic text where practical, and meaningful loading/error announcements.
- Use restrained animations only; avoid animation that delays data entry or causes screen flicker.
- Avoid full-screen flashes on navigation and query refresh. Keep stable layouts and use skeletons/placeholders only where useful.
- Implement pull-to-refresh on data lists/dashboards where appropriate.
- Use consistent headers, cards, buttons, form fields, status chips, empty states, confirmation dialogs, and toasts.

## 6. Navigation and app lifecycle

Implement a real native navigation flow:

- Splash → restore session → load authenticated profile and permissions → route to the correct role navigator.
- First launch may show onboarding; users must be able to skip it. Persist completion safely.
- Login and logout must work against the existing authentication API.
- Use a bottom tab bar for the main high-frequency branch screens and a drawer/More area for secondary features, matching the reference and existing product conventions.
- Preserve navigation state where sensible, but clear private cached data on logout or account switch.
- Handle expired sessions, network loss, app resume, and failed initialization with recoverable UI.
- Prevent endless splash/loading states. Include retry and sign-out/recovery paths.

The supplied reference is primarily a Branch experience. Do not accidentally expose Admin, Production, or Finance functionality to a Branch account. If the existing app requires all roles in the same mobile package, build separate role-specific navigators from actual server permissions, and reuse shared UI components without mixing role access.

## 7. Authentication and security

- Use the existing authentication mechanism and session/token format.
- Store secrets only in platform-secure storage where appropriate. Never store passwords.
- Never trust a role or branch ID supplied only by the client. The backend must authorize every request and scope branch data using the authenticated identity.
- Do not embed Railway service-role credentials or database connection strings in the app.
- Handle invalid credentials, expired sessions, disabled accounts, insufficient permissions, rate limits, timeouts, and server errors clearly.
- Implement Forgot Password only according to the existing policy. If password recovery is Admin-only in the current product, enforce that on the server and UI; do not accidentally offer branch recovery that bypasses policy.
- Avoid logging tokens, passwords, customer mobile numbers, payment details, or sensitive payloads.
- Validate all inputs client-side for usability and server-side for security.
- Add authorization tests for cross-branch access attempts.

## 8. API integration rules

Build a centralized typed API client using the existing API base URL and response formats. It should support:

- Secure token attachment and refresh/session handling according to the existing auth design
- Request timeout and cancellation where appropriate
- Normalized errors with safe user-facing messages
- Development-only diagnostics without secrets
- Pagination, search, date filters, and sorting only where the backend supports them
- TanStack Query keys and invalidation after successful mutations
- Sensible retry behavior: never blindly retry non-idempotent financial mutations
- API contract tests or service tests for critical flows

Before writing a service, confirm the corresponding real endpoint and payload. Reuse actual endpoints. If the backend uses different paths or names, follow the backend rather than the illustrative names in this prompt.

## 9. Implement the screens and workflows

### A. Splash, onboarding, login
- Use the real logo and Mountain Bakes branding.
- Explain branch sales, stock, orders, daily close, and the 2 AM business-day concept shown in the reference.
- Login includes identifier/email as supported by backend, password show/hide, validation, loading state, recoverable errors, and secure session persistence.
- Never save a plaintext password.

### B. Home / branch dashboard
- Show the authenticated user's actual branch name and role.
- Fetch sales, expenses, net amount, order count, stock indicators, last-seven-day summaries, and sales-vs-deductions only from real APIs.
- Provide Daily/Weekly/Monthly or date filters only where supported.
- Charts and cards must use live values, proper currency formatting (PKR/Rs where that is the existing convention), and empty states.
- Do not calculate accounting totals differently from the server's established rules.
- A refresh must update data without blanking the whole screen.

### C. New Orders and Create Order
- Load products and rates from the backend.
- Support adding product rows, quantity, remarks, removal/editing of rows, validation, and submit confirmation.
- Submit only valid rows according to existing workflow.
- Prevent duplicate submissions and preserve server-generated order IDs/statuses.
- Respect actual order cutoff and business-date rules discovered during the audit; do not infer them solely from the mockup.
- Show order status, detail, and history using the real response data.

### D. Return Items
- Inspect the existing return workflow and implement its actual permissions and stock/accounting consequences.
- Require product, quantity, reason, and source transaction/order as applicable.
- Prevent returning more than the eligible quantity.
- Show confirmation and server result. Do not make a local-only stock adjustment.

### E. Request Discount and Discounts
- Implement the current discount request/approval model.
- Include reason, affected sale/order/items, requested amount/percentage if supported, status, timestamps, and review comments where applicable.
- Do not apply an unapproved discount unless the existing server explicitly permits it.
- Preserve an audit trail.

### F. Cash Deposit and Cash Transfers
- Follow the existing cash deposit/transfer APIs and accounting rules.
- Show amount, date, destination/source, reference, notes, status, and unique transaction ID as supported.
- Confirm before submitting; prevent duplicate financial mutations.
- Restrict access and redact sensitive information as required.

### G. Sales and New Sale
- Implement sale list, search/date filters, details, and create-sale flow according to existing APIs.
- Support customer name/mobile only where the backend permits them.
- Support multiple product rows, quantities, server-defined rates, discounts, totals, and configured payment methods.
- Use the server's pricing and total calculations as authoritative. Show a client estimate only as a preview and reconcile with the server result.
- Check stock availability using authoritative server logic. The client must not invent stock balances or bypass stock checks.
- Ensure sale creation and stock deduction are atomic on the server.
- Preserve historical transaction prices when product rates change later.
- Prevent double-tap and retry duplicates. Provide printable/shareable receipt behavior only if compatible with existing receipt requirements and platform support.

### H. Stock, Stock Check, Return Stock
- Show branch-scoped current stock, movement history, received/sold/returned/adjusted quantities, and available details supported by the API.
- Stock check must record the actual workflow and differences; it must not silently overwrite the stock ledger.
- Return Stock must use the established server transaction and reason/approval rules.
- Show clear low-stock/negative-stock warnings based on authoritative data.
- Display unique transaction IDs where available.
- Do not treat cached stock as authoritative for a new sale when the server is reachable.

### I. Shop Expenses and New Shop Expense
- List and create expenses using real categories and payment methods from the backend.
- Validate amount, date, category, description, branch scope, and required attachments/receipts if supported.
- Respect edit/delete permissions and audit requirements.
- Show unique expense IDs and server status.
- If offline entry is supported, use the controlled offline architecture described below; otherwise clearly disable the mutation offline instead of falsely claiming it was submitted.

### J. Special Events and Event Demand
- Load Admin-configured events and relevant branch demand from the backend.
- Show event name/date, instructions, preparation deadline, and demand status where available.
- Allow event demand creation/editing only if the existing role permissions and API support it.
- Do not hard-code annual events into production data. Static educational labels are acceptable only as UI copy, not as records.

### K. Branch Closing
- Follow the current close-of-business implementation and its authoritative business-date logic.
- Display all required reconciliation details available from the server: sales, payment methods, expenses, stock held, next-day demand, differences, and closing status.
- The business-day rule currently represented in the design reference ends at 2:00 AM. Verify the backend's actual timezone and cutoff logic. If the server implements the rule, display its returned business date rather than calculating a conflicting date on the device.
- Prevent duplicate closes and require confirmation for irreversible actions.
- If a close fails, preserve entered data and explain how to recover.

### L. Daily Sale Record
- Provide a date-wise sales record, totals, filters, transaction details, and export/print/share options only where existing APIs and platform capabilities support them.
- Keep historical figures stable and use server-defined business dates.
- Distinguish gross sales, discounts, expenses, net amount, and payment collections exactly as the existing accounting rules define them.

### M. Manual Feed
- Audit the existing feature and determine its actual purpose and permitted fields before implementing.
- Preserve its terminology and business behavior. If its purpose cannot be established from code or owner documentation, document the gap rather than guessing.

### N. Reports
- Implement the reference's Daily/Weekly/Monthly report controls and tabs such as Sales Trend, Top Products, and Packing Materials only where the backend supports those reports.
- Charts must be based on real response data, have empty/loading/error states, and be accessible.
- Ensure date boundaries follow the backend business timezone and 2 AM cutoff if applicable.
- Avoid loading full transaction histories when server aggregation endpoints exist.

### O. Help Desk and New Query
- Implement Help Desk list and query creation using the existing support/query workflow.
- Support unique query IDs, lookup by linked transaction ID where allowed, issue description, comments/messages, status, and admin resolution as supported.
- Branch users may see only their own branch's permitted queries.
- If a query references a sale, stock item, or expense, display only data the current user is authorized to access.
- Preserve messages and resolution history; do not silently delete unresolved support records.

### P. More / secondary navigation
- Show only screens/actions authorized for the signed-in role.
- Include account/profile, settings, sync status if implemented, and logout.
- Use the existing notification/chat/help affordances if corresponding backend capabilities exist.
- Do not display dead-end buttons.

## 10. Offline support: be accurate and safe

Do not label the app “offline-first” unless real offline behavior is implemented and tested.

Start by classifying each operation:

1. Read-only cached data safe to view offline.
2. Drafts safe to create offline.
3. Mutations that can be queued with a robust idempotency design.
4. Critical financial/stock actions that must require an online server decision.

For supported offline drafts, persist data in a local database, attach a stable client operation ID/idempotency key, track status, and retain rejected operations with their error reason. Never silently discard failed drafts. Use an explicit sync center with Pending, Syncing, Synced, Failed, and Conflict states if queued operations exist.

For sales, stock, cash, and other financial mutations, do not queue and later replay unless the server supports idempotent processing and has a safe conflict/reconciliation design. If those guarantees are absent, require a connection for final submission and clearly tell the user. Do not claim offline sales were completed when they are only drafts.

When network returns:
- Re-authenticate/validate session.
- Sync only supported queued operations in a deterministic order.
- Use idempotency keys on the server where supported.
- Reconcile with server-generated IDs and values.
- Preserve rejected records for user review.
- Avoid endless retry loops and exponential retry storms.
- Never overwrite authoritative stock, price, or accounting values based solely on stale local cache.

## 11. Unique IDs, auditability, and data integrity

- Use server-generated identifiers for committed transactions.
- Use a client-generated UUID only as an idempotency/operation key where supported; do not pretend it is the final business ID.
- Display IDs in detail screens and tables/lists where the backend provides them.
- Preserve `created_at`, `updated_at`, actor, branch, status, and reason metadata as supported.
- Use server transactions/database constraints for atomic changes.
- Avoid floating-point money calculations; use integer minor units or the existing server money representation.
- Do not change old records to reflect new product rates.
- Do not bypass existing audit logging or approval workflows.

## 12. Geofencing and branch scope

The existing Mountain Bakes requirements include branch location restrictions for certain branch operations. Audit the backend to find whether the 50 km branch-radius rule is already enforced and which operations it applies to.

- Do not treat client GPS checks as a security boundary.
- If the rule is required for a transaction, enforce it on the server using trusted configuration and validated location evidence according to the existing policy.
- Request location permission only at the point it is needed; explain why.
- Handle denied permission, unavailable GPS, inaccurate readings, and network errors safely.
- Do not collect or persist location unnecessarily.
- Never let a client choose another branch ID to access another branch's data.

## 13. Printing, receipts, export, and sharing

Implement native-compatible printing/share behavior only after checking existing requirements and installed packages. Where production/transaction slips are required:

- Use the real logo, business name, business date, branch, transaction/order ID, item quantities, prices, totals, and status returned by the server.
- Preserve the existing customer/company copy format where applicable.
- Make preview legible on phones/tablets.
- Support signatures only if the existing workflow requires them.
- Do not claim a physical printer is supported until tested on target devices/printer protocol.
- Provide a sensible share/export fallback when direct printing is unavailable.

## 14. Loading, errors, performance, and usability

Every data-driven screen needs:
- Loading state
- Empty state
- Recoverable error state with Retry
- Offline state where relevant
- Form validation
- Submission progress
- Success confirmation
- Duplicate-submit prevention

Performance:
- Use FlatList/SectionList for long lists.
- Memoize expensive calculations only when needed.
- Avoid broad state updates and unnecessary full-screen rerenders.
- Use query keys and targeted invalidation.
- Avoid refetching all app data after every mutation.
- Debounce search when appropriate.
- Cancel stale requests.
- Paginate server-side where supported.
- Keep images appropriately sized.
- Fix navigation flicker and keyboard/layout jumps.

## 15. Testing requirements

Add or update tests based on the existing test stack.

Minimum coverage:
- TypeScript/type check and lint
- Navigation/session restoration
- Role-based navigation
- Auth error handling
- API error normalization
- Form validation for order, sale, expense, return, and help desk
- Duplicate submission prevention
- Historical price preservation assumptions/contracts
- Branch authorization and cross-branch isolation
- 2 AM business-date boundary behavior as implemented by the server
- Offline draft/sync behavior for any operation explicitly supported offline
- Failed sync persistence and retry
- Dashboard loading/empty/error states
- Critical server transaction integration tests where the backend test setup permits

Run the available commands, for example:

```bash
npm run typecheck
npm run lint
npm test
```

Use the actual scripts from the repository. Do not invent a successful test result. If a test cannot run due to missing credentials or services, state the exact blocker.

## 16. Environment and deployment

- Provide `.env.example` with variable names and safe placeholders only.
- Keep API base URL configurable by development/staging/production environment.
- Never commit `.env`, secrets, signing keys, credentials, or generated private data.
- Document how to install dependencies, run the app, configure the API URL, run tests, and build Android/iOS.
- Keep the current backend deployment and web app working.
- Do not run destructive migrations or production data changes without explicit approval.
- Do not deploy, publish, or submit to app stores unless explicitly authorized.
- If Git is available, inspect `git status` before and after changes. Do not overwrite unrelated user changes or make commits/pushes unless asked.

## 17. Required deliverables

Deliver working code plus these documents:

1. `docs/mobile-architecture-audit.md`
2. `docs/mobile-api-contract.md`
3. `docs/mobile-implementation-plan.md`
4. `docs/mobile-testing-report.md`
5. `README.md` or `docs/mobile-setup.md` with local setup and build instructions
6. `.env.example` if the mobile package requires environment configuration
7. Automated tests for critical behavior
8. A list of screens completed, screens blocked by missing APIs, and the exact reason for each blocked item

## 18. Execution workflow — work autonomously

Follow this sequence:

**Phase 1 — Inspect**
- Map repository/packages, auth, APIs, database, roles, branch scoping, existing tests, and supplied UI reference.
- Record risks and actual endpoint contracts.

**Phase 2 — Plan**
- Make a dependency-aware plan with checkpoints.
- Identify which screens can use existing APIs and which need justified backend work.
- Keep business logic on the server.

**Phase 3 — Foundation**
- Configure React Native app, TypeScript, navigation, theme, secure auth, API client, query provider, error boundaries, and shared components.
- Verify the app launches before adding all features.

**Phase 4 — Implement by vertical slices**
- Build a screen and its complete flow: UI → validation → API/service → loading/error/success states → tests.
- Suggested order: auth/navigation; dashboard; products/orders; sales; stock/returns; expenses/cash; events/closing; daily record/reports; help desk; More/settings.
- Keep each slice usable before moving on.

**Phase 5 — Integration**
- Verify real backend data and permissions.
- Test simultaneous/duplicate requests and relevant business-date boundaries.
- Ensure no mock data is used in production paths.

**Phase 6 — QA**
- Run lint, type checks, tests, and available builds.
- Fix all regressions introduced by the implementation.
- Manually inspect layouts at small phone, large phone, and tablet sizes where tooling permits.

**Phase 7 — Documentation and final report**
- Update setup and architecture docs.
- Provide a concise report with:
  - What was implemented
  - Important files changed
  - Screens working end-to-end
  - Screens blocked and missing backend contracts
  - Commands run and actual results
  - Security/data-integrity considerations
  - Remaining risks and next steps

## 19. Definition of done

The task is complete only when:
- The app launches without TypeScript/build errors in the available environment.
- Navigation and authentication work with the actual backend contract.
- The 28 reference screens are implemented or individually documented as blocked with evidence.
- No production route relies on fake hard-coded business data.
- Role and branch authorization remain enforced by the server.
- Critical sale/stock/financial integrity rules are not bypassed.
- Loading, empty, error, and offline states are handled.
- Relevant tests pass, or failures/blockers are reported honestly.
- Setup and test instructions are documented.
- Existing server/web behavior has not been unintentionally broken.

## 20. Final instruction to the coding agent

Begin by inspecting the actual files and git state. Do not ask the owner to repeat details already present in the repository or this prompt. Make reasonable, reversible engineering decisions and document them. Ask a question only when a decision is genuinely blocking or could cause irreversible business/data impact. Continue until the implementation and verification work is complete; never substitute a plan or a polished mockup for a working app.