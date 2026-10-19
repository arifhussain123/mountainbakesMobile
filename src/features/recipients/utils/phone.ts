/**
 * Pakistani mobile numbers for the closing-summary recipients.
 *
 * The server stores E.164 (`+923001234567`) and rejects a local `03…` number
 * outright rather than guess the country, so the form normalises here: it
 * accepts how people actually type a number and sends only the E.164 form.
 * Landlines are refused — neither WhatsApp nor an SMS summary reaches one.
 */

export type PhoneResult = { ok: true; e164: string } | { ok: false; error: string };

/** A Pakistani mobile's national number: 10 digits starting with 3 (3XX XXXXXXX). */
const PK_MOBILE_NATIONAL = /^3\d{9}$/;

export function normalisePkMobile(input: string): PhoneResult {
  const raw = input.trim();
  if (!raw) return { ok: false, error: 'Enter a mobile number.' };
  if (/[^\d\s()+-]/.test(raw)) return { ok: false, error: 'Use digits only, e.g. 0300 1234567.' };

  let digits = raw.replace(/[\s()-]/g, '');
  const hadPlus = digits.startsWith('+');
  if (hadPlus) digits = digits.slice(1);
  if (digits.includes('+')) return { ok: false, error: 'Use digits only, e.g. 0300 1234567.' };

  let national: string;
  if (hadPlus || digits.startsWith('0092')) {
    const intl = digits.startsWith('00') ? digits.slice(2) : digits;
    if (!intl.startsWith('92')) return { ok: false, error: 'Only Pakistani mobile numbers (+92) are supported.' };
    national = intl.slice(2);
  } else if (digits.startsWith('92') && digits.length === 12) {
    national = digits.slice(2);
  } else if (digits.startsWith('0')) {
    national = digits.slice(1);
  } else {
    national = digits;
  }

  if (national.startsWith('0')) national = national.slice(1); // "+92 0300…" — a common slip
  if (!national.startsWith('3')) return { ok: false, error: 'This looks like a landline. Use a mobile number (03XX XXXXXXX).' };
  if (!PK_MOBILE_NATIONAL.test(national)) {
    return { ok: false, error: `A mobile number has 11 digits (03XX XXXXXXX) — this has ${national.length + 1}.` };
  }
  return { ok: true, e164: `+92${national}` };
}

/** `+923431102663` → `+92 343 1102663`; anything else is returned as stored. */
export function formatPkMobile(e164: string): string {
  const m = /^\+92(3\d{2})(\d{7})$/.exec(e164);
  return m ? `+92 ${m[1]} ${m[2]}` : e164;
}

/** Spoken digit by digit groups, so a screen reader doesn't read "nine hundred twenty-three billion". */
export function spokenPhone(e164: string): string {
  return formatPkMobile(e164).replace(/\+/g, 'plus ').split('').join(' ').replace(/\s+/g, ' ');
}
