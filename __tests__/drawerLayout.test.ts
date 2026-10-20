/**
 * @format
 */
import {
  BRANCH_STRIP_HEIGHT,
  FOOTER_HEIGHT,
  HEADER_HEIGHT,
  ROW_FONT_MAX,
  ROW_FONT_MIN,
  ROW_ICON_MAX,
  ROW_ICON_MIN,
  ROW_MAX_HEIGHT,
  ROW_MIN_HEIGHT,
  SECTION_LABEL_HEIGHT,
  clamp,
  computeAvailableListHeight,
  computeDrawerRowMetrics,
  countSections,
  getDrawerWidth,
} from '@/navigation/components/drawerLayout';
import { BRANCH_NAV_ITEMS, PRODUCTION_NAV_ITEMS } from '@/navigation/navItems';

// Window heights in dp with typical insets: Android 3-button nav (24 top / 48
// bottom), Android gesture nav (24 / 16), and iPhone SE (20 / 0).
const ANDROID_3_BUTTON = { top: 24, bottom: 48 };
const ANDROID_GESTURE = { top: 24, bottom: 16 };
const PHONES = [
  { name: '360x800', width: 360, height: 800 },
  { name: '393x873', width: 393, height: 873 },
  { name: '412x915', width: 412, height: 915 },
];
const IPHONE_SE = { width: 375, height: 667, top: 20, bottom: 0 };

const branchSections = countSections(BRANCH_NAV_ITEMS.map((i) => i.group));
const productionSections = countSections(PRODUCTION_NAV_ITEMS.map((i) => i.group));

function metricsFor(height: number, insets: { top: number; bottom: number }, itemCount: number, sectionCount: number) {
  return computeDrawerRowMetrics(computeAvailableListHeight(height, insets.top, insets.bottom), itemCount, sectionCount);
}

describe('clamp', () => {
  it('passes a value inside the range through, and floors/ceils outside it', () => {
    expect(clamp(0, 0.5, 1)).toBe(0.5);
    expect(clamp(0, -1, 1)).toBe(0);
    expect(clamp(0, 2, 1)).toBe(1);
  });
});

describe('getDrawerWidth', () => {
  it('is 78% of the window, capped at 300', () => {
    expect(getDrawerWidth(360)).toBeCloseTo(280.8);
    expect(getDrawerWidth(393)).toBe(300);
    expect(getDrawerWidth(412)).toBe(300);
    expect(getDrawerWidth(1024)).toBe(300);
  });
});

describe('computeAvailableListHeight', () => {
  it('subtracts both insets and the fixed header/branch/footer heights', () => {
    expect(computeAvailableListHeight(800, 24, 48)).toBe(800 - 24 - 48 - HEADER_HEIGHT - BRANCH_STRIP_HEIGHT - FOOTER_HEIGHT);
  });
});

describe('the 13 Branch items fit without scrolling', () => {
  it('has 13 Branch items', () => {
    expect(BRANCH_NAV_ITEMS).toHaveLength(13);
  });

  for (const phone of PHONES) {
    for (const [navName, insets] of [
      ['3-button nav', ANDROID_3_BUTTON],
      ['gesture nav', ANDROID_GESTURE],
    ] as const) {
      it(`${phone.name}, ${navName}`, () => {
        const m = metricsFor(phone.height, insets, BRANCH_NAV_ITEMS.length, branchSections);
        expect(m.needsScroll).toBe(false);
        expect(m.rowHeight).toBeGreaterThanOrEqual(ROW_MIN_HEIGHT);
        const listHeight = m.rowHeight * BRANCH_NAV_ITEMS.length + (m.showSectionLabels ? branchSections * SECTION_LABEL_HEIGHT : 0);
        expect(listHeight).toBeLessThanOrEqual(computeAvailableListHeight(phone.height, insets.top, insets.bottom) + 0.001);
      });
    }
  }

  it('iPhone SE falls back to scrolling the list at the 40dp floor', () => {
    const m = metricsFor(IPHONE_SE.height, IPHONE_SE, BRANCH_NAV_ITEMS.length, branchSections);
    expect(m.needsScroll).toBe(true);
    expect(m.rowHeight).toBe(ROW_MIN_HEIGHT);
    expect(m.showSectionLabels).toBe(false);
  });
});

describe('section labels', () => {
  it('counts one label per change of group, including a group that comes back', () => {
    expect(countSections(['main', 'main', 'money', 'planning', 'endOfDay', 'planning'])).toBe(5);
    expect(countSections([])).toBe(0);
  });

  it('are dropped when the rows would fall below 40dp with them, and the rows take the space back', () => {
    // Branch's 6 labels don't fit on a 360x800 3-button phone.
    const m = metricsFor(800, ANDROID_3_BUTTON, BRANCH_NAV_ITEMS.length, branchSections);
    expect(m.showSectionLabels).toBe(false);
    expect(m.rowHeight).toBeCloseTo(computeAvailableListHeight(800, 24, 48) / BRANCH_NAV_ITEMS.length);
  });

  it('stay when the rows still reach 40dp (Production, 11 items, on a 393x873 or taller phone)', () => {
    expect(PRODUCTION_NAV_ITEMS).toHaveLength(11);
    for (const [height, insets] of [
      [873, ANDROID_GESTURE],
      [915, ANDROID_3_BUTTON],
    ] as const) {
      const m = metricsFor(height, insets, PRODUCTION_NAV_ITEMS.length, productionSections);
      expect(m.showSectionLabels).toBe(true);
      expect(m.rowHeight).toBeGreaterThanOrEqual(ROW_MIN_HEIGHT);
      expect(m.needsScroll).toBe(false);
    }
  });

  it("drop on a 360x800 3-button phone once WhatsApp Purchasing makes Production 11 items — still no scrolling", () => {
    const m = metricsFor(800, ANDROID_3_BUTTON, PRODUCTION_NAV_ITEMS.length, productionSections);
    expect(m.showSectionLabels).toBe(false);
    expect(m.rowHeight).toBeGreaterThanOrEqual(ROW_MIN_HEIGHT);
    expect(m.needsScroll).toBe(false);
  });

  it('never show for an ungrouped list', () => {
    expect(computeDrawerRowMetrics(2000, 5, 0).showSectionLabels).toBe(false);
  });
});

describe('derived sizes', () => {
  it('caps the row at 52dp on a tall screen, deriving icon and font from it', () => {
    const m = computeDrawerRowMetrics(2000, 13);
    expect(m.rowHeight).toBe(ROW_MAX_HEIGHT);
    expect(m.iconSize).toBeCloseTo(Math.min(ROW_MAX_HEIGHT * 0.42, ROW_ICON_MAX));
    expect(m.fontSize).toBeCloseTo(Math.min(ROW_MAX_HEIGHT * 0.34, ROW_FONT_MAX));
    expect(m.lineHeight).toBeCloseTo(m.fontSize * 1.2);
  });

  it('keeps icon and font inside their clamps at the 40dp floor', () => {
    const m = computeDrawerRowMetrics(100, 13);
    expect(m.rowHeight).toBe(ROW_MIN_HEIGHT);
    expect(m.iconSize).toBeGreaterThanOrEqual(ROW_ICON_MIN);
    expect(m.fontSize).toBeGreaterThanOrEqual(ROW_FONT_MIN);
    expect(m.needsScroll).toBe(true);
  });

  it('treats an empty list as one row instead of dividing by zero', () => {
    const m = computeDrawerRowMetrics(500, 0);
    expect(Number.isFinite(m.rowHeight)).toBe(true);
  });
});
