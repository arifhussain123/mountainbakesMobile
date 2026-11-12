import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { HERO_CHIP, useAppTheme, type PastelTone } from '@/shared/theme';
import { ACCENT_GLOW, AccentFill, Icon, PASTEL_INK, PastelTile, type AppHeaderAction, type IconName } from '@/shared/ui';

/**
 * Small 2026-redesign pieces the Sales, Discounts and Cash Transfers screens
 * share (mockup `design UIandUX/redesign-2026/common.py`): the round `iconbtn`,
 * the screen `topbar`, the `title()` block, the pastel `kpi()` tile, the
 * extended `fab`, the `btn soft/secondary/danger xs` buttons and `.eyebrow`.
 * Candidates for `src/shared/ui` once the redesign settles.
 */

// ---------------------------------------------------------------------------
// iconbtn — 42pt round white button with a soft violet lift (light).

export interface RoundIconButtonProps {
  icon: IconName;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
  badgeCount?: number;
  disabled?: boolean;
  loading?: boolean;
}

export function RoundIconButton({ icon, onPress, onLongPress, accessibilityLabel, badgeCount, disabled, loading }: RoundIconButtonProps) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={onLongPress ? 350 : undefined}
      hitSlop={4}
      style={({ pressed }) => [
        bits.iconBtn,
        { backgroundColor: theme.isDark ? theme.colors.border : theme.colors.surface, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        theme.isDark ? null : bits.lift,
      ]}>
      {loading ? <ActivityIndicator size="small" color={theme.colors.text} /> : <Icon name={icon} size={20} color={theme.colors.text} />}
      {badgeCount ? (
        <View style={[bits.badge, { backgroundColor: theme.colors.primary, borderColor: theme.isDark ? theme.colors.background : theme.colors.surface }]}>
          <Text style={[bits.badgeText, { color: theme.colors.primaryText }]}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// topbar — menu button, "Mountain Bakes" + a context line, round actions.

export interface TopBarProps {
  /** The small line under "Mountain Bakes" (e.g. "Sales on 2026-10-12 · 17 recorded"). */
  subtitle?: string;
  onMenu: () => void;
  actions?: (AppHeaderAction & { disabled?: boolean; loading?: boolean })[];
}

export function TopBar({ subtitle, onMenu, actions = [] }: TopBarProps) {
  const theme = useAppTheme();
  return (
    <View style={bits.topBar}>
      <RoundIconButton icon="menu" onPress={onMenu} accessibilityLabel="Open menu" />
      <View style={bits.topBarText}>
        <Text style={[bits.brand, { color: theme.colors.text }]} numberOfLines={1}>
          Mountain Bakes
        </Text>
        {subtitle ? (
          <Text style={[bits.xs, { color: theme.colors.textFaint }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions.map((a) => (
        <RoundIconButton
          key={a.icon}
          icon={a.icon}
          onPress={a.onPress}
          onLongPress={a.onLongPress}
          accessibilityLabel={a.accessibilityLabel}
          badgeCount={a.badgeCount}
          disabled={a.disabled}
          loading={a.loading}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// appbar(back=True) — a detail screen's back button, title and a context line.

export function BackAppBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const theme = useAppTheme();
  const navigation = useNavigation();
  return (
    <View style={bits.appBar}>
      <RoundIconButton icon="chevron-left" onPress={() => navigation.goBack()} accessibilityLabel="Back" />
      <View style={bits.topBarText}>
        <Text accessibilityRole="header" style={[TYPE.h2, { color: theme.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[bits.xs, { color: theme.colors.textFaint }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// The hero's own ink: white on the violet gradient (light); the accent's
// on-colour on dark mode's flat accent hero.

export function useHeroInk(): { ink: string; muted: string } {
  const theme = useAppTheme();
  return theme.isDark
    ? { ink: theme.colors.primaryText, muted: theme.colors.primaryText }
    : { ink: HERO_CHIP.text, muted: HERO_CHIP.textMuted };
}

/** `mini` on the hero — an uppercase micro-label over a small tabular figure, in the hero's ink. */
export function HeroMini({ label, value }: { label: string; value: string }) {
  const { ink, muted } = useHeroInk();
  return (
    <View style={bits.mini}>
      <Text style={[bits.miniK, { color: muted }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[bits.miniV, { color: ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
    </View>
  );
}

/** Hero text: the eyebrow and the big figure. */
export const HERO_TYPE = StyleSheet.create({
  eyebrow: { fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: 0.6 },
  amount: { fontSize: 34, lineHeight: 40, fontWeight: '600', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  sm: { fontSize: 13, lineHeight: 18 },
});

// ---------------------------------------------------------------------------
// title() — optional eyebrow, the 32pt h1, an optional paragraph, something on the right.

export interface PageTitleProps {
  eyebrow?: string;
  title: string;
  sub?: string;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function PageTitle({ eyebrow, title, sub, right, style }: PageTitleProps) {
  const theme = useAppTheme();
  return (
    <View style={style}>
      <View style={bits.titleRow}>
        <View style={bits.titleCol}>
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <Text accessibilityRole="header" style={[bits.h1, { color: theme.colors.text }]}>
            {title}
          </Text>
        </View>
        {right}
      </View>
      {sub ? <Text style={[bits.p, { color: theme.colors.textSecondary, marginTop: 6 }]}>{sub}</Text> : null}
    </View>
  );
}

/** `.eyebrow` — 12/15 SemiBold, faint. */
export function Eyebrow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  return <Text style={[bits.eyebrow, { color: theme.colors.textFaint }, style]}>{children}</Text>;
}

// ---------------------------------------------------------------------------
// kpi() — a pastel tile: label, a big tabular value, an optional sub-line.

export interface KpiTileProps {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  icon?: IconName;
  /** The `.kpi:nth-child(5n+k)` pastel — pass the tile's position in its grid. */
  tone: PastelTone;
  /** Makes the tile a button (e.g. a payment-method filter). */
  onPress?: () => void;
  selected?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function KpiTile({ label, value, sub, valueColor, icon, tone, onPress, selected, accessibilityLabel, style }: KpiTileProps) {
  const theme = useAppTheme();
  const muted = theme.isDark ? theme.colors.textSecondary : PASTEL_INK.muted;
  const ink = theme.isDark ? theme.colors.text : PASTEL_INK.text;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { selected: !!selected } : undefined}
      accessibilityLabel={accessibilityLabel ?? `${label} ${value}${sub ? `, ${sub}` : ''}`}
      style={[bits.kpiRing, { borderColor: selected ? theme.colors.primary : 'transparent' }, style]}>
      <PastelTile tone={tone} style={[bits.kpi, theme.isDark ? null : bits.kpiLift]}>
        <View style={bits.kpiHead}>
          <Text style={[bits.kpiK, { color: muted }]} numberOfLines={1}>
            {label}
          </Text>
          {icon ? <Icon name={icon} size={18} color={muted} /> : null}
        </View>
        <Text style={[bits.kpiV, { color: valueColor ?? ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {value}
        </Text>
        {sub ? (
          <Text style={[bits.kpiS, { color: muted }]} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </PastelTile>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// fab — extended saffron button floating bottom-right.

export interface ExtendedFabProps {
  label: string;
  onPress: () => void;
  /** Distance from the bottom of the screen (above the tab bar where there is one). */
  bottom: number;
  icon?: IconName;
  accessibilityLabel?: string;
}

export function ExtendedFab({ label, onPress, bottom, icon = 'plus', accessibilityLabel }: ExtendedFabProps) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [
        bits.fab,
        { bottom, backgroundColor: theme.colors.primary, opacity: pressed ? 0.88 : 1 },
        theme.isDark ? bits.fabDarkLift : ACCENT_GLOW,
      ]}>
      <AccentFill borderRadius={20} />
      <Icon name={icon} size={20} color={theme.colors.primaryText} />
      <Text style={[bits.fabText, { color: theme.colors.primaryText }]}>{label}</Text>
    </Pressable>
  );
}

/** List bottom padding that keeps the last card clear of the FAB. */
export const FAB_CLEARANCE = 88;

// ---------------------------------------------------------------------------
// btn xs / sm — soft (peach), secondary (white, hairline), danger (rose).

export interface SmallButtonProps {
  label: string;
  onPress?: () => void;
  kind?: 'soft' | 'secondary' | 'danger';
  icon?: IconName;
  size?: 'xs' | 'sm';
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function SmallButton({ label, onPress, kind = 'secondary', icon, size = 'xs', disabled, loading, accessibilityLabel, style }: SmallButtonProps) {
  const theme = useAppTheme();
  const palette = {
    soft: {
      bg: theme.isDark ? `${theme.colors.primary}24` : '#FFEDE5',
      border: theme.isDark ? 'transparent' : 'rgba(242, 84, 45, 0.15)',
      ink: theme.isDark ? theme.colors.primary : '#E2471F',
    },
    secondary: { bg: theme.isDark ? 'transparent' : theme.colors.surface, border: theme.colors.border, ink: theme.colors.text },
    danger: {
      bg: theme.isDark ? `${theme.colors.danger}24` : '#FDE8E8',
      border: theme.isDark ? 'transparent' : 'rgba(229, 72, 77, 0.15)',
      ink: theme.colors.danger,
    },
  }[kind];
  const sm = size === 'sm';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        bits.smallBtn,
        sm ? bits.smBtn : bits.xsBtn,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={palette.ink} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={sm ? 18 : 15} color={palette.ink} /> : null}
          <Text style={[sm ? bits.smText : bits.xsText, { color: palette.ink }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------

/** `card flat` — the Card look without its lift, for rows in a list. */
export const FLAT_CARD: ViewStyle = { shadowOpacity: 0, elevation: 0 };

/** `card tint` — the lavender inset panel (light); the plain card fill in dark. */
export function tintFill(isDark: boolean, fallback: string): string {
  return isDark ? fallback : '#EFEBFF';
}

/** Mockup type scale (v4). */
export const TYPE = StyleSheet.create({
  h2: { fontSize: 21, lineHeight: 27, fontWeight: '600', letterSpacing: -0.4 },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  h3s: { fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: -0.2 },
  p: { fontSize: 15, lineHeight: 21 },
  sm: { fontSize: 13, lineHeight: 18 },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  amt: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
  label: { fontSize: 14, fontWeight: '600' },
});

const bits = StyleSheet.create({
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  lift: { shadowColor: '#4C3CAA', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: { fontSize: 8, fontWeight: '700' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56 },
  appBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8, minHeight: 56 },
  mini: { flex: 1, minWidth: 0, gap: 2 },
  miniK: { fontSize: 10, lineHeight: 13, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  miniV: { fontSize: 14, lineHeight: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  topBarText: { flex: 1, minWidth: 0, gap: 1 },
  brand: { fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: -0.2 },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  titleCol: { flex: 1, minWidth: 0, gap: 4 },
  h1: { fontSize: 32, lineHeight: 38, fontWeight: '600', letterSpacing: -1 },
  p: { fontSize: 15, lineHeight: 21 },
  eyebrow: { fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: 0.6 },
  kpiRing: { flex: 1, minWidth: 0, borderWidth: 2, borderRadius: 26 },
  kpi: { borderRadius: 24, paddingHorizontal: 14, paddingVertical: 14, gap: 4 },
  kpiLift: { shadowColor: '#4C3CAA', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 3 },
  kpiHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  kpiK: { flexShrink: 1, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  kpiV: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  kpiS: { fontSize: 11, lineHeight: 15, fontWeight: '500' },
  fab: {
    position: 'absolute',
    right: 20,
    height: 56,
    borderRadius: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fabDarkLift: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 6 },
  fabText: { fontSize: 15, fontWeight: '600' },
  smallBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
  xsBtn: { height: 32, borderRadius: 11, paddingHorizontal: 12 },
  smBtn: { height: 38, borderRadius: 14, paddingHorizontal: 14 },
  xsText: { fontSize: 12, fontWeight: '600' },
  smText: { fontSize: 13, fontWeight: '600' },
});
