/**
 * Pure rules for a drawer whose sections fold (Super Admin's twenty items).
 * Kept apart from `DrawerMenu` so "the active section is always open" and the
 * least-recently-used collapse can be tested without rendering.
 *
 * `expanded` is a recency list: the most recently opened section is last.
 */

export interface SectionRow {
  label: string;
  section: string | null;
  active: boolean;
  badgeCount?: number;
  badgeDot?: boolean;
  badgeTone?: 'muted' | 'danger';
}

/** Each section once, in the order the rows first reach it. */
export function sectionOrder(rows: readonly SectionRow[]): string[] {
  const out: string[] = [];
  for (const row of rows) if (row.section !== null && !out.includes(row.section)) out.push(row.section);
  return out;
}

/** The first section (Overview) and the one holding the active screen never fold. */
export function pinnedSections(rows: readonly SectionRow[]): string[] {
  const first = sectionOrder(rows)[0];
  const active = rows.find((r) => r.active)?.section ?? null;
  return [first, active].filter((s, i, all): s is string => !!s && all.indexOf(s) === i);
}

/** What is open on first show: the pinned sections plus whatever this user left open, if those sections still exist. */
export function initialExpanded(rows: readonly SectionRow[], remembered: readonly string[] | null): string[] {
  const existing = sectionOrder(rows);
  const kept = (remembered ?? []).filter((s) => existing.includes(s));
  const pinned = pinnedSections(rows).filter((s) => !kept.includes(s));
  return [...pinned, ...kept];
}

/** The open sections as rendered: the stored list plus any pinned section it lacks (the active screen can change under it). */
export function effectiveExpanded(rows: readonly SectionRow[], expanded: readonly string[]): string[] {
  const pinned = pinnedSections(rows).filter((s) => !expanded.includes(s));
  return [...pinned, ...expanded.filter((s) => sectionOrder(rows).includes(s))];
}

/**
 * Open `section` and make it the most recent. While the menu no longer fits
 * (`fits`), fold the least recently used section that is neither pinned nor
 * the one just opened. If nothing more can fold it is left to scroll.
 */
export function expandSection(
  expanded: readonly string[],
  section: string,
  pinned: readonly string[],
  fits: (expanded: readonly string[]) => boolean,
): string[] {
  const next = [...expanded.filter((s) => s !== section), section];
  while (!fits(next)) {
    const victim = next.find((s) => s !== section && !pinned.includes(s));
    if (!victim) break;
    next.splice(next.indexOf(victim), 1);
  }
  return next;
}

/** Fold `section` — a pinned one stays open. */
export function collapseSection(expanded: readonly string[], section: string, pinned: readonly string[]): string[] {
  if (pinned.includes(section)) return [...expanded];
  return expanded.filter((s) => s !== section);
}

/** "Go to…": rows whose label contains the query, case- and space-insensitive. An empty query keeps every row. */
export function filterRows<T extends SectionRow>(rows: readonly T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...rows];
  return rows.filter((r) => r.label.toLowerCase().includes(q));
}

export interface SectionSummary {
  itemCount: number;
  /** Sum of the section's number badges (orange or muted). */
  badgeTotal: number;
  /** The loudest dot among its items: a red one beats an amber one. */
  dot: 'danger' | 'warning' | null;
}

/** What a folded header shows: "Admin · 4 · ●". */
export function summarizeSection(rows: readonly SectionRow[], section: string): SectionSummary {
  const inSection = rows.filter((r) => r.section === section);
  let badgeTotal = 0;
  let dot: SectionSummary['dot'] = null;
  for (const r of inSection) {
    if (!r.badgeCount) continue;
    if (!r.badgeDot) badgeTotal += r.badgeCount;
    else if (r.badgeTone === 'danger') dot = 'danger';
    else if (dot === null) dot = 'warning';
  }
  return { itemCount: inSection.length, badgeTotal, dot };
}
