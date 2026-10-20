import type { LoginAttemptReason, SecuritySession, SessionLocationSource, SessionState } from '@/api';
import type { PillTone } from '../../components/AdminDetail';

/**
 * How a session reads on the Security screen — the web's `sessionFormat.tsx`,
 * word for word, so the history, the active roster and the detail sheet never
 * describe one session two ways.
 */

export const STATE_LABELS: Record<SessionState, string> = {
  active: 'Active',
  idle: 'Idle',
  ended: 'Signed out',
  expired: 'Tab closed',
  revoked: 'Signed out by admin',
};

/** Only `revoked` is red; a closed tab is the ordinary end of a session, so amber. */
export const STATE_TONES: Record<SessionState, PillTone> = {
  active: 'success',
  idle: 'warning',
  ended: 'neutral',
  expired: 'warning',
  revoked: 'danger',
};

export const LOCATION_SOURCE_LABELS: Record<SessionLocationSource, string> = {
  IP: 'IP address (approximate)',
  DEVICE_GPS: 'Device location (precise)',
  UNKNOWN: 'Not resolved',
};

export const LOGIN_ATTEMPT_REASON_LABELS: Record<LoginAttemptReason, string> = {
  invalid_credentials: 'Invalid email or password',
  account_disabled: 'Account disabled',
  email_not_confirmed: 'Email not confirmed',
  rate_limited: 'Too many attempts',
  no_role: 'No role assigned',
  invalid_session: 'Invalid session',
  expired_token: 'Expired token',
  unknown: 'Unknown',
};

export const EMAIL_NOT_RECORDED = 'Not recorded';

/** '3h 42m', '18m', '45s', '2d 4h'; '—' when not a finite, non-negative figure. */
export function formatSessionDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const days = Math.floor(totalSeconds / 86400);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${minutes}m`;
}

/** 'Manzoor Colony, Karachi, Pakistan' … or 'Location unavailable'. */
export function formatLocation(s: Pick<SecuritySession, 'area' | 'city' | 'country'>): string {
  const parts = [s.area, s.city, s.country].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Location unavailable';
}

const kindOf = (deviceType: string | null | undefined) =>
  deviceType && deviceType !== 'unknown' ? deviceType.charAt(0).toUpperCase() + deviceType.slice(1) : null;

/** 'Chrome 140'. */
export function formatBrowser(s: Pick<SecuritySession, 'browser' | 'browserVersion'>): string {
  return [s.browser, s.browserVersion].filter(Boolean).join(' ') || '—';
}

/** 'Linux Desktop'. */
export function formatPlatform(s: Pick<SecuritySession, 'os' | 'deviceType'>): string {
  return [s.os, kindOf(s.deviceType)].filter(Boolean).join(' ') || '—';
}

/** 'Android 14'. */
export function formatOs(s: Pick<SecuritySession, 'os' | 'osVersion'>): string {
  return [s.os, s.osVersion].filter(Boolean).join(' ') || '—';
}

/** 'Samsung SM-A155F (Mobile)', 'Desktop', '—'. */
export function formatDeviceKind(s: Pick<SecuritySession, 'deviceType' | 'deviceName'>): string {
  const kind = kindOf(s.deviceType);
  if (s.deviceName && kind) return `${s.deviceName} (${kind})`;
  return s.deviceName || kind || '—';
}

/** Role chip text: every `_` read as a space, capitalised. */
export function roleChip(role: string | null | undefined): string {
  if (!role) return '—';
  return role
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}
