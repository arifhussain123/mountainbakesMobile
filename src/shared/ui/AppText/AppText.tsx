/**
 * App-wide font (2026 redesign — Urbanist).
 *
 * React Native has no global default font, and ~400 screens import `Text` /
 * `TextInput` straight from 'react-native' with inline `fontWeight`s. Rather
 * than touching every one of them, `babel/appTextFont.js` rewrites those
 * imports (inside src/ only) to these two wrappers at build time.
 *
 * Custom fonts don't synthesize weights reliably (Android fakes bold, iOS
 * needs each face registered), so each `fontWeight` is mapped to its own
 * bundled face (`assets/fonts/Urbanist-*.ttf`) and the weight itself is reset
 * to 'normal'. A nested <Text> without its own weight inherits its parent's
 * face, the same as RN's own style inheritance. An explicit `fontFamily`
 * (icon fonts, monospace) is always left alone.
 */
import { createContext, useContext } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextStyle } from 'react-native';

export const FONT = {
  regular: 'Urbanist-Regular',
  medium: 'Urbanist-Medium',
  semibold: 'Urbanist-SemiBold',
  bold: 'Urbanist-Bold',
} as const;

const BY_WEIGHT: Record<string, string> = {
  '100': FONT.regular,
  '200': FONT.regular,
  '300': FONT.regular,
  '400': FONT.regular,
  normal: FONT.regular,
  '500': FONT.medium,
  '600': FONT.semibold,
  '700': FONT.bold,
  bold: FONT.bold,
  '800': FONT.bold,
  '900': FONT.bold,
};

/** The face a parent <Text> resolved to, so a nested <Text> without its own weight keeps it. */
const ParentFace = createContext<string | null>(null);

/** `null` = leave the style alone (an explicit fontFamily was given). */
export function resolveFace(style: unknown, inherited: string | null): string | null {
  const flat = (StyleSheet.flatten(style as TextStyle) ?? {}) as TextStyle;
  if (flat.fontFamily) return null;
  if (flat.fontWeight != null) return BY_WEIGHT[String(flat.fontWeight)] ?? FONT.regular;
  return inherited ?? FONT.regular;
}

type TextProps = React.ComponentProps<typeof RNText>;
type TextInputProps = React.ComponentProps<typeof RNTextInput>;

function AppText(props: TextProps) {
  const inherited = useContext(ParentFace);
  const face = resolveFace(props.style, inherited);
  if (face == null) return <RNText {...props} />;
  return (
    <ParentFace value={face}>
      <RNText {...props} style={[props.style, { fontFamily: face, fontWeight: 'normal' }]} />
    </ParentFace>
  );
}

function AppTextInput(props: TextInputProps) {
  const face = resolveFace(props.style, null);
  if (face == null) return <RNTextInput {...props} />;
  return <RNTextInput {...props} style={[props.style, { fontFamily: face, fontWeight: 'normal' }]} />;
}

// Same public type as React Native's own, so `ref`s, statics and props type-check unchanged.
export const Text = Object.assign(AppText, { displayName: 'Text' }) as unknown as typeof RNText;
export const TextInput = Object.assign(AppTextInput, { State: RNTextInput.State, displayName: 'TextInput' }) as unknown as typeof RNTextInput;
