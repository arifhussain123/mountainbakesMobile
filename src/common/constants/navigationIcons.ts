import type { LucideIcon } from 'lucide-react-native';

/**
 * Icons are imported one file at a time, NOT from the package barrel.
 *
 * `import { Home } from 'lucide-react-native'` pulls the whole barrel in: a dev
 * bundle built that way contained **1769 icon modules for the 43 used here**.
 * Metro does not tree-shake a re-export barrel of that shape, so the dead 1727
 * would ship in the release APK too. `lucide-react-native/icons/<name>` is a
 * supported public export (see the package's `exports` map) and costs one module
 * per icon.
 *
 * The file names are kebab-case and, in Lucide 1.x, are **not** always the
 * kebab of the old PascalCase name — several icons were renamed and the barrel
 * only keeps the old name as an alias. The ones that bite:
 *
 *     Home → house              AlertTriangle  → triangle-alert
 *     Filter → funnel           HelpCircle     → circle-question-mark
 *     BarChart3 → chart-column  MoreHorizontal → ellipsis
 *
 * If an import here resolves to nothing, that is why: check the real file name
 * in `node_modules/lucide-react-native/dist/esm/icons/` rather than guessing
 * from the alias.
 */

import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Ban from 'lucide-react-native/icons/ban';
import Bell from 'lucide-react-native/icons/bell';
import Boxes from 'lucide-react-native/icons/boxes';
import Building2 from 'lucide-react-native/icons/building-2';
import ChartColumn from 'lucide-react-native/icons/chart-column';
import Check from 'lucide-react-native/icons/check';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import Circle from 'lucide-react-native/icons/circle';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import CircleQuestionMark from 'lucide-react-native/icons/circle-question-mark';
import ClipboardList from 'lucide-react-native/icons/clipboard-list';
import Coins from 'lucide-react-native/icons/coins';
import CreditCard from 'lucide-react-native/icons/credit-card';
import Ellipsis from 'lucide-react-native/icons/ellipsis';
import Factory from 'lucide-react-native/icons/factory';
import FileText from 'lucide-react-native/icons/file-text';
import Funnel from 'lucide-react-native/icons/funnel';
import House from 'lucide-react-native/icons/house';
import LayoutGrid from 'lucide-react-native/icons/layout-grid';
import LifeBuoy from 'lucide-react-native/icons/life-buoy';
import ListChecks from 'lucide-react-native/icons/list-checks';
import LogOut from 'lucide-react-native/icons/log-out';
import Menu from 'lucide-react-native/icons/menu';
import Minus from 'lucide-react-native/icons/minus';
import Package from 'lucide-react-native/icons/package';
import Plus from 'lucide-react-native/icons/plus';
import Printer from 'lucide-react-native/icons/printer';
import ReceiptText from 'lucide-react-native/icons/receipt-text';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import Search from 'lucide-react-native/icons/search';
import Settings from 'lucide-react-native/icons/settings';
import ShoppingCart from 'lucide-react-native/icons/shopping-cart';
import Store from 'lucide-react-native/icons/store';
import Tags from 'lucide-react-native/icons/tags';
import TrendingDown from 'lucide-react-native/icons/trending-down';
import TrendingUp from 'lucide-react-native/icons/trending-up';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import Truck from 'lucide-react-native/icons/truck';
import User from 'lucide-react-native/icons/user';
import Users from 'lucide-react-native/icons/users';
import Wallet from 'lucide-react-native/icons/wallet';
import Wifi from 'lucide-react-native/icons/wifi';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import X from 'lucide-react-native/icons/x';

/**
 * The single icon map for the whole app.
 *
 * Screens and navigation config import an `IconKey` — a string — never an icon
 * component. That indirection is what keeps one family: swapping an icon, or the
 * whole set, is an edit here rather than a sweep through every screen. It also
 * means `roleConfig.ts` stays a plain data file with no React imports, which is
 * what lets it be unit-tested without a renderer.
 *
 * One family only: `lucide-react-native`, which draws through `react-native-svg`
 * (already a dependency). Do not add `react-native-vector-icons`,
 * `@expo/vector-icons`, or a second Lucide-adjacent set — mixed families read as
 * a broken design long before anyone can say which icon is wrong.
 *
 * No emoji, and no Unicode symbol standing in for one. Both are font glyphs:
 * they ignore `color`, render differently on every Android skin, and carry no
 * `accessibilityLabel`.
 */
export const ICONS = {
  // Primary destinations
  home: House,
  orders: ClipboardList,
  products: Package,
  sales: ShoppingCart,
  stock: Boxes,
  expenses: ReceiptText,
  reports: ChartColumn,

  // Production
  production: Factory,
  preparation: ListChecks,
  delivery: Truck,

  // Admin / catalog
  users: Users,
  categories: Tags,
  vendors: Building2,
  branches: Store,

  // Finance
  income: Coins,
  partnerExpenses: Wallet,
  ledger: FileText,
  payments: CreditCard,
  closing: LayoutGrid,

  // Account panel + utility
  settings: Settings,
  // The receipt printer this handset is paired with. A printer rather than a
  // Bluetooth glyph: the row is about what comes out of it, and Bluetooth is
  // how it happens to be attached.
  printer: Printer,
  help: CircleQuestionMark,
  support: LifeBuoy,
  sync: RefreshCw,
  // A bell, not the alert triangle `failed` uses. A notification is something
  // that arrived; a failure is something that went wrong. Drawing both with the
  // same glyph taught the eye to read every triangle as "a sync has parked".
  notifications: Bell,
  profile: User,
  logout: LogOut,
  search: Search,
  filter: Funnel,
  // Special events — Eid, Ramadan, a wedding order, a market day. A calendar
  // rather than a star or a gift: what a branch needs off this row is *when*,
  // and the grid inside the screen is the same shape as the glyph.
  events: CalendarDays,
  more: Ellipsis,
  // The three-line drawer button in a header's leading slot. Deliberately a
  // different glyph from `more`: `more` opens the More TAB, which is a list of
  // destinations, while this opens the account panel, which holds identity and
  // actions and navigates nowhere. One ellipsis for both taught the top-left
  // and the bottom-right corner to look like the same control.
  menu: Menu,
  back: ArrowLeft,
  close: X,
  add: Plus,
  // Paired with `add` on a quantity stepper. Deliberately a separate key from
  // `trendFlat` even though both draw Minus: the two are unrelated meanings,
  // and a later change to either must not silently move the other.
  remove: Minus,
  chevron: ChevronRight,
  // Disclosure. Two static glyphs rather than one rotated on a timer: the
  // direction IS the state ("there is more below" / "it is open"), and a
  // rotation would be motion decorating a change the glyph already carries.
  chevronDown: ChevronDown,
  /** Pairs with `chevronDown` on a control that opens and closes in place. */
  chevronUp: ChevronUp,

  // Checklist state (password rules, and anything else where an item is met or
  // not). Both glyphs are circles so the column of them keeps one left edge —
  // a bare Check against a Circle would jog every line that passes.
  ruleMet: CircleCheck,
  rulePending: Circle,

  // Trend direction on a stat card. Paired with a success/danger token — the
  // arrow is what carries the meaning for anyone who cannot separate the two
  // colours, so the direction is never expressed by colour alone.
  trendUp: TrendingUp,
  trendDown: TrendingDown,
  trendFlat: Minus,

  // Connectivity + sync state
  online: Wifi,
  offline: WifiOff,
  synced: Check,
  pending: RefreshCw,
  failed: TriangleAlert,
  blocked: Ban,
} as const satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof ICONS;

/** Resolve a key to its component. Unknown keys are a type error, not a crash. */
export function iconFor(key: IconKey): LucideIcon {
  return ICONS[key];
}
