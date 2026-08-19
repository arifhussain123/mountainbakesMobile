import React from 'react';
import { SplashScreen } from '@/screens/SplashScreen';
import { renderScreen } from '@/test-utils/render';

/**
 * The splash is the first thing anyone sees and the last thing anyone tests, so
 * these cover the parts that are easy to break silently: the brand copy, the
 * logo, and the single accessible announcement.
 */
describe('SplashScreen', () => {
  it.each(['light', 'dark'] as const)('shows the brand on %s', async scheme => {
    const screen = await renderScreen(<SplashScreen />, { scheme });
    expect(screen.getByText('Mountain Bakes')).toBeTruthy();
    expect(screen.getByText('Fresh • Quality • Every Day')).toBeTruthy();
  });

  /**
   * The logo is the official asset, resolved per scheme. If this ever renders
   * `undefined` the screen still "works" — it just silently loses the mark.
   */
  it.each(['light', 'dark'] as const)('renders the logo on %s', async scheme => {
    const screen = await renderScreen(<SplashScreen />, { scheme });
    const tree = JSON.stringify(screen.toJSON());
    expect(tree).toContain('Image');
  });

  /**
   * One announcement for the whole screen. Three separate nodes would have a
   * reader say the brand name twice before saying what is happening.
   */
  it('announces itself once, and says that it is starting', async () => {
    const screen = await renderScreen(<SplashScreen />);
    expect(
      screen.getByLabelText('Mountain Bakes. Fresh • Quality • Every Day. Starting.'),
    ).toBeTruthy();
  });
});
