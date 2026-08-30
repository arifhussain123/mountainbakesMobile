/**
 * Base64 → bytes, for tests only.
 *
 * The app encodes base64 by hand in `common/printing/escpos.ts`, because Hermes
 * has neither `Buffer` nor `btoa`. A test that decoded with the same code would
 * only be asserting that the encoder agrees with itself, so this reaches for
 * Node's `Buffer` — a genuinely independent implementation, and one that exists
 * in the Jest runtime even though it does not exist in the app's.
 *
 * `Buffer` is declared rather than imported: this project has no `@types/node`
 * (see `scripts/check-fonts.sh`, which is shell for the same reason), and
 * adding it to typecheck one test helper would put Node's globals in scope for
 * the whole of `src/` — where `fs` and `process` are exactly what must not
 * quietly become reachable.
 */
declare const Buffer: {
  from(value: string, encoding: string): { [index: number]: number; length: number };
};

export function decodeBase64(value: string): number[] {
  const buffer = Buffer.from(value, 'base64');
  const out: number[] = [];
  for (let i = 0; i < buffer.length; i++) out.push(buffer[i] as number);
  return out;
}
