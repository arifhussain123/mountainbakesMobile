import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';

export type IconName =
  | 'menu'
  | 'bell'
  | 'search'
  | 'chevron-down'
  | 'close'
  | 'check'
  | 'warning'
  | 'refresh'
  | 'box'
  | 'plus'
  | 'minus'
  | 'trash'
  | 'calendar'
  | 'camera'
  | 'image'
  | 'chevron-left'
  | 'chevron-right'
  | 'rotate-ccw'
  | 'percent'
  | 'wallet'
  | 'sparkle'
  | 'building'
  | 'hash'
  | 'clock'
  | 'user'
  | 'file-spreadsheet'
  | 'printer'
  | 'home'
  | 'orders'
  | 'sales'
  | 'stock'
  | 'more'
  | 'dashboard-grid'
  | 'ledger'
  | 'transfer'
  | 'bar-chart'
  | 'trending-up'
  | 'layers'
  | 'grid'
  | 'calendar-check'
  | 'scales'
  | 'headset'
  | 'logout'
  | 'receipt'
  | 'arrow-up-right'
  | 'info'
  | 'lock'
  | 'pencil'
  | 'flag';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

/**
 * A handful of hand-built SVG icons rather than an icon-font dependency —
 * keeps the bundle lean (CLAUDE.md Section 36) for the small, fixed set Phase 1
 * actually needs.
 */
export function Icon({ name, size = 20, color = '#2E1A12' }: IconProps) {
  const stroke = color;
  const common = { fill: 'none', stroke, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'menu':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1={4} y1={6} x2={20} y2={6} {...common} />
          <Line x1={4} y1={12} x2={20} y2={12} {...common} />
          <Line x1={4} y1={18} x2={20} y2={18} {...common} />
        </Svg>
      );
    case 'bell':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" {...common} />
          <Path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" {...common} />
        </Svg>
      );
    case 'search':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={11} cy={11} r={7} {...common} />
          <Line x1={20} y1={20} x2={16.5} y2={16.5} {...common} />
        </Svg>
      );
    case 'chevron-down':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M6 9l6 6 6-6" {...common} />
        </Svg>
      );
    case 'close':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1={6} y1={6} x2={18} y2={18} {...common} />
          <Line x1={18} y1={6} x2={6} y2={18} {...common} />
        </Svg>
      );
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M5 12l5 5 9-10" {...common} />
        </Svg>
      );
    case 'warning':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3 2 20h20z" {...common} />
          <Line x1={12} y1={10} x2={12} y2={14} {...common} />
          <Circle cx={12} cy={17} r={0.5} fill={stroke} stroke="none" />
        </Svg>
      );
    case 'refresh':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M21 12a9 9 0 1 1-3-6.7L21 8" {...common} />
          <Path d="M21 3v5h-5" {...common} />
        </Svg>
      );
    case 'box':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 7l9-4 9 4-9 4-9-4z" {...common} />
          <Path d="M3 7v10l9 4 9-4V7" {...common} />
          <Line x1={12} y1={11} x2={12} y2={21} {...common} />
        </Svg>
      );
    case 'plus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1={12} y1={5} x2={12} y2={19} {...common} />
          <Line x1={5} y1={12} x2={19} y2={12} {...common} />
        </Svg>
      );
    case 'minus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1={5} y1={12} x2={19} y2={12} {...common} />
        </Svg>
      );
    case 'trash':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 7h16" {...common} />
          <Path d="M9 7V4h6v3" {...common} />
          <Path d="M6 7l1 13h10l1-13" {...common} />
        </Svg>
      );
    case 'calendar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={3} y={5} width={18} height={16} rx={2} {...common} />
          <Line x1={3} y1={10} x2={21} y2={10} {...common} />
          <Line x1={8} y1={3} x2={8} y2={7} {...common} />
          <Line x1={16} y1={3} x2={16} y2={7} {...common} />
        </Svg>
      );
    case 'camera':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 8h3l2-3h6l2 3h3v12H4z" {...common} strokeLinejoin="round" />
          <Circle cx={12} cy={13} r={3.5} {...common} />
        </Svg>
      );
    case 'chevron-left':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M15 18l-6-6 6-6" {...common} />
        </Svg>
      );
    case 'chevron-right':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M9 6l6 6-6 6" {...common} />
        </Svg>
      );
    case 'image':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={4} y={4} width={16} height={16} rx={2} {...common} strokeLinejoin="round" />
          <Path d="M4 16l5-5 4 4 3-3 4 4" {...common} strokeLinejoin="round" />
          <Circle cx={15} cy={9} r={1.5} fill={stroke} stroke="none" />
        </Svg>
      );
    case 'rotate-ccw':
      // branchApp.md screen 05 "Return Items" quick-action pill icon.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" {...common} />
        </Svg>
      );
    case 'percent':
      // branchApp.md screen 05 "Discount" quick-action pill icon.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M9 15l6-6M9.5 9.5h.01M14.5 14.5h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" {...common} />
        </Svg>
      );
    case 'wallet':
      // branchApp.md screen 05 "Cash Deposit" quick-action pill icon.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 7h18v10H3zM12 12h.01M7 12h.01M17 12h.01" {...common} />
        </Svg>
      );
    case 'sparkle':
      // branchApp.md screen 05 "Special Order Items" section icon.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4zM19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8zM5 16l.6 1.4L7 18l-1.4.6L5 20l-.6-1.4L3 18l1.4-.6z"
            {...common}
          />
        </Svg>
      );
    case 'building':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={5} y={3} width={14} height={18} rx={1} {...common} />
          <Line x1={9} y1={7} x2={15} y2={7} {...common} />
          <Line x1={9} y1={11} x2={15} y2={11} {...common} />
          <Line x1={9} y1={15} x2={15} y2={15} {...common} />
          <Line x1={10} y1={21} x2={10} y2={18} {...common} />
          <Line x1={14} y1={21} x2={14} y2={18} {...common} />
        </Svg>
      );
    case 'hash':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1={4} y1={9} x2={20} y2={9} {...common} />
          <Line x1={4} y1={15} x2={20} y2={15} {...common} />
          <Line x1={10} y1={3} x2={8} y2={21} {...common} />
          <Line x1={16} y1={3} x2={14} y2={21} {...common} />
        </Svg>
      );
    case 'clock':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9} {...common} />
          <Path d="M12 7v5l3 3" {...common} />
        </Svg>
      );
    case 'user':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={8} r={4} {...common} />
          <Path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" {...common} />
        </Svg>
      );
    case 'file-spreadsheet':
      // Branch Closing header "Excel" export pill icon (design line 942).
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6" {...common} strokeLinejoin="round" />
        </Svg>
      );
    case 'printer':
      // Branch Closing header "Print" export pill icon (design line 942).
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M7 9V3h10v6M7 17H4V9h16v8h-3M7 14h10v7H7z" {...common} strokeLinejoin="round" />
        </Svg>
      );
    // The five bottom-tab icons, lifted verbatim from mountainbakesBranch.html's
    // own `I` icon map (design line ~1273) — every bottom-tab shell
    // (Branch/Production/Finance) draws its tab bar from these, not a
    // placeholder borrowed from elsewhere in this file.
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" {...common} />
        </Svg>
      );
    case 'orders':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M9 3h6v3H9zM7 4.5H5V21h14V4.5h-2M9 11h6M9 15h4" {...common} />
        </Svg>
      );
    case 'sales':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 4h2l2.4 11h11l2-8H6.2M9 20h.01M18 20h.01" {...common} />
        </Svg>
      );
    case 'stock':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" {...common} />
        </Svg>
      );
    case 'more':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" {...common} />
        </Svg>
      );
    // Finance bottom-tab icons (Dashboard/Ledger/Transfers/Reports/More) — the
    // other four tabs reuse icons already above ('home', 'wallet', 'more').
    case 'dashboard-grid':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={3} y={3} width={8} height={8} rx={1.5} {...common} />
          <Rect x={13} y={3} width={8} height={8} rx={1.5} {...common} />
          <Rect x={3} y={13} width={8} height={8} rx={1.5} {...common} />
          <Rect x={13} y={13} width={8} height={8} rx={1.5} {...common} />
        </Svg>
      );
    case 'ledger':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" {...common} strokeLinejoin="round" />
          <Path d="M14 3v5h5M8.5 12.5h7M8.5 16h7" {...common} />
        </Svg>
      );
    case 'transfer':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 8h13M12 4l4 4-4 4" {...common} />
          <Path d="M21 16H8m5 4-4-4 4-4" {...common} />
        </Svg>
      );
    case 'bar-chart':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M5 21V12M12 21V7M19 21v-8" {...common} />
          <Path d="M4 6l5-2 6 2 5-3" {...common} />
        </Svg>
      );
    // Onboarding feature-strip icons — lifted verbatim from
    // mountainbakesBranch.html's "02 Onboarding 1" screen so the feature
    // strip is pixel-identical to the design file.
    case 'trending-up':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 17l6-6 4 4 8-8M15 7h6v6" {...common} />
        </Svg>
      );
    case 'layers':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 3l4 2.3v4.6L12 12 8 9.9V5.3zM8 9.9l4 2.1v4.6l-4 2.3-4-2.3v-4.6zM16 9.9l4 2.1v4.6l-4 2.3-4-2.3"
            {...common}
          />
        </Svg>
      );
    case 'grid':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" {...common} />
        </Svg>
      );
    // The pill-button arrow chip — mountainbakesBranch.html's own CTA icon
    // (design file: 'M7 17L17 7M8 7h9v9'), distinct from `chevron-right`.
    case 'arrow-up-right':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M7 17L17 7M8 7h9v9" {...common} strokeWidth={2.6} />
        </Svg>
      );
    case 'info':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9} {...common} />
          <Line x1={12} y1={11} x2={12} y2={16} {...common} />
          <Circle cx={12} cy={7.5} r={0.5} fill={stroke} stroke="none" />
        </Svg>
      );
    case 'lock':
      // Discounts' "Final" (reviewed, can't be changed) marker.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={5} y={11} width={14} height={9} rx={1.5} {...common} />
          <Path d="M8 11V7a4 4 0 0 1 8 0v4" {...common} />
        </Svg>
      );
    case 'pencil':
      // Discounts' "Change"/"Correct" action icon.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 20l1-4.5L15.5 5 19 8.5 8.5 19z" {...common} strokeLinejoin="round" />
          <Line x1={13.5} y1={6.5} x2={17} y2={10} {...common} />
        </Svg>
      );
    case 'calendar-check':
      // Drawer "Branch Closing" item — a calendar with a confirming check.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={3} y={5} width={18} height={16} rx={2} {...common} />
          <Line x1={3} y1={10} x2={21} y2={10} {...common} />
          <Line x1={8} y1={3} x2={8} y2={7} {...common} />
          <Line x1={16} y1={3} x2={16} y2={7} {...common} />
          <Path d="M8.5 14.5l2 2 4.5-4.5" {...common} />
        </Svg>
      );
    case 'scales':
      // Drawer "Daily Sale Record" item — a balance scale, takings vs counted.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1={12} y1={3} x2={12} y2={21} {...common} />
          <Line x1={6} y1={6} x2={18} y2={6} {...common} />
          <Path d="M3 10l3-4 3 4a3 3 0 0 1-6 0z" {...common} strokeLinejoin="round" />
          <Path d="M15 10l3-4 3 4a3 3 0 0 1-6 0z" {...common} strokeLinejoin="round" />
          <Line x1={9} y1={21} x2={15} y2={21} {...common} />
        </Svg>
      );
    case 'headset':
      // Drawer "Help Desk" item.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 13v-1a8 8 0 0 1 16 0v1" {...common} />
          <Rect x={2.5} y={13} width={4} height={6} rx={1.5} {...common} />
          <Rect x={17.5} y={13} width={4} height={6} rx={1.5} {...common} />
          <Path d="M19.5 19v1a3 3 0 0 1-3 3h-3" {...common} />
        </Svg>
      );
    case 'logout':
      // Drawer footer "Sign Out" item.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" {...common} />
          <Path d="M16 17l5-5-5-5" {...common} />
          <Line x1={21} y1={12} x2={9} y2={12} {...common} />
        </Svg>
      );
    case 'receipt':
      // Drawer "Shop Expenses" item.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M6 3h12v18l-2.5-1.5L13 21l-1.5-1.5L10 21l-2.5-1.5L6 21z" {...common} strokeLinejoin="round" />
          <Line x1={9} y1={8} x2={15} y2={8} {...common} />
          <Line x1={9} y1={12} x2={15} y2={12} {...common} />
          <Line x1={9} y1={16} x2={13} y2={16} {...common} />
        </Svg>
      );
    case 'flag':
      // Help Desk's "Report an issue" action on Sale/Order/Expense/Stock/Cash Transfer screens.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1={5} y1={3} x2={5} y2={21} {...common} />
          <Path d="M5 4h13l-3 4 3 4H5" {...common} strokeLinejoin="round" />
        </Svg>
      );
    default:
      return null;
  }
}
