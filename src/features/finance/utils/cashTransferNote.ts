/**
 * Reads the amounts a branch typed into a cash transfer's note — "Easypaisa
 * 7150 cash 24050", "Ep+4100cash+18150", "Cash+27950Ep+4950" — so Finance can
 * see when the note and the recorded channels disagree (the classic case: the
 * note says part of it went by Easypaisa, the form recorded it all as cash).
 *
 * A HINT, NEVER DATA. Nothing here changes a transfer or feeds a total; the
 * screen shows what it read next to what was recorded and leaves the judgement
 * to Finance. Notes are free text typed on a phone at closing time, so the
 * reading is deliberately forgiving:
 *
 *   - labels are matched loosely ("Cach", "csh", "easyaisa", "EP") and may be
 *     glued to the numbers around them ("27950Ep+4950");
 *   - a label takes the number after it ("cash 22690") unless the note leads
 *     with numbers ("21800 cash + easypaisa 9…"), in which case it takes the
 *     number before it, falling back to the other side when that one is taken;
 *   - a number the note was cut off in ("easypaisa 9...") is kept but flagged,
 *     so "9" is never presented as a real amount.
 */

export type NoteChannel = 'cash' | 'easypaisa' | 'bank';

export const NOTE_CHANNEL_LABEL: Record<NoteChannel, string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  bank: 'Bank',
};

export const NOTE_CHANNELS: readonly NoteChannel[] = ['cash', 'easypaisa', 'bank'];

export interface NoteAmount {
  channel: NoteChannel;
  /** Rupees as written, commas dropped. */
  amount: number;
  /** The note ends inside this number ("easypaisa 9..."), so the real figure is unknown. */
  truncated: boolean;
}

export interface ParsedNote {
  /** Each labelled amount, in note order. A channel appears at most once (its first amount). */
  amounts: NoteAmount[];
  /** Every channel the note names, with or without an amount beside it. */
  mentions: NoteChannel[];
  /** Sum of the untruncated amounts, or null when there are none. */
  total: number | null;
}

// Letters are excluded on both sides rather than using \b: digits are word
// characters too, so \b finds no boundary in "27950Ep" — the very case to catch.
const LABELS: { channel: NoteChannel; re: RegExp }[] = [
  { channel: 'easypaisa', re: /(?<![a-z])(?:easy\s*p[a-z]*|eas[a-z]*aisa|e\.?\s?p)(?![a-z])/g },
  { channel: 'cash', re: /(?<![a-z])(?:cash|cach|cas|csh|kash)(?![a-z])/g },
  { channel: 'bank', re: /(?<![a-z])(?:bank|bnk|ibft)(?![a-z])/g },
];
const NUMBER = /\d[\d,]*(?:\.\d+)?/g;
// Three dots or an ellipsis, optionally followed by whitespace, at the very end.
const CUT_OFF = /(?:\.{2,}|…)\s*$/;

type Token =
  | { kind: 'label'; channel: NoteChannel; at: number }
  | { kind: 'number'; amount: number; at: number; end: number };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const { channel, re } of LABELS) {
    for (const m of text.matchAll(re)) tokens.push({ kind: 'label', channel, at: m.index ?? 0 });
  }
  for (const m of text.matchAll(NUMBER)) {
    const at = m.index ?? 0;
    const amount = Number(m[0].replace(/,/g, ''));
    if (Number.isFinite(amount)) tokens.push({ kind: 'number', amount, at, end: at + m[0].length });
  }
  return tokens.sort((a, b) => a.at - b.at);
}

export function parseTransferNote(note: string | null | undefined): ParsedNote {
  const text = (note ?? '').toLowerCase();
  const tokens = tokenize(text);
  const mentions = NOTE_CHANNELS.filter((c) => tokens.some((t) => t.kind === 'label' && t.channel === c));

  // A note that leads with a number is written "amount label"; otherwise "label amount".
  const first = tokens[0];
  const numberFirst = first?.kind === 'number';
  const cutOffAt = CUT_OFF.test(text) ? text.replace(CUT_OFF, '').length : -1;
  const claimed = new Set<number>();
  const found = new Map<NoteChannel, NoteAmount>();

  const numberAt = (i: number): (Token & { kind: 'number' }) | null => {
    const t = tokens[i];
    return t && t.kind === 'number' && !claimed.has(i) ? t : null;
  };

  tokens.forEach((t, i) => {
    if (t.kind !== 'label' || found.has(t.channel)) return;
    const before = numberAt(i - 1);
    const after = numberAt(i + 1);
    const [preferred, fallback] = numberFirst ? [before, after] : [after, before];
    const pick = preferred ?? fallback;
    if (!pick) return;
    claimed.add(tokens.indexOf(pick));
    found.set(t.channel, { channel: t.channel, amount: pick.amount, truncated: pick.end === cutOffAt });
  });

  const amounts = [...found.values()].sort(
    (a, b) => tokens.findIndex((t) => t.kind === 'label' && t.channel === a.channel) - tokens.findIndex((t) => t.kind === 'label' && t.channel === b.channel),
  );
  const whole = amounts.filter((a) => !a.truncated);
  return { amounts, mentions, total: whole.length > 0 ? whole.reduce((s, a) => s + a.amount, 0) : null };
}

interface RecordedChannels {
  cashAmount: number;
  easypaisaAmount: number;
  bankAmount: number;
}

const recordedFor = (t: RecordedChannels, c: NoteChannel) =>
  c === 'cash' ? t.cashAmount : c === 'easypaisa' ? t.easypaisaAmount : t.bankAmount;

/**
 * Channels the note names that were recorded as Rs. 0 — "Note mentions
 * Easypaisa". Naming is enough, with or without an amount: "rest by easypaisa"
 * on an all-cash deposit is exactly the slip worth a second look.
 */
export function noteMentionsUnrecorded(transfer: RecordedChannels, parsed: ParsedNote): NoteChannel[] {
  return parsed.mentions.filter((c) => recordedFor(transfer, c) === 0);
}

/**
 * Channels whose amount in the note differs from the recorded one by more than
 * a rupee. Truncated amounts are skipped — the note does not say what they are.
 */
export function noteAmountMismatches(transfer: RecordedChannels, parsed: ParsedNote): NoteChannel[] {
  return parsed.amounts.filter((a) => !a.truncated && Math.abs(a.amount - recordedFor(transfer, a.channel)) > 1).map((a) => a.channel);
}
