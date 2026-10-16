/**
 * @format
 */
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { OnboardingSlide } from '@/features/auth/screens/OnboardingScreen/components/OnboardingSlide';
import { ONBOARDING_SLIDES } from '@/features/auth/screens/OnboardingScreen/onboardingContent';
import { ThemeProvider } from '@/shared/theme';

describe('OnboardingSlide', () => {
  it('renders the headline as one accessible sentence and every feature label', () => {
    const slide = ONBOARDING_SLIDES[0];
    // React 19's test renderer no longer flushes effects synchronously inside
    // a plain `.create()` call — wrap it in `act()` so the render (and this
    // being the first component-render test in the repo) settles before any
    // assertion runs, instead of a scheduled update landing after Jest tears
    // the test down. `OnboardingSlide` reads `useAppTheme()`, which now needs
    // a `ThemeProvider` ancestor (it threw with no context before this).
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <OnboardingSlide content={slide} width={375} active={false} />
        </ThemeProvider>,
      );
    });

    const sentence = `${slide.headline.map((line) => line.text).join(' ')}.`;
    const headline = tree.root.findByProps({ accessibilityLabel: sentence });
    expect(headline).toBeTruthy();

    for (const feature of slide.features ?? []) {
      const match = tree.root.findAll((node) => node.type === Text && node.props.children === feature.label);
      expect(match.length).toBeGreaterThan(0);
    }
  });
});
