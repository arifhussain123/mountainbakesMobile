# Mountain Bakes Branch Dashboard — React Native Agentic Development Prompt

> **SUPERSEDED ON VISUALS/STRUCTURE (2026-10-15):** `design UIandUX/mountainbakesBranch.html` (plus `mountainbakesProduction.html` / `mountainbakesFinance.html` for the other roles) is the one source of truth for every screen's layout, sections, copy, and dark theme (`--bg #0B0C12`, `--ac #FF6B35`, glass cards). It is a literal, numbered mock (26 `data-screen-label` sections) meant to be reproduced faithfully in React Native — not reinterpreted. Where anything below (brand design in §3, "do NOT reproduce the screenshot literally" in §48, the light cream theme, the drawer section list in §5, the dashboard section order in §47) conflicts with that HTML file, the HTML file wins. Architecture/state-management/API-reuse guidance below (§2, §42-46) still applies.

## ROLE

You are a senior React Native mobile architect, UI/UX designer, and autonomous coding agent.

Build the **Mountain Bakes Branch Dashboard mobile application** from the provided dashboard reference design.

The mobile app must preserve the existing Mountain Bakes business logic, stock calculations, sales calculations, branch operations, and dashboard information while redesigning the desktop dashboard into a **modern, responsive, touch-friendly React Native mobile experience**.

Do not simply shrink the desktop UI.

Instead, intelligently transform every dashboard section into a mobile-first interface.

---

# 1. TECHNOLOGY

Build using:

- React Native CLI
- TypeScript
- React Navigation
- Native Bottom Tabs
- Native Drawer Navigation
- React Native Safe Area Context
- React Native Gesture Handler
- React Native Reanimated where useful
- React Native SVG / chart library for graphs
- Supabase as backend
- Existing Mountain Bakes API/business logic where available

Do NOT use Expo unless the existing project specifically requires it.

Architecture:

```text
Mountain Bakes Mobile
│
├── Authentication
│
├── Branch Dashboard
│
├── Sales
│
├── Orders
│
├── Stock
│
├── Expenses
│
├── Demands
│
├── Returns
│
├── Reports
│
├── Notifications
│
├── Support
│
└── Profile / Settings
```

---

# 2. IMPORTANT AGENTIC RULE

Before writing code:

1. Inspect the existing project structure.
2. Inspect existing API services.
3. Inspect Supabase configuration.
4. Inspect existing database models.
5. Reuse existing business logic.
6. Reuse existing authentication.
7. Reuse existing product IDs and transaction IDs.
8. Do not create duplicate backend logic if it already exists.
9. Do not delete working functionality.
10. Do not replace existing APIs without first understanding them.
11. Identify reusable components and services.
12. Build the mobile UI incrementally.
13. Test each screen before moving to the next screen.
14. Fix TypeScript and navigation errors automatically.
15. Keep the application production-ready.

If an existing implementation conflicts with the new design, preserve the business logic and improve only the UI/UX unless explicitly required otherwise.

---

# 3. BRAND DESIGN

Use Mountain Bakes branding throughout the application.

## Visual style

Create a modern bakery/business dashboard:

- Warm cream background
- White cards
- Orange bakery accent
- Dark brown text
- Soft shadows
- Rounded cards
- Rounded buttons
- Clean typography
- Minimal borders
- Large readable numbers
- Professional business appearance

Use consistent spacing:

```text
4
8
12
16
20
24
32
```

Use rounded corners approximately:

```text
8–16px
```

Avoid excessive shadows.

The UI should feel like a modern POS/business management application rather than a generic admin dashboard.

---

# 4. MOBILE NAVIGATION

Use:

## Bottom Tabs

Create stylish bottom navigation with:

1. Home
2. Sales
3. Orders
4. Stock
5. More

Use icons.

The selected tab must have:

- Accent color
- Filled/active icon
- Small active indicator
- Clear label

The bottom tab bar must remain comfortable for one-hand operation.

---

# 5. DRAWER NAVIGATION

The hamburger/menu button should open a modern side drawer.

Drawer sections:

### Main

- Dashboard
- New Sale
- Sales History
- Orders
- Stock
- Stock History
- Branch Demand
- Returns
- Expenses
- Reports

### Management

- Products
- Price List
- Packaging Materials
- Notifications

### Support

- Support Center
- Help Desk

### Account

- Profile
- Settings
- Logout

Show the Mountain Bakes logo at the top of the drawer.

Display the current branch name below the logo.

Example:

```text
Mountain Bakes
Committee Chowk Branch
```

---

# 6. DASHBOARD SCREEN

Convert the uploaded desktop dashboard into a mobile dashboard.

Header:

```text
Good Morning
Committee Chowk Branch

[Notification] [Menu]
```

Add a date selector:

```text
Today
25 Aug 2026
```

Allow:

- Today
- Yesterday
- Custom Date
- This Week
- This Month

---

# 7. SUMMARY CARDS

Desktop cards:

```text
Sales
Expenses
Net Amount
Orders
Discounts
```

Transform them into a horizontally scrollable mobile card section.

Example:

```text
┌──────────────────────────┐
│ SALES                    │
│ Rs. 34,050               │
│ ↑ Today's sales          │
└──────────────────────────┘
```

Cards:

### Sales

Show:

- Total sales
- Sale amount
- Optional comparison with previous day

### Expenses

Show:

- Total expenses

### Net Amount

Calculate:

```text
Net Amount = Sales - Expenses
```

### Orders

Show:

- Total orders
- Pending
- Completed
- Cancelled

### Discounts

Show:

- Total discount

Cards must update dynamically from the selected date.

---

# 8. BUDGET VS ACTUAL

Create a mobile card:

```text
Budget vs Actual

Budget
Rs. XX,XXX

Actual
Rs. XX,XXX

Difference
Rs. X,XXX
```

Use a progress bar.

If no budget exists:

```text
No budget set for this period.

Ask Admin to configure branch budget.
```

Do not display fake budget values.

---

# 9. ORDER SUMMARY

Create a dedicated card:

```text
Orders

Total       43
Pending      0
Completed   43
Cancelled    0
```

Use small status badges.

Status colors should be consistent throughout the app.

---

# 10. STOCK OVERVIEW

Create a mobile stock overview card.

Display:

```text
Branch Stock

Opening Stock
66

New Stock
0

Sold
0

Adjustment
0

Remaining
66
```

Use the existing Mountain Bakes stock calculation.

Do not invent a new stock algorithm.

---

# 11. STOCK CALCULATION

The business logic must follow the existing Mountain Bakes stock system.

Conceptually:

```text
Opening Stock
+
Prepared/New Stock
+
Adjustments
-
Sales
-
Returns
=
Remaining Stock
```

Where the existing system defines a different transaction behavior, use the existing backend calculation.

Every stock movement must be traceable.

Each transaction should have:

- Unique ID
- Product ID
- Branch ID
- Date
- Quantity
- Amount
- Transaction type
- Created timestamp
- User

---

# 12. STOCK HISTORY

Convert the desktop stock table into a mobile list.

Each day should appear as an expandable card.

Example:

```text
26 Aug 2026
────────────────
Previous Stock     66
New Stock           0
Sold                0
Adjustment          0
Remaining          66
────────────────
Value: Rs. 19,600
```

Tap the card to expand detailed transactions.

Provide:

- Date filter
- Product filter
- Transaction filter
- Search

---

# 13. STOCK DETAIL

Create a dedicated Stock Detail screen.

Show:

```text
26 Aug 2026

Previous Balance
66
Rs. 19,600

New Stock
0
Rs. 0

Sale Stock
0
Rs. 0

Remaining Stock
66
Rs. 19,600

End Difference
0
Rs. 0
```

Also show:

```text
Stock page check against Stock page
```

If there is a discrepancy:

```text
⚠ Stock Difference Detected
```

Provide an option to open the relevant transactions.

---

# 14. DAILY SALES CHART

Convert the desktop graph into a mobile chart.

Create:

```text
Daily Sales
```

Allow switching between:

- Revenue
- Orders

Time ranges:

- 7 Days
- 30 Days
- Custom

The chart must be touch interactive.

On tap show:

```text
25 Aug

Revenue
Rs. 34,050

Orders
43
```

Do not display charts with fake values.

---

# 15. TOP PRODUCTS

Convert the desktop donut chart into a mobile Top Products card.

Show:

```text
Top Products

1. Cream Puff       28%
2. HTVE Cake Bento  22%
3. KitKat Cake      18%
4. Millennium Cake 17%
5. Other             15%
```

Use a donut chart.

Allow:

- Today
- Week
- Month

Tap a product to open product sales details.

---

# 16. SALES VS EXPENSES

Create a mobile comparison chart.

Show:

```text
Sales vs Expenses

Sales
Rs. 34,050

Expenses
Rs. 2,370

Net
Rs. 31,680
```

Use a clean bar chart.

Allow date range filtering.

---

# 17. QUICK ACTIONS

Place a Quick Actions section near the top of the dashboard.

Buttons:

```text
+ New Sale
+ New Order
Stock
Demand
Expense
Return
```

Use icons and compact cards.

The New Sale button should be visually prominent.

---

# 18. NEW SALE

Create a mobile POS-style sale screen.

Fields:

```text
Customer Name
Mobile Number

Search Product
Product
Quantity
Price
Discount
Total
```

Payment methods:

- Cash
- Easypaisa
- Foodpanda
- Bank Account

Show:

```text
Subtotal
Discount
Grand Total
Payment Method
```

Before completing a sale:

```text
Check available stock.
```

If stock is insufficient:

```text
Insufficient Stock

Available: 3
Requested: 5
```

Do not allow invalid stock deduction.

---

# 19. SALE HISTORY

Show sales as cards.

Example:

```text
Sale #SAL-000123
25 Aug 2026 · 08:45 PM

Customer
Walk-in Customer

Items
Cream Puff × 4
Chocolate Cake × 1

Total
Rs. 1,200

Payment
Cash

[View] [Reprint]
```

Provide:

- Search
- Date filter
- Payment filter
- Customer search

---

# 20. ORDERS

Orders screen must show:

- New
- Pending
- Approved
- Delivered
- Returned
- Cancelled

Use tabs or segmented controls.

Each order card:

```text
Order #ORD-00123

Committee Chowk Branch

Cream Puff × 20
Pastry × 10

Total Qty: 30

Status: Pending

[View]
```

---

# 21. BRANCH DEMAND

Create a branch demand screen.

Display products and requested quantities.

Example:

```text
Product              Qty

Cream Puff             20
Chocolate Pastry       15
Cake                    5
```

Provide:

- Submit Demand
- Edit Quantity
- Remove Item
- Add Product
- Remarks

Respect the configured order/demand time window from the existing system.

---

# 22. PRODUCTION ORDERS

Branch users should be able to see:

```text
Requested
Approved
Prepared
Delivered
Returned
```

Each production order must contain:

- Order number
- Branch
- Date
- Product
- Quantity
- Changed quantity
- Amount
- Previous balance
- Total amount
- Status

---

# 23. EXPENSES

Create:

```text
Expenses

Today
Rs. 2,370

[+ Add Expense]
```

Expense form:

```text
Category
Description
Amount
Date
Payment Method
Remarks
```

Each expense gets a unique ID.

---

# 24. RETURNS

Create a Return screen.

Show previously sold items.

Allow:

```text
Select Item
Return Quantity
Reason
Remarks
```

When confirmed:

```text
Sale Return
↓
Stock Adjustment
↓
Stock History
```

All transactions must remain auditable.

---

# 25. REPORTS

Create mobile-friendly reports:

### Sales Report

- Daily
- Weekly
- Monthly

### Expense Report

- Daily
- Weekly
- Monthly

### Stock Report

- Opening
- Prepared
- Sold
- Returned
- Adjustment
- Remaining

### Product Report

- Top products
- Quantity sold
- Revenue

### Profit Summary

```text
Sales
- Discounts
- Expenses
= Net
```

Use backend-calculated values whenever available.

---

# 26. NOTIFICATIONS

Add a notification center.

Notification examples:

```text
New Production Order

Stock Difference Detected

Demand Approved

Special Event Reminder

Price Updated

Order Delivered
```

Use unread badges.

---

# 27. SPECIAL EVENTS

Support admin-created events such as:

- Eid
- Father's Day
- Mother's Day
- Special bakery campaigns

Branch users should receive notifications before the configured event date.

Production notifications can have a separate advance notification period.

---

# 28. SUPPORT CENTER

Create:

```text
Support Center

Search by Unique ID

[ Enter ID ]

[Search]
```

Allow users to report:

- Sale issue
- Stock issue
- Order issue
- Product issue
- Other

Each support request gets a unique ID.

Show:

```text
Issue ID
Status
Created Date
Message
Admin Response
```

---

# 29. PROFILE

Profile screen:

```text
User Name
Role
Branch
Phone
Email
```

Show:

```text
Branch:
Committee Chowk

Role:
Branch User
```

---

# 30. SETTINGS

Include:

- Notifications
- Language
- Theme
- Security
- Logout

Do not expose admin-only settings to branch users.

---

# 31. LOCATION RESTRICTION

If the existing Mountain Bakes business rule requires branch sales to work only within the configured branch radius:

Implement:

```text
Current Location
        ↓
Check Branch Location
        ↓
Within Allowed Radius?
      /       \
    YES        NO
    ↓           ↓
Allow Sale   Block Sale
```

If outside the allowed radius:

```text
Sale Restricted

You are outside the allowed branch location.

Please move inside the authorized branch area.
```

Do not bypass the restriction on the client.

The backend should validate the location-sensitive operation where security matters.

---

# 32. SECURITY

Never trust mobile-client calculations for important business transactions.

Validate on the server:

- User permissions
- Branch permissions
- Stock availability
- Sale quantities
- Prices
- Discounts
- Order status
- Expense permissions
- Location restrictions
- Unique IDs

Prevent branch users from accessing another branch's data.

Use Row Level Security where Supabase is used.

---

# 33. PRICE CONTROL

Product prices are controlled by Admin.

The mobile app should display the current active price.

Historical transactions must retain their original price.

Do NOT recalculate old sales using the new product price.

Use:

```text
Product ID
Price ID
Effective Date
Transaction Price
```

for historical accuracy.

---

# 34. UNIQUE IDs

Every important transaction must have a unique ID.

Examples:

```text
SALE-000001
STK-000001
EXP-000001
DEM-000001
ORD-000001
RET-000001
SUP-000001
```

Display IDs where useful for searching and support.

---

# 35. RESPONSIVE DESIGN

Optimize for:

- Small Android phones
- Large Android phones
- Tablets

Never create a horizontally overflowing screen.

Use:

```text
SafeAreaView
ScrollView
FlatList
SectionList
KeyboardAvoidingView
```

where appropriate.

Tables from the desktop version must become:

- Cards
- Expandable rows
- Horizontal scrolling only when absolutely necessary

---

# 36. PERFORMANCE

The application must remain fast when multiple branches are active simultaneously.

Implement:

- Pagination
- Lazy loading
- Memoized components
- Debounced search
- Query caching
- Optimistic UI where safe
- Server-side aggregation
- Minimal API requests
- Indexed database queries
- FlatList optimization

Do not fetch thousands of records just to calculate a dashboard total on the phone.

Prefer backend aggregation.

---

# 37. OFFLINE / NETWORK HANDLING

When the network is unavailable:

Show:

```text
No Internet Connection

Some information may be unavailable until connection is restored.
```

Do not silently lose sales or stock transactions.

Critical transactions must confirm successful server persistence.

---

# 38. LOADING STATES

Never leave blank screens.

Use:

- Skeleton loaders
- Activity indicators
- Pull-to-refresh

Example:

```text
Loading Sales...
Loading Stock...
Loading Orders...
```

---

# 39. ERROR HANDLING

Create a consistent error system.

Example:

```text
Something went wrong.

Unable to load stock information.

[Retry]
```

Never expose raw Supabase/API errors to normal users.

Log technical details for developers.

---

# 40. EMPTY STATES

Example:

```text
No Sales Yet

Sales for this date will appear here.

[Create Sale]
```

Use useful empty-state actions.

---

# 41. DARK MODE

Support system-based dark mode if the existing app architecture allows it.

Keep Mountain Bakes branding recognizable in both themes.

---

# 42. COMPONENT ARCHITECTURE

Create reusable components:

```text
components/
├── AppHeader
├── BottomTabBar
├── DrawerContent
├── SummaryCard
├── StatCard
├── SectionCard
├── DateFilter
├── ProductCard
├── OrderCard
├── SaleCard
├── StockCard
├── ExpenseCard
├── StatusBadge
├── EmptyState
├── ErrorState
├── LoadingSkeleton
├── PrimaryButton
├── SecondaryButton
├── SearchBar
├── Modal
└── Charts/
```

---

# 43. SERVICES

Keep backend communication separate:

```text
services/
├── authService
├── dashboardService
├── salesService
├── orderService
├── stockService
├── expenseService
├── demandService
├── returnService
├── productService
├── reportService
├── notificationService
└── supportService
```

---

# 44. STATE MANAGEMENT

Use the project's existing state-management solution if one exists.

Otherwise use a lightweight architecture appropriate for React Native.

Do not introduce unnecessary global state.

Separate:

```text
UI State
Server State
Authentication State
Form State
```

---

# 45. FOLDER STRUCTURE

Use a clean structure similar to:

```text
src/
├── components/
├── screens/
│   ├── auth/
│   ├── dashboard/
│   ├── sales/
│   ├── orders/
│   ├── stock/
│   ├── expenses/
│   ├── demands/
│   ├── returns/
│   ├── reports/
│   ├── notifications/
│   ├── support/
│   └── profile/
│
├── navigation/
│   ├── RootNavigator
│   ├── AuthNavigator
│   ├── DrawerNavigator
│   └── BottomTabNavigator
│
├── services/
├── hooks/
├── utils/
├── constants/
├── types/
├── theme/
├── assets/
└── store/
```

---

# 46. THEME SYSTEM

Create centralized:

```text
colors.ts
spacing.ts
typography.ts
radius.ts
shadows.ts
icons.ts
```

Do not hardcode colors throughout individual screens.

Example semantic colors:

```text
background
surface
primary
secondary
text
muted
success
warning
danger
border
```

---

# 47. DASHBOARD SCREEN ORDER

The final mobile dashboard should follow this hierarchy:

```text
Header
↓
Date Filter
↓
Sales / Expenses / Net
↓
Orders
↓
Quick Actions
↓
Budget vs Actual
↓
Stock Overview
↓
Daily Sales Chart
↓
Top Products
↓
Sales vs Expenses
↓
Recent Orders
↓
Recent Stock Activity
```

The user should understand the branch's financial and operational position within a few seconds.

---

# 48. IMPORTANT UI RULE

Do NOT reproduce the uploaded desktop screenshot literally.

Use the screenshot as the visual/business reference.

Desktop:

```text
Many cards + large tables + large charts
```

Mobile:

```text
Vertical cards
+
Horizontal stat scrolling
+
Expandable lists
+
Touch-friendly charts
+
Bottom navigation
+
Drawer
```

The mobile app must feel intentionally designed for mobile.

---

# 49. ACCESS CONTROL

Implement role-based navigation.

Roles may include:

```text
Admin
Branch User
Production User
```

Branch users must not see admin-only screens.

Production users must not see branch financial information unless explicitly authorized.

---

# 50. FINAL AGENT WORKFLOW

Execute autonomously in this order:

### Phase 1 — Inspect

- Inspect repository
- Inspect existing navigation
- Inspect Supabase
- Inspect APIs
- Inspect authentication
- Inspect types
- Inspect current screens

### Phase 2 — Foundation

- Configure React Native navigation
- Configure theme
- Configure reusable components
- Configure API services
- Configure authentication state

### Phase 3 — Dashboard

Build:

1. Header
2. Date filter
3. Summary cards
4. Orders summary
5. Quick actions
6. Budget
7. Stock
8. Sales chart
9. Top products
10. Sales vs expenses

### Phase 4 — Operations

Build:

1. Sales
2. Sale history
3. Orders
4. Branch demand
5. Stock
6. Stock history
7. Returns
8. Expenses

### Phase 5 — Reports

Build all report screens and filters.

### Phase 6 — Support

Build:

- Notifications
- Support Center
- Help Desk
- Profile
- Settings

### Phase 7 — Security

Verify:

- Authentication
- Role permissions
- Branch isolation
- Stock validation
- Price validation
- Server validation
- Location restrictions

### Phase 8 — Testing

Test:

- Android phone
- Large phone
- Tablet
- Slow network
- No network
- Empty database
- Large datasets
- Multiple branches
- Multiple simultaneous users

Fix all:

- TypeScript errors
- Navigation errors
- UI overflow
- API errors
- Loading problems
- Permission issues
- Duplicate transactions

### Phase 9 — Final Polish

Ensure:

- Consistent Mountain Bakes branding
- Smooth animations
- Fast dashboard loading
- Accessible touch targets
- Proper keyboard handling
- Pull-to-refresh
- Error states
- Empty states
- Loading states
- Production-ready Android build

Do not stop at creating mock UI.

Connect every screen to the existing backend/business logic where available.

The final result must be a **fully functional Mountain Bakes Branch mobile application**, not a static prototype.
