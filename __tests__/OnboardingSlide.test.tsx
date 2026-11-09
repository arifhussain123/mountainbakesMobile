/**
 * @format
 */
import {
  act,
  create,
  type ReactTestRenderer,
  type ReactTestInstance,
} from 'react-test-renderer';
import { OnboardingSlide } from '@/features/auth/components/OnboardingSlide';
import {
  ONBOARDING_PAGES,
  type OnboardingPage,
} from '@/features/auth/onboardingContent';

function render(page: OnboardingPage): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(
      <OnboardingSlide
        page={page}
        width={375}
        active
        reduceMotion
        testID="slide"
      />,
    );
  });
  return renderer!;
}

/** Host nodes only — `findAllByProps` would also return the composite wrappers around them. */
function hostNodes(
  root: ReactTestInstance,
  testID: string,
): ReactTestInstance[] {
  return root.findAll(
    node => typeof node.type === 'string' && node.props.testID === testID,
  );
}

function allText(node: unknown): string[] {
  if (node == null || typeof node === 'boolean') return [];
  if (typeof node === 'string' || typeof node === 'number')
    return [String(node)];
  if (Array.isArray(node)) return node.flatMap(allText);
  const children = (node as { children?: unknown }).children;
  return allText(children);
}

const [pageOne, , pageThree] = ONBOARDING_PAGES as [
  OnboardingPage,
  OnboardingPage,
  OnboardingPage,
];

describe('OnboardingSlide', () => {
  it('renders page 1 with the headline read as one sentence, the body and the feature strip', () => {
    const renderer = render(pageOne);
    const text = allText(renderer.toJSON()).join(' ');

    const [headline] = hostNodes(renderer.root, 'slide-headline');
    expect(headline?.props.accessibilityRole).toBe('header');
    expect(headline?.props.accessibilityLabel).toBe(
      'Fresh from the oven daily',
    );
    expect(text).toContain('Fresh');
    expect(text).toContain('from the');
    expect(text).toContain('oven daily');
    expect(text).toContain(pageOne.body);

    expect(hostNodes(renderer.root, 'slide-features')).toHaveLength(1);
    for (const feature of pageOne.features!)
      expect(text).toContain(feature.label);
  });

  it('renders page 3 without a feature strip, with the 2 AM copy and a larger logo', () => {
    const renderer = render(pageThree);
    const text = allText(renderer.toJSON()).join(' ');

    const [headline] = hostNodes(renderer.root, 'slide-headline');
    expect(headline?.props.accessibilityLabel).toBe('The day ends at 2 AM.');
    expect(text).toContain('The day');
    expect(text).toContain('ends at');
    expect(text).toContain('2 AM');
    expect(text).toContain('A late shift is never split across two days.');

    expect(hostNodes(renderer.root, 'slide-features')).toHaveLength(0);
    expect(pageThree.features).toBeUndefined();
    expect(pageThree.logoSize).toBeGreaterThan(pageOne.logoSize);
    expect(pageThree.cta).toBe('Get Started');
  });

  it('has exactly three pages, the last without a Skip-worthy feature strip and page 2 still a placeholder', () => {
    expect(ONBOARDING_PAGES).toHaveLength(3);
    expect(ONBOARDING_PAGES[1]?.placeholder).toBe(true);
    expect(ONBOARDING_PAGES[2]?.placeholder).toBeUndefined();
  });
});
