// screens/settings/ReaderThemeSettingsScreen.tsx
// Reader theme customization UI — preset selection, font size, brightness,
// font family, line spacing, margins, and a live preview panel.
// Premium users unlock all presets and advanced controls.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import BackButton from '../../components/general/BackButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';
import { openPremiumCheckout } from '../../services/stripeService';
import PremiumUpgradeModal from '../../components/layout/PremiumUpgradeModal';
import {
  useReaderTheme,
  type ReaderThemePreset,
  type ReaderThemeConfig,
} from '../../context/ReaderThemeContext';
import { colors, spacing } from '../../styles/tokens';

// ─── Slider component (simple numeric control) ───────────────────────

function StepSlider({
  value,
  min,
  max,
  step,
  label,
  leftLabel,
  rightLabel,
  onChange,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  leftLabel: string;
  rightLabel: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const { colors: theme } = useTheme();
  const steps = Math.round((max - min) / step);
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <View style={styles.controlGroup}>
      <Text style={[styles.controlLabel, { color: theme.textPrimary }]}>{label}</Text>
      <View style={styles.sliderRow}>
        <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>{leftLabel}</Text>
        <View style={[styles.sliderTrack, { backgroundColor: theme.bgSecondary }]}>
          <View style={[styles.sliderFill, { width: `${percent}%`, backgroundColor: disabled ? theme.textMuted : theme.accentLight }]} />
        </View>
        <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>{rightLabel}</Text>
      </View>
      <View style={styles.stepButtons}>
        {Array.from({ length: steps + 1 }, (_, i) => {
          const val = min + i * step;
          const active = Math.abs(value - val) < step / 2;
          return (
            <Pressable
              key={i}
              style={[
                styles.stepDot,
                {
                  borderColor: theme.border,
                  backgroundColor: active ? theme.accentLight : theme.bgInput,
                },
              ]}
              onPress={() => !disabled && onChange(val)}
              disabled={disabled}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Preset card ─────────────────────────────────────────────────────

function PresetCard({
  config,
  isActive,
  isLocked,
  onSelect,
}: {
  config: ReaderThemeConfig;
  isActive: boolean;
  isLocked: boolean;
  onSelect: () => void;
}) {
  const { colors: theme } = useTheme();
  return (
    <Pressable
      style={[
        styles.presetCard,
        {
          backgroundColor: config.bg,
          borderColor: isActive ? theme.accentLight : 'transparent',
          borderWidth: isActive ? 2 : 1,
          opacity: isLocked ? 0.5 : 1,
        },
      ]}
      onPress={isLocked ? undefined : onSelect}
    >
      <View style={styles.presetPreview}>
        <Text style={[styles.presetPreviewText, { color: config.text }]}>
          Aa
        </Text>
      </View>
      <Text style={[styles.presetName, { color: config.text }]}>
        {config.icon} {config.label}
      </Text>
      {isLocked && (
        <Feather name="lock" size={12} color={config.text} style={styles.lockIcon} />
      )}
      {isActive && (
        <View style={[styles.activeBadge, { backgroundColor: theme.success }]}>
          <Feather name="check" size={10} color={colors.white} />
        </View>
      )}
    </Pressable>
  );
}

// ─── Option row ──────────────────────────────────────────────────────

function OptionRow({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string;
  value: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { colors: theme } = useTheme();
  return (
    <Pressable
      style={[
        styles.optionRow,
        { backgroundColor: selected ? theme.accentLight + '20' : 'transparent', borderColor: theme.border },
      ]}
      onPress={onSelect}
    >
      <Text style={[styles.optionText, { color: theme.textPrimary }]}>{label}</Text>
      {selected && <Feather name="check" size={16} color={theme.accentLight} />}
    </Pressable>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────

export default function ReaderThemeSettingsScreen() {
  const navigation = useNavigation();
  const { isPremium } = usePremium();
  const { colors: theme } = useTheme();
  const {
    preset: activePreset,
    presets,
    activeConfig,
    setPreset,
    brightness,
    setBrightness,
    fontSize,
    setFontSize,
  } = useReaderTheme();

  // Additional settings (not yet in context, simulated locally)
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans-serif' | 'monospace'>('sans-serif');
  const [lineSpacing, setLineSpacing] = useState(1.6);
  const [margin, setMargin] = useState(16);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const fontFamilies = [
    { key: 'sans-serif' as const, label: 'Sans Serif', preview: 'System default' },
    { key: 'serif' as const, label: 'Serif', preview: 'Georgia, Times' },
    { key: 'monospace' as const, label: 'Monospace', preview: 'Courier, Mono' },
  ];

  // Preview content
  const previewBg = activeConfig.bg;
  const previewText = activeConfig.text;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.title, { color: theme.textPrimary }]}>Reading Themes</Text>
        </View>

        {/* Live Preview */}
        <View style={[styles.previewPanel, { backgroundColor: previewBg, borderColor: theme.border }]}>
          <Text style={[styles.previewMangaTitle, { color: previewText, fontSize: 14 }]}>
            Chapter 42: The Final Page
          </Text>
          <Text style={[styles.previewBody, { color: previewText, fontSize, lineHeight: fontSize * lineSpacing }]}>
            The ink hadn't even dried on the final panel when she realized the story wasn't over. 
            It was just beginning. The city stretched out before her, a canvas of neon and shadow, 
            every corner hiding a new chapter waiting to be read.
          </Text>
          <Text style={[styles.previewBody, { color: previewText, fontSize, lineHeight: fontSize * lineSpacing }]}>
            She turned the page. The world shifted. Nothing would ever be the same again.
          </Text>
          <View style={[styles.previewBadge, { backgroundColor: previewBg === '#000000' ? '#333' : theme.border }]}>
            <Text style={[styles.previewBadgeText, { color: previewText, fontSize: 10 }]}>
              Preview — {activeConfig.label} theme, {fontSize}px, {lineSpacing}x spacing
            </Text>
          </View>
        </View>

        {/* Presets */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Theme Presets</Text>
        <View style={styles.presetsGrid}>
          {presets.map((p) => (
            <PresetCard
              key={p.preset}
              config={p}
              isActive={p.preset === activePreset}
              isLocked={p.isPremium && !isPremium}
              onSelect={() => setPreset(p.preset)}
            />
          ))}
        </View>

        {/* Premium-gated advanced controls */}
        {isPremium ? (
          <View>
            {/* Font Size */}
            <StepSlider
              label="Font Size"
              value={fontSize}
              min={12}
              max={24}
              step={2}
              leftLabel="A"
              rightLabel="A"
              onChange={setFontSize}
            />

            {/* Brightness */}
            <StepSlider
              label="Brightness"
              value={brightness}
              min={0.3}
              max={1.0}
              step={0.1}
              leftLabel="🌑"
              rightLabel="☀️"
              onChange={setBrightness}
            />

            {/* Line Spacing */}
            <StepSlider
              label="Line Spacing"
              value={lineSpacing}
              min={1.2}
              max={2.4}
              step={0.2}
              leftLabel="Tight"
              rightLabel="Loose"
              onChange={setLineSpacing}
            />

            {/* Margin */}
            <StepSlider
              label="Page Margin"
              value={margin}
              min={0}
              max={32}
              step={4}
              leftLabel="None"
              rightLabel="Wide"
              onChange={setMargin}
            />

            {/* Font Family */}
            <View style={styles.controlGroup}>
              <Text style={[styles.controlLabel, { color: theme.textPrimary }]}>Font Family</Text>
              {fontFamilies.map((f) => (
                <OptionRow
                  key={f.key}
                  label={`${f.label} (${f.preview})`}
                  value={f.key}
                  selected={fontFamily === f.key}
                  onSelect={() => setFontFamily(f.key)}
                />
              ))}
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowPremiumModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Upgrade to unlock advanced theme controls"
            style={[styles.premiumNudge, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
          >
            <Feather name="lock" size={16} color={theme.accentLight} />
            <Text style={[styles.premiumNudgeText, { color: theme.textSecondary }]}>
              Advanced theme controls are Premium-only.
            </Text>
            <Feather name="chevron-right" size={16} color={theme.textMuted} />
          </Pressable>
        )}

        {/* Reset button */}
        <Pressable
          style={[styles.resetButton, { borderColor: theme.border }]}
          onPress={() => {
            Alert.alert('Reset Theme', 'Restore default reading theme settings?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Reset',
                onPress: () => {
                  setPreset('dark');
                  setBrightness(1.0);
                  setFontSize(14);
                  setFontFamily('sans-serif');
                  setLineSpacing(1.6);
                  setMargin(16);
                },
              },
            ]);
          }}
        >
          <Text style={[styles.resetText, { color: theme.textSecondary }]}>Reset to Defaults</Text>
        </Pressable>
      </ScrollView>

      {/* Premium upgrade modal (free users tapping the nudge) */}
      <PremiumUpgradeModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onUpgrade={openPremiumCheckout}
        source="modal:theme_settings"
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: spacing.p50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.p16,
    paddingHorizontal: spacing.p16,
    marginBottom: spacing.p16,
  },
  backBtn: { marginRight: spacing.p12 },
  title: { fontSize: 20, fontWeight: '700' },

  // Preview
  previewPanel: {
    marginHorizontal: spacing.p16,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.p16,
    marginBottom: spacing.p20,
  },
  previewMangaTitle: {
    fontWeight: '700',
    marginBottom: spacing.p12,
    textAlign: 'center',
  },
  previewBody: {
    marginBottom: spacing.p10,
  },
  previewBadge: {
    alignSelf: 'center',
    paddingHorizontal: spacing.p10,
    paddingVertical: spacing.p4,
    borderRadius: 6,
    marginTop: spacing.p8,
  },
  previewBadgeText: {
    fontWeight: '600',
  },

  // Presets
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: spacing.p16,
    marginBottom: spacing.p10,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.p12,
    marginBottom: spacing.p16,
    gap: spacing.p8,
  },
  presetCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  presetPreview: {
    marginBottom: spacing.p4,
  },
  presetPreviewText: {
    fontSize: 20,
    fontWeight: '700',
  },
  presetName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  lockIcon: {
    position: 'absolute',
    top: spacing.p6,
    right: spacing.p6,
  },
  activeBadge: {
    position: 'absolute',
    bottom: spacing.p6,
    right: spacing.p6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Controls
  controlGroup: {
    marginHorizontal: spacing.p16,
    marginBottom: spacing.p16,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.p8,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.p8,
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 3,
  },
  sliderLabel: {
    fontSize: 11,
    width: 30,
    textAlign: 'center',
  },
  stepButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.p8,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },

  // Font family
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.p10,
    paddingHorizontal: spacing.p12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing.p6,
  },
  optionText: {
    fontSize: 13,
  },

  // Reset
  resetButton: {
    marginHorizontal: spacing.p16,
    marginTop: spacing.p10,
    paddingVertical: spacing.p12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetText: {
    fontSize: 14,
  },
  premiumNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.p16,
    padding: spacing.p14,
    borderRadius: 10,
    borderWidth: 1,
    gap: spacing.p8,
  },
  premiumNudgeText: {
    fontSize: 13,
    flex: 1,
  },
});
