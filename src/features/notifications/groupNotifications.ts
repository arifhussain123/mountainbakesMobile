export interface NotificationGroup<T> {
  label: 'Today' | 'Yesterday' | 'Earlier';
  items: T[];
}

/** Calendar-day grouping (device local time) — not the bakery's 2am business-date rule, which is a sales concept, not a notification-feed one. `now` is injectable for tests. */
export function groupNotificationsByDay<T extends { createdAt: string }>(items: T[], now: Date = new Date()): NotificationGroup<T>[] {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(now);
  const yesterday = today - 24 * 60 * 60 * 1000;

  const buckets: Record<NotificationGroup<T>['label'], T[]> = { Today: [], Yesterday: [], Earlier: [] };
  for (const item of items) {
    const created = new Date(item.createdAt);
    const day = Number.isNaN(created.getTime()) ? today : startOfDay(created);
    if (day === today) buckets.Today.push(item);
    else if (day === yesterday) buckets.Yesterday.push(item);
    else buckets.Earlier.push(item);
  }

  return (['Today', 'Yesterday', 'Earlier'] as const).map((label) => ({ label, items: buckets[label] })).filter((g) => g.items.length > 0);
}
