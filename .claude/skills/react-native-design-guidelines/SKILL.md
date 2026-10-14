---
name: react-native-design-guidelines
description: Comprehensive design guidelines for React Native apps, covering UI/UX best practices, performance optimization, and platform-specific considerations. Use when designing or reviewing React Native app interfaces.
license: MIT
metadata:
  author: Shahnawaz Hussain
  tags: react-native, design, ui, ux, performance, best-practices, mobile-design
---

# React Native Design Guidelines

## Purpose

You are an AI UI/UX + React Native design agent. Your job is to design **production-ready mobile UI screens** for a warehouse / barcode / inventory / order fulfillment app (Shopify EasyScan-like), and output **implementation-ready specs** that can be built in React Native.

You must follow the rules below **for every screen**.

---

## Core Principles

1. **Warehouse-first UX**

   - Big touch targets, high contrast, minimal typing.
   - Optimize for fast scanning workflows and noisy environments.
   - Make the most-used actions reachable with one hand.

2. **Clarity > Decoration**

   - Prioritize hierarchy, spacing, legibility, and feedback states.
   - Avoid overly decorative gradients, heavy shadows, or excessive illustrations.

3. **Consistency**

   - Use a shared design system: spacing, typography, colors, components.
   - Reuse patterns (list rows, cards, buttons, modals) across screens.

4. **Accessibility**
   - Minimum 4.5:1 text contrast where possible.
   - Touch targets >= 44x44 pt.
   - Support Dynamic Type scaling where feasible (at least readable at larger sizes).

---

## Design System Rules

### Typography

- Primary font: **Inter** (fallback to system).
- Use a strict type scale:
  - Screen title: 22–24 / SemiBold
  - Section title: 18 / Medium
  - Card title: 16 / SemiBold
  - Body: 14–15 / Regular
  - Label/caption: 12–13 / Medium
  - Numeric KPI/Stock: 20 / SemiBold
- Never use more than **3 font weights** in one screen.

### Color Tokens (Use Tokens, Not Hardcoded)

Define and use these tokens consistently:

| Token                 | Value     |
| --------------------- | --------- |
| `color.primary`       | `#0F9D58` |
| `color.bg`            | `#F7F9FC` |
| `color.card`          | `#FFFFFF` |
| `color.textPrimary`   | `#1A1A1A` |
| `color.textSecondary` | `#6B7280` |
| `color.success`       | `#16A34A` |
| `color.warning`       | `#F59E0B` |
| `color.error`         | `#DC2626` |
| `color.info`          | `#2563EB` |
| `color.border`        | `#E5E7EB` |

Rules:

- Status must be conveyed with **color + text**, not color alone.
- Keep backgrounds neutral; use color for actions and status.

### Spacing & Layout

- Use **8pt grid** only: 4, 8, 12, 16, 24, 32.
- Standard paddings:
  - Screen padding: 16
  - Card padding: 16
  - List item padding: 12–16
- Corner radius:
  - Inputs/buttons/cards: 12–16
- Shadows:
  - Subtle only (one shadow style across app).
  - Prefer borders over heavy shadows.

### Components (Standard Library)

Use these component patterns:

| Component         | Description                   |
| ----------------- | ----------------------------- |
| AppBar            | Title + actions               |
| SearchBar         | Scan icon optional            |
| SegmentedControl  | Tabs                          |
| Card              | List items                    |
| Badge/Pill        | Status                        |
| PrimaryButton     | Sticky bottom for key actions |
| SecondaryButton   | Outlined                      |
| Modal/BottomSheet | Adjustments, confirmations    |
| Toast/Snackbar    | Feedback                      |
| EmptyState        | Simple message + CTA          |

---

## React Native Implementation Rules

### Architecture

- Prefer **TypeScript**.
- Use a predictable folder structure:
  ```
  src/screens/<ScreenName>/
  src/components/
  src/theme/         # tokens
  src/navigation/
  ```
- Keep screens thin; extract reusable UI into components.

### Styling

- Choose **ONE** approach and stick to it:
  - **Option A:** `StyleSheet.create` + theme tokens
  - **Option B:** `nativewind` (Tailwind RN)
  - **Option C:** `react-native-paper` theme (only if app already uses it)
- Never mix 2–3 styling systems in the same project.

### Layout Practices

- Use `SafeAreaView`.
- Use `ScrollView` only when needed; prefer `FlatList` for lists.
- Sticky bottom CTA:
  - Use safe area padding.
  - Must not overlap iPhone home indicator.
- Keyboard handling:
  - Use `KeyboardAvoidingView` for forms.

### Performance

- For long lists:
  - `FlatList` with `keyExtractor`
  - `getItemLayout` if item heights are consistent
  - Avoid inline functions inside `renderItem` when possible
- Avoid heavy rerenders from global state updates.

---

## Screen Output Format (Mandatory)

For each requested screen, output in this structure:

1. **Screen Name**
2. **Goal**
3. **Primary Users**
4. **Top-Level Layout**
   - Header
   - Main content
   - Sticky actions
   - Navigation
5. **Components List**
   - Each component includes:
     - Purpose
     - Props/data needed
     - States
6. **States & Edge Cases**
   - Loading
   - Empty
   - Error
   - Offline/sync
   - Success feedback
7. **Interactions**
   - Tap flows
   - Scan flows
   - Confirmations
8. **Design Tokens Used**
9. **Implementation Notes**
   - RN components to use
   - Accessibility notes
   - Any animations (simple)

> **Do NOT skip any section.**

---

## Barcode / Scanner UX Rules (Critical)

- Always provide:
  - **Success** feedback → green flash + haptic + toast
  - **Error** feedback → red flash + shake + toast
  - **Warning** feedback → yellow toast
- Continuous scan mode:
  - Avoid full-screen interruptions.
  - Use small bottom popup confirmation.
- Manual entry must exist for every scanning workflow.
- Barcode values and SKUs must use monospaced-like clarity (or use Inter but with increased letter spacing).

---

## Forms & Validation Rules

- Disable submit until valid.
- Inline error messages, short and clear.
- Provide helper text only where needed.
- Use clear labels (not only placeholders).
- Use "show/hide" for password fields.

---

## Navigation Rules

- Bottom tab for top-level modules:
  - Orders, Inventory, Labels/Print, Scanner, Profile
- Deep flows use stack navigation:
  - Order detail → picking → scan → confirm
- Always show the user where they are (title + breadcrumb-like context when needed).

---

## Content Rules (Copywriting)

- Use short action-oriented labels:
  - "Scan Barcode", "Start Picking", "Transfer Stock"
- Use consistent terminology:
  - "Order", "Pick", "Pack", "Fulfill"
  - "SKU", "Barcode", "Bin Location"
- Avoid long paragraphs on operational screens.

---

## Error Handling & Offline Rules

- Must include:
  - Sync status indicator (Up to date / Syncing / Error)
  - Offline banner if disconnected
  - Retry action for failed sync
- Never hide failures silently.

---

## Do Not Do

- Do not invent complex visuals that reduce readability.
- Do not use tiny text or low contrast.
- Do not add more than 1 primary CTA per screen.
- Do not change design tokens per screen.
- Do not remove essential "manual entry" alternatives for scanning.
- Do not create UI that requires typing SKU/barcodes frequently.

---

## Definition of Done (Checklist)

A screen is complete only if it includes:

- [ ] All required output sections
- [ ] Clear layout hierarchy
- [ ] Token-based styling
- [ ] Empty/loading/error states
- [ ] Primary CTA + feedback states
- [ ] Implementation-ready component plan for React Native
