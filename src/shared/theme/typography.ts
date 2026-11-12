/**
 * System font for Phase 1 (CLAUDE.md allows this — a custom font can be added
 * later without restructuring, since every screen reads these tokens rather than
 * hardcoding a family/size/weight).
 */
export const typography = {
  // 2026 redesign (Urbanist): SemiBold display with tight tracking, lighter overall.
  screenTitle: { fontSize: 26, fontWeight: '600' as const, lineHeight: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  cardTitle: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 21 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  kpi: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
} as const;
