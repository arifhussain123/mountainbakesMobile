import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import { MBDateStepper } from '@/common/ui/common/MBDateStepper';
import { renderScreen } from '@/common/test-utils/render';
import { shiftBusinessDate } from '@/common/helpers/businessDay';
import { businessDateStr } from '@/shared/utils/timezone';

/**
 * The stepper's two boundaries are the whole component: forward stops at today
 * because every endpoint refuses a future business date, and the label is the
 * way back to today because stepping away one tap at a time made returning cost
 * the same again.
 *
 * `businessDateStr()` rather than a frozen date: the rollover is 02:00 Karachi
 * and the component reads the real clock, so a hard-coded "today" would fail for
 * two hours a night in the wrong timezone.
 */

const TODAY = businessDateStr();
const YESTERDAY = shiftBusinessDate(TODAY, -1);

describe('MBDateStepper', () => {
  it('steps back a business day', async () => {
    const onChange = jest.fn();
    const screen = await renderScreen(
      <MBDateStepper value={TODAY} onChange={onChange} testID="d" />,
    );
    await fireEvent.press(screen.getByTestId('d-back'));
    expect(onChange).toHaveBeenCalledWith(YESTERDAY);
  });

  /**
   * Tomorrow has not happened, and the server refuses it — so the arrow is
   * disabled rather than left to produce an error nobody can act on.
   */
  it('will not step past today', async () => {
    const onChange = jest.fn();
    const screen = await renderScreen(
      <MBDateStepper value={TODAY} onChange={onChange} testID="d" />,
    );
    await fireEvent.press(screen.getByTestId('d-forward'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('stops the back arrow at minDate', async () => {
    const onChange = jest.fn();
    const screen = await renderScreen(
      <MBDateStepper value={TODAY} onChange={onChange} minDate={TODAY} testID="d" />,
    );
    await fireEvent.press(screen.getByTestId('d-back'));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('MBDateStepper back to today', () => {
  /**
   * On today there is nowhere to go, so the label stays inert and keeps the
   * heading role a reader uses to find what the screen is about.
   */
  it('offers nothing on today, and keeps the label a heading', async () => {
    const screen = await renderScreen(
      <MBDateStepper value={TODAY} onChange={jest.fn()} testID="d" />,
    );
    expect(screen.queryByTestId('d-today')).toBeNull();
    expect(screen.getByRole('header')).toBeTruthy();
  });

  it('returns to today in one tap from any past day', async () => {
    const onChange = jest.fn();
    const screen = await renderScreen(
      <MBDateStepper value={shiftBusinessDate(TODAY, -9)} onChange={onChange} testID="d" />,
    );
    await fireEvent.press(screen.getByTestId('d-today'));
    expect(onChange).toHaveBeenCalledWith(TODAY);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  /**
   * The date has to survive the role change. A button announcing only "Back to
   * today" would lose which day is on screen — the one thing the label exists
   * to say.
   */
  it('keeps the day in the accessible name once the label is a button', async () => {
    const screen = await renderScreen(
      <MBDateStepper value={YESTERDAY} onChange={jest.fn()} testID="d" />,
    );
    expect(screen.getByLabelText('Yesterday. Back to today')).toBeTruthy();
  });

  /**
   * This hands a date straight to `onChange`, so it must never offer a jump the
   * arrows themselves would refuse.
   */
  it('does not offer a jump outside minDate', async () => {
    const screen = await renderScreen(
      <MBDateStepper
        value={shiftBusinessDate(TODAY, -3)}
        onChange={jest.fn()}
        minDate={shiftBusinessDate(TODAY, 5)}
        testID="d"
      />,
    );
    expect(screen.queryByTestId('d-today')).toBeNull();
  });
});
