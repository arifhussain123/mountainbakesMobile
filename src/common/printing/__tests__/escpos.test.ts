import { decodeBase64 } from '@/common/test-utils/bytes';

import { cut, encode, init, preview, renderBlocks, toBase64, wrap } from '../escpos';
import type { Block } from '../escpos';

/**
 * The command layer, asserted as bytes where the bytes are the contract and as
 * text where the layout is.
 *
 * A printer is the one output in this app nobody can look at from a test
 * runner, so these are deliberately close to the wire: a wrong `GS !` argument
 * does not throw, it prints a receipt in the wrong size, and the only place
 * that can be caught before a shop sees it is here.
 */

describe('encode', () => {
  it('passes printable ASCII through unchanged', () => {
    expect(encode('Rs. 1,250.00')).toEqual([...'Rs. 1,250.00'].map(c => c.charCodeAt(0)));
  });

  /**
   * The case this function exists for. Every cart line in the app is built as
   * `qty × price` and every slip heading carries an em dash, so a receipt that
   * did not transliterate would print box-drawing characters through the middle
   * of its own arithmetic.
   */
  it('transliterates the punctuation the app actually emits', () => {
    expect(bytesToAscii(encode('2 × Rs. 5 — less ₨1'))).toBe('2 x Rs. 5 - less Rs.1');
  });

  it('turns anything else non-Latin into a question mark rather than dropping it', () => {
    // Dropping would silently shorten a product name and leave nobody a reason
    // to look; a `?` is one character wide and visible on the paper.
    expect(bytesToAscii(encode('کیک'))).toBe('???');
    expect(encode('کیک')).toHaveLength(3);
  });

  it('never emits a newline of its own', () => {
    // A literal 0x0A inside a block would advance the roll without the column
    // maths knowing, so the next padded row would be measured from the wrong
    // place. Line breaks are the caller's, one block at a time.
    expect(encode('a\nb')).not.toContain(0x0a);
  });
});

describe('wrap', () => {
  it('breaks on spaces at the width', () => {
    expect(wrap('Chocolate Truffle Celebration Cake', 20)).toEqual([
      'Chocolate Truffle',
      'Celebration Cake',
    ]);
  });

  it('hard-splits a word longer than the line', () => {
    // Left to the printer this wraps wherever the buffer happens to fill, which
    // is not repeatable between models.
    expect(wrap('ABCDEFGHIJ', 4)).toEqual(['ABCD', 'EFGH', 'IJ']);
  });

  it('keeps every line inside the width', () => {
    const lines = wrap('one two three four five six seven eight nine ten', 12);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(12);
  });

  /**
   * A regression, and the reason the fits-already branch exists.
   *
   * Every totals row reaches this function already padded — `amountRow` builds
   * a label, a run of spaces and an amount flush right. The re-flow below
   * splits on `/\s+/` and rejoins with single spaces, so without the early
   * return it collapsed that run and the whole money column printed
   * left-ragged. It looked correct in every block-level assertion, because the
   * damage happened one layer down.
   */
  it('leaves a line that already fits exactly as it was', () => {
    const padded = `Subtotal${' '.repeat(20)}Rs. 3,040`;
    expect(wrap(padded, 48)).toEqual([padded]);
    expect(wrap('  indented', 48)).toEqual(['  indented']);
  });
});

describe('preview', () => {
  it('draws a rule the full width of the profile', () => {
    expect(preview([{ kind: 'rule' }], 48)).toEqual(['-'.repeat(48)]);
  });

  it('centres and right-aligns by padding to the same width', () => {
    expect(preview([{ kind: 'text', text: 'ab', align: 'center' }], 6)).toEqual(['  ab']);
    expect(preview([{ kind: 'text', text: 'ab', align: 'right' }], 6)).toEqual(['    ab']);
  });

  /**
   * Double width halves the line, and forgetting that is how a heading that
   * looked fine in a test wraps onto two lines on the roll.
   */
  it('halves the usable width for a double-width block', () => {
    expect(preview([{ kind: 'text', text: 'ABCDEFGHIJKL', style: { doubleWidth: true } }], 12)).toEqual([
      'ABCDEF',
      'GHIJKL',
    ]);
  });

  it('does not halve it for a double-height block', () => {
    expect(preview([{ kind: 'text', text: 'ABCDEFGHIJKL', style: { doubleHeight: true } }], 12)).toEqual([
      'ABCDEFGHIJKL',
    ]);
  });
});

describe('renderBlocks', () => {
  const one: Block[] = [{ kind: 'text', text: 'hi' }];

  it('opens with a reset so a receipt cannot inherit the last one', () => {
    expect(renderBlocks(one, 48).slice(0, init().length)).toEqual(init());
  });

  /**
   * And closes with one, which matters just as much: a job that ended in
   * double-width bold would otherwise leave the printer that way for whatever
   * is sent next, including by another app.
   */
  it('closes with a cut and a reset', () => {
    const bytes = renderBlocks(one, 48);
    expect(bytes.slice(-init().length)).toEqual(init());
    const tail = bytes.slice(-(init().length + cut().length), -init().length);
    expect(tail).toEqual(cut());
  });

  it('feeds clear of the head before cutting', () => {
    // The cutter sits past the print head; `GS V 1` with no feed slices through
    // the last lines of the receipt.
    const c = cut();
    expect(c.slice(-3)).toEqual([0x1d, 0x56, 0x01]);
    expect(c.slice(0, 3)).toEqual([0x1b, 0x64, 3]);
  });

  it('emits one line feed per wrapped line', () => {
    const bytes = renderBlocks([{ kind: 'text', text: 'aaa bbb ccc' }], 4);
    expect(bytes.filter(b => b === 0x0a)).toHaveLength(3);
  });

  it('sets the size byte from the style', () => {
    // GS ! packs width high, height low: 0x11 is both, 0x00 is neither.
    expect(sizeArgIn(renderBlocks([{ kind: 'text', text: 'x' }], 48))).toBe(0x00);
    expect(
      sizeArgIn(renderBlocks([{ kind: 'text', text: 'x', style: { doubleWidth: true, doubleHeight: true } }], 48)),
    ).toBe(0x11);
  });
});

describe('toBase64', () => {
  /**
   * Written by hand because Hermes has no `Buffer` and no `btoa`, which makes
   * this the one place a wrong receipt would be a wrong *encoding* rather than
   * a wrong layout. The expectations are the standard RFC 4648 vectors.
   */
  it.each([
    ['', ''],
    ['f', 'Zg=='],
    ['fo', 'Zm8='],
    ['foo', 'Zm9v'],
    ['foob', 'Zm9vYg=='],
    ['fooba', 'Zm9vYmE='],
    ['foobar', 'Zm9vYmFy'],
  ])('encodes %p as %p', (input, expected) => {
    expect(toBase64([...input].map(c => c.charCodeAt(0)))).toBe(expected);
  });

  it('round-trips the high bytes an ESC/POS stream is full of', () => {
    const bytes = [0x1b, 0x40, 0x1d, 0x21, 0x11, 0xff, 0x00, 0x80];
    // Decoded with the runtime's own base64, so this pins the encoder against
    // something other than itself.
    const decoded = decodeBase64(toBase64(bytes));
    expect(decoded).toEqual(bytes);
  });
});

function bytesToAscii(bytes: number[]): string {
  return bytes.map(b => String.fromCharCode(b)).join('');
}

/**
 * The argument of the FIRST `GS ! n` in a byte stream — the one the block set.
 *
 * Not the last: every receipt ends with a reset to size 0 so the printer is not
 * left in double width for the next job, and reading backwards would only ever
 * find that.
 */
function sizeArgIn(bytes: number[]): number {
  for (let i = 0; i < bytes.length - 2; i++) {
    if (bytes[i] === 0x1d && bytes[i + 1] === 0x21) return bytes[i + 2] as number;
  }
  throw new Error('no GS ! in the stream');
}
