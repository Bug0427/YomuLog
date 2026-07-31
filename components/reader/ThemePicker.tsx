// components/reader/ThemePicker.tsx
// Premium-gated reader theme picker — accessible from reader toolbar and Settings.
// Shows 5 preset cards, brightness slider, font size control, real-time preview.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { useReaderTheme, type ReaderThemePreset } from '../../context/ReaderThemeContext';
import { usePremium } from '../../context/PremiumContext';
import { useTheme } from '../../context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors as tokens } from '../../styles/tokens';
import PremiumUpgradeModal from '../layout/PremiumUpgradeModal';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = 10;
const CARD_W = (SCREEN_W - 48 - CARD_GAP) / 2;

// ─── Props ────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  /** If true, renders as an inline section (for Settings), not a modal */
  inline?: boolean;
}

export default function ThemePicker({ visible, onClose, inline }: Props) {
  const { preset, presets, activeConfig, brightness, fontSize, setPreset, setBrightness, setFontSize } =
    useReaderTheme();
  const { isPremium } = usePremium();
  const { colors: theme } = useTheme();
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const handlePresetPress = useCallback(
    (p: ReaderThemePreset, requiresPremium: boolean) => {
      if (requiresPremium && !isPremium) {
        setShowPremiumModal(true);
        return;
      }
      setPreset(p);
    },
    [isPremium, setPreset],
  );

  const brightnessPercent = Math.round(brightness * 100);

  const renderPresetCard = (cfg: (typeof presets)[number]) => {
    const isActive = cfg.preset === preset;
    const isLocked = cfg.isPremium && !isPremium;
    return (
      <Pressable
        key={cfg.preset}
        style={[
          styles.card,
          {
            width: CARD_W,
            backgroundColor: cfg.bg,
            borderColor: isActive ? theme.accent : theme.border,
            borderWidth: isActive ? 2 : StyleSheet.hairlineWidth,
            opacity: isLocked ? 0.6 : 1,
          },
        ]}
        onPress={() => handlePresetPress(cfg.preset, cfg.isPremium)}
      >
        {/* Colour swatch */}
        <View style={[styles.cardSwatch, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.cardSwatchText, { color: cfg.text }]}>Aa</Text>
        </View>
        {/* Label row */}
        <View style={styles.cardLabelRow}>
          <Text style={[styles.cardLabel, { color: cfg.text }]}>
            {cfg.icon} {cfg.label}
          </Text>
          {isActive && (
            <MaterialCommunityIcons name="check-circle" size={16} color={theme.success} />
          )}
          {isLocked && (
            <MaterialCommunityIcons name="lock" size={14} color={cfg.text} />
          )}
        </View>
      </Pressable>
    );
  };

  const content = (
    <View style={[styles.inner, inline && styles.inlineInner]}>
      {/* Header */}
      {!inline && (
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Reader Theme</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={22} color={theme.textPrimary} />
          </Pressable>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Active preview */}
        <View style={[styles.previewBox, { backgroundColor: activeConfig.bg }]}>
          <Text style={[styles.previewText, { color: activeConfig.text, fontSize }]}>
            {activeConfig.icon} {activeConfig.label} — Preview
          </Text>
          <Text style={[styles.previewSub, { color: activeConfig.text, fontSize: Math.max(11, fontSize - 2) }]}>
            The quick brown fox jumps over the lazy dog.
          </Text>
        </View>

        {/* Preset grid */}
        <View style={styles.presetGrid}>
          {presets.map(renderPresetCard)}
        </View>

        {/* Brightness slider */}
        <View style={styles.sliderSection}>
          <View style={styles.sliderLabelRow}>
            <MaterialCommunityIcons name="brightness-6" size={18} color={theme.textSecondary} />
            <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>Brightness</Text>
            <Text style={[styles.sliderValue, { color: theme.textMuted }]}>{brightnessPercent}%</Text>
          </View>
          <BrightnessSlider value={brightness} onChange={setBrightness} theme={theme} />
        </View>

        {/* Font size control */}
        <View style={styles.sliderSection}>
          <View style={styles.sliderLabelRow}>
            <MaterialCommunityIcons name="format-font-size-increase" size={18} color={theme.textSecondary} />
            <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>Font Size</Text>
            <Text style={[styles.sliderValue, { color: theme.textMuted }]}>{fontSize}pt</Text>
          </View>
          <View style={styles.fontSizeRow}>
            <Pressable
              onPress={() => setFontSize(fontSize - 1)}
              disabled={fontSize <= 12}
              style={[styles.fontBtn, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
            >
              <Text style={[styles.fontBtnText, { color: theme.textPrimary }]}>A-</Text>
            </Pressable>
            <View style={[styles.fontSizeBar, { backgroundColor: theme.border }]}>
              <View style={[styles.fontSizeFill, { backgroundColor: theme.accent, width: `${((fontSize - 12) / 12) * 100}%` }]} />
            </View>
            <Pressable
              onPress={() => setFontSize(fontSize + 1)}
              disabled={fontSize >= 24}
              style={[styles.fontBtn, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
            >
              <Text style={[styles.fontBtnText, { color: theme.textPrimary }]}>A+</Text>
            </Pressable>
          </View>
        </View>

        {/* Premium upsell for free users */}
        {!isPremium && (
          <View style={[styles.upsellBox, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <MaterialCommunityIcons name="crown" size={18} color={tokens.splashText} />
            <Text style={[styles.upsellText, { color: theme.textSecondary }]}>
              Upgrade to Premium to unlock Night and Mint themes
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Premium upgrade modal */}
      <PremiumUpgradeModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />
    </View>
  );

  // Inline mode — no modal wrapper (for SettingsScreen)
  if (inline) return content;

  // Fullscreen modal (for ReaderScreen toolbar)
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.modal, { backgroundColor: theme.bg }]}>
              {content}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Brightness Slider ────────────────────────────────────────────────

function BrightnessSlider({
  value,
  onChange,
  theme,
}: {
  value: number;
  onChange: (v: number) => void;
  theme: any;
}) {
  const steps = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  const activeIdx = steps.indexOf(value) >= 0 ? steps.indexOf(value) : steps.length - 1;

  return (
    <View style={styles.brightnessRow}>
      <MaterialCommunityIcons name="brightness-5" size={14} color={theme.textMuted} />
      {steps.map((s, i) => (
        <Pressable
          key={i}
          onPress={() => onChange(s)}
          style={[
            styles.brightnessDot,
            {
              backgroundColor: i <= activeIdx ? theme.accent : theme.border,
              width: i === activeIdx ? 14 : 10,
              height: i === activeIdx ? 14 : 10,
            },
          ]}
        />
      ))}
      <MaterialCommunityIcons name="brightness-7" size={16} color={theme.textPrimary} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { height: '72%', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  inner: { flex: 1, paddingHorizontal: 16 },
  inlineInner: { flex: 0, paddingHorizontal: 0 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  previewBox: {
    marginVertical: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  previewText: { fontWeight: '600', marginBottom: 6 },
  previewSub: { opacity: 0.7 },

  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: CARD_GAP,
    marginBottom: 16,
  },
  card: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 4,
  },
  cardSwatch: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardSwatchText: { fontSize: 18, fontWeight: '700' },
  cardLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  cardLabel: { fontSize: 12, fontWeight: '600' },

  sliderSection: {
    marginBottom: 20,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sliderLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  sliderValue: { fontSize: 12, fontWeight: '500' },

  brightnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    height: 32,
  },
  brightnessDot: {
    borderRadius: 20,
    minWidth: 8,
    minHeight: 8,
  },

  fontSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fontBtn: {
    width: 40,
    height: 34,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontBtnText: { fontSize: 14, fontWeight: '700' },
  fontSizeBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fontSizeFill: {
    height: '100%',
    borderRadius: 3,
  },

  upsellBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 24,
  },
  upsellText: { fontSize: 12, flex: 1 },
});
