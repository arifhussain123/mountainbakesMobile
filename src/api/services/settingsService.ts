import type { UpdateSettingsInput } from '@/shared/schemas/settings.schemas';
import { api } from '../client';

/**
 * Business settings — the write side. The read is `catalogApi.getSettings`.
 *
 * `GET /api/settings` is authenticated only, because every screen needs the
 * currency symbol and the GST rate to render money at all. `PUT` is
 * `requireRole('super_admin')`: these values decide what every branch charges.
 *
 * ---------------------------------------------------------------------------
 * A partial update is the whole contract
 * ---------------------------------------------------------------------------
 * The route writes **only the fields present in the body**, mapping each through
 * `FIELD_TO_COLUMN` onto a singleton row (`id` is a boolean primary key pinned
 * by a check constraint, so the upsert creates it once and merges thereafter).
 *
 * That makes sending a whole settings object actively dangerous: two admins
 * editing different sections would each write the other's stale values back.
 * `updateSettings` therefore takes a patch and the screens send only what
 * changed — every field on `UpdateSettingsInput` is optional for this reason,
 * not as a convenience.
 *
 * `updated_at` is maintained by the `settings_touch` trigger; nothing here sets
 * it.
 */

export async function updateSettings(patch: UpdateSettingsInput): Promise<void> {
  await api.put<{ success: boolean }>('/api/settings', patch);
}
