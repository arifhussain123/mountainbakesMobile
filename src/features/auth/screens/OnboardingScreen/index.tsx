import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { images } from '@/assets';
import { Routes, type AuthStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { Icon, Screen } from '@/shared/ui';
import { styles } from './styles';

export const ONBOARDING_SEEN_KEY = 'mountainbakes.onboardingSeen';

const SLIDES = [
  {
    title: 'Fresh\nfrom the\noven daily',
    body: 'Sales, stock and orders for your branch, from the first bake to the evening close.',
    features: ['Live sales', 'Stock', 'Daily close'] as const,
    cta: 'Next',
  },
  {
    // branchApp.md's own 2 AM Karachi business-day rule (api/businessDate.ts) —
    // this copy describes the real rollover, not a separate invented one.
    title: 'The day\nends at\n2 AM',
    body: 'A sale rung up at 9pm belongs to that evening even if it reaches the office next morning. A late shift is never split across two days.',
    features: null,
    cta: 'Get Started',
  },
] as const;

/** branchApp.md screens 02/02b — shown once, behind an AsyncStorage "seen" flag. */
export function OnboardingScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  const finish = () => {
    void AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    navigation.replace(Routes.LOGIN);
  };

  const handleNext = () => {
    if (index < SLIDES.length - 1) setIndex(index + 1);
    else finish();
  };

  return (
    <Screen>
      <View style={styles.content}>
        <Image source={images.logo} style={styles.logo} />
        <View style={styles.spacer} />
        <Text style={[theme.typography.screenTitle, styles.title, { color: theme.colors.text, textTransform: 'uppercase' }]}>
          {slide.title.split('\n').map((line, i) => (
            <Text key={i} style={i === 1 ? { color: theme.colors.primary } : undefined}>
              {line}
              {i < slide.title.split('\n').length - 1 ? '\n' : ''}
            </Text>
          ))}
        </Text>
        <Text style={[theme.typography.body, styles.body, { color: theme.colors.textSecondary }]}>{slide.body}</Text>

        {slide.features ? (
          <View style={[styles.featuresRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            {slide.features.map((label, i) => (
              <View key={label} style={[styles.featureItem, i > 0 ? { ...styles.featureItemBordered, borderColor: theme.colors.border } : null]}>
                <Icon name="check" size={18} color={theme.colors.primary} />
                <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>{label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={handleNext}
          style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}>
          <Text style={[theme.typography.body, { color: theme.colors.primaryText, fontWeight: '700' }]}>{slide.cta}</Text>
        </Pressable>

        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, { width: i === index ? 18 : 4, backgroundColor: i === index ? theme.colors.primary : theme.colors.border }]}
            />
          ))}
        </View>

        {index === 0 ? (
          <Pressable accessibilityRole="button" onPress={finish}>
            <Text style={[theme.typography.body, styles.skip, { color: theme.colors.primary, fontWeight: '700' }]}>Skip</Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}
