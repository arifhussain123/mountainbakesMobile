/**
 * @format
 */
import { noteAmountMismatches, noteMentionsUnrecorded, parseTransferNote } from '@/features/finance/utils/cashTransferNote';

const amounts = (note: string) =>
  Object.fromEntries(parseTransferNote(note).amounts.map((a) => [a.channel, a.truncated ? `${a.amount}…` : a.amount]));

describe('parseTransferNote — the formats branches actually type', () => {
  it.each([
    ['Easypaisa 7150 cash 24050', { easypaisa: 7150, cash: 24050 }],
    ['Easypaisa 3800 cash 25900', { easypaisa: 3800, cash: 25900 }],
    ['Ep+4100cash+18150', { easypaisa: 4100, cash: 18150 }],
    ['Cash+27950Ep+4950', { cash: 27950, easypaisa: 4950 }],
    ['cash 22690 easyaisa 2950', { cash: 22690, easypaisa: 2950 }],
    ['Ep+1000 cash +35500', { easypaisa: 1000, cash: 35500 }],
    ['Cach+23730+Ep+6900', { cash: 23730, easypaisa: 6900 }],
    ['cash 1,250 bank 3,000', { cash: 1250, bank: 3000 }],
  ])('%s', (note, expected) => {
    expect(amounts(note)).toEqual(expected);
  });

  it('a cut-off note keeps the leading "amount label" pairing and flags the unfinished number', () => {
    const parsed = parseTransferNote('21800 cash + easypaisa 9...');
    expect(amounts('21800 cash + easypaisa 9...')).toEqual({ cash: 21800, easypaisa: '9…' });
    // A truncated figure is never added in.
    expect(parsed.total).toBe(21800);
  });

  it('totals the labelled amounts', () => {
    expect(parseTransferNote('Easypaisa 7150 cash 24050').total).toBe(31200);
  });

  it('a note without labelled amounts reads as nothing', () => {
    expect(parseTransferNote('tomorrow for car driver')).toEqual({ amounts: [], mentions: [], total: null });
    expect(parseTransferNote(null).amounts).toEqual([]);
    expect(parseTransferNote('').total).toBeNull();
  });

  it('does not read a channel out of an ordinary word', () => {
    expect(parseTransferNote('deposit 5000 in case of delay').mentions).toEqual([]);
  });

  it('names a channel even with no amount beside it', () => {
    expect(parseTransferNote('rest by easypaisa').mentions).toEqual(['easypaisa']);
  });
});

describe('checking the note against the recorded channels', () => {
  const allCash = { cashAmount: 23720, easypaisaAmount: 0, bankAmount: 0 };

  it('flags a channel the note names that was recorded as Rs. 0', () => {
    expect(noteMentionsUnrecorded(allCash, parseTransferNote('Easypaisa 7150 cash 24050'))).toEqual(['easypaisa']);
  });

  it('flags nothing when the note and the record agree', () => {
    const split = { cashAmount: 24050, easypaisaAmount: 7150, bankAmount: 0 };
    const parsed = parseTransferNote('Easypaisa 7150 cash 24050');
    expect(noteMentionsUnrecorded(split, parsed)).toEqual([]);
    expect(noteAmountMismatches(split, parsed)).toEqual([]);
  });

  it('lists the channels whose amount differs, skipping a cut-off one', () => {
    expect(noteAmountMismatches(allCash, parseTransferNote('Easypaisa 7150 cash 24050'))).toEqual(['easypaisa', 'cash']);
    expect(noteAmountMismatches({ cashAmount: 21800, easypaisaAmount: 0, bankAmount: 0 }, parseTransferNote('21800 cash + easypaisa 9...'))).toEqual([]);
  });
});
