/** productionApp.md Step 1. `cardPadding` spec range is 14–16, kept as both ends rather than one picked value. */
export const spacing = {
  screenHorizontal: 18,
  cardPadding: { sm: 14, lg: 16 },
  gap: { xs: 6, sm: 8, md: 10, lg: 12, xl: 14 },
} as const;
