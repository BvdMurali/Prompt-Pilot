import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  NativeModules,
  ToastAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { processPromptApi } from '../services/api';
import { THEME } from '../constants/theme';
import Logo from './Logo';

// Storage keys must match those used in AuthContext.tsx
const TOKEN_KEY = 'pp_session_token';
const API_URL_KEY = 'pp_api_url';
const DEFAULT_API_URL = 'https://prompt-pilot-ochre.vercel.app';

const { FloatingBubbleModule } = NativeModules;

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'executive', label: 'Executive' },
  { value: 'technical', label: 'Technical' },
  { value: 'persuasive', label: 'Persuasive' }
];

const PLATFORMS = [
  { value: '', label: 'General AI' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'claude', label: 'Claude' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'deepseek', label: 'DeepSeek' }
];

export default function FloatingBubbleOverlay() {
  // This component runs in an isolated ReactRootView (separate from the main
  // app tree) so it has no access to AuthProvider. We read token + apiUrl
  // directly from SecureStore using the same keys AuthContext writes to.
  const [token, setToken] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);

  const [inputText, setInputText] = useState('');
  const [action, setAction] = useState<'optimize' | 'rewrite'>('rewrite');
  const [tone, setTone] = useState('professional');
  const [platform, setPlatform] = useState('');
  const [length, setLength] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null);

  // Load auth credentials from SecureStore on mount
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUrl] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(API_URL_KEY),
        ]);
        if (storedToken) setToken(storedToken);
        if (storedUrl) setApiUrl(storedUrl);
      } catch {
        // SecureStore unavailable — proceed without token (API will reject unauthenticated calls)
      }
    })();
  }, []);

  // Retrieve text from clipboard on mount
  useEffect(() => {
    if (FloatingBubbleModule && FloatingBubbleModule.getClipboardText) {
      FloatingBubbleModule.getClipboardText()
        .then((text: string) => {
          if (text && text.trim().length > 0) {
            setInputText(text);
          }
        })
        .catch(() => {
          // Fallback silently if clipboard reading fails
        });
    }
  }, []);

  const handleProcess = async () => {
    if (!inputText.trim()) {
      ToastAndroid.show('Please enter some text to process.', ToastAndroid.SHORT);
      return;
    }

    setLoading(true);
    setResult(null);
    setSelectedVariation(null);

    try {
      const payload = {
        text: inputText,
        action,
        tone: tone || undefined,
        platform: platform || undefined,
        length: length || undefined,
      };

      const data = await processPromptApi(apiUrl, token, payload);
      setResult(data);
    } catch (e: any) {
      ToastAndroid.show(e.message || 'API request failed.', ToastAndroid.LONG);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    const textToCopy = selectedVariation === null 
      ? result.improved_text 
      : result.variations[selectedVariation];

    if (FloatingBubbleModule && FloatingBubbleModule.setClipboardText) {
      await FloatingBubbleModule.setClipboardText(textToCopy);
      ToastAndroid.show('Optimized text copied! Paste it in your active app.', ToastAndroid.LONG);
    }
    
    // Minimize the overlay back into the floating bubble
    if (FloatingBubbleModule && FloatingBubbleModule.minimizeOverlay) {
      FloatingBubbleModule.minimizeOverlay();
    }
  };

  const handleMinimize = () => {
    if (FloatingBubbleModule && FloatingBubbleModule.minimizeOverlay) {
      FloatingBubbleModule.minimizeOverlay();
    }
  };

  const handleClose = () => {
    if (FloatingBubbleModule && FloatingBubbleModule.stopService) {
      FloatingBubbleModule.stopService();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Logo size={18} />
          <Text style={styles.headerTitle}>PromptPilot <Text style={styles.headerSubtitle}>Overlay</Text></Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleMinimize} style={styles.headerBtn} activeOpacity={0.7}>
            <Ionicons name="remove-circle-outline" size={20} color={THEME.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} style={styles.headerBtn} activeOpacity={0.7}>
            <Ionicons name="close-circle-outline" size={20} color={THEME.colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        {result ? (
          /* Output Screen */
          <View style={styles.resultContainer}>
            <View style={styles.scoreRow}>
              <Text style={styles.sectionLabel}>Processed Result</Text>
              {result.score?.overall && (
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreText}>Score: {result.score.overall}/100</Text>
                </View>
              )}
            </View>

            <View style={styles.textDisplayBox}>
              <ScrollView nestedScrollEnabled style={styles.textDisplayScroll}>
                <Text style={styles.displayText}>
                  {selectedVariation === null ? result.improved_text : result.variations[selectedVariation]}
                </Text>
              </ScrollView>
            </View>

            {/* Variations */}
            {result.variations && result.variations.length > 0 && (
              <View style={styles.variationsRow}>
                <TouchableOpacity
                  onPress={() => setSelectedVariation(null)}
                  style={[styles.variationTab, selectedVariation === null && styles.variationTabActive]}
                >
                  <Text style={[styles.variationText, selectedVariation === null && styles.variationTextActive]}>Default</Text>
                </TouchableOpacity>
                {result.variations.map((_: any, idx: number) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectedVariation(idx)}
                    style={[styles.variationTab, selectedVariation === idx && styles.variationTabActive]}
                  >
                    <Text style={[styles.variationText, selectedVariation === idx && styles.variationTextActive]}>
                      Opt {String.fromCharCode(65 + idx)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Explanations */}
            {result.explanations && result.explanations.length > 0 && (
              <View style={styles.explanationSection}>
                <Text style={styles.explanationTitle}>Adjustments Made:</Text>
                {result.explanations.slice(0, 2).map((exp: any, idx: number) => (
                  <View key={idx} style={styles.explanationItem}>
                    <Text style={styles.explanationAction}>• {exp.action}</Text>
                    <Text style={styles.explanationWhy}>{exp.why}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={() => setResult(null)} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Adjust Options</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleApply} style={styles.primaryBtn}>
                <Ionicons name="checkmark-sharp" size={16} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.primaryBtnText}>Copy & Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Form Options Setup Screen */
          <View style={styles.formContainer}>
            {/* Input area */}
            <View style={styles.textareaWrapper}>
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                multiline
                numberOfLines={4}
                placeholder="Type or paste draft to optimize..."
                placeholderTextColor={THEME.colors.textMuted}
                style={styles.textarea}
              />
              {inputText.length > 0 && (
                <TouchableOpacity onPress={() => setInputText('')} style={styles.clearInputBtn}>
                  <Ionicons name="close-circle" size={18} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Toggle Action */}
            <View style={styles.actionToggleRow}>
              <TouchableOpacity
                onPress={() => setAction('rewrite')}
                style={[styles.toggleOption, action === 'rewrite' && styles.toggleOptionActive]}
              >
                <Text style={[styles.toggleOptionText, action === 'rewrite' && styles.toggleOptionTextActive]}>Rewrite</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setAction('optimize')}
                style={[styles.toggleOption, action === 'optimize' && styles.toggleOptionActive]}
              >
                <Text style={[styles.toggleOptionText, action === 'optimize' && styles.toggleOptionTextActive]}>Optimize</Text>
              </TouchableOpacity>
            </View>

            {/* Options grid */}
            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={styles.dropdownLabel}>Tone</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelect}>
                  {TONES.map((t) => (
                    <TouchableOpacity
                      key={t.value}
                      onPress={() => setTone(t.value)}
                      style={[styles.chipsItem, tone === t.value && styles.chipsItemActive]}
                    >
                      <Text style={[styles.chipsText, tone === t.value && styles.chipsTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={styles.dropdownLabel}>Platform Optimization</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelect}>
                  {PLATFORMS.map((p) => (
                    <TouchableOpacity
                      key={p.value}
                      onPress={() => setPlatform(p.value)}
                      style={[styles.chipsItem, platform === p.value && styles.chipsItemActive]}
                    >
                      <Text style={[styles.chipsText, platform === p.value && styles.chipsTextActive]}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={styles.dropdownLabel}>Length Adjustment</Text>
                <View style={styles.lengthContainer}>
                  {['short', 'medium', 'long'].map((len) => (
                    <TouchableOpacity
                      key={len}
                      onPress={() => setLength(length === len ? '' : len)}
                      style={[styles.lengthBtn, length === len && styles.lengthBtnActive]}
                    >
                      <Text style={[styles.lengthText, length === len && styles.lengthTextActive]}>{len}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Action buttons */}
            <TouchableOpacity onPress={handleProcess} style={styles.submitBtn} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={14} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>
                    {action === 'optimize' ? 'Optimize Prompt' : 'Rewrite Text'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.roundness.lg,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.regular,
    color: THEME.colors.primaryLight,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    padding: 2,
  },
  content: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  scrollContent: {
    padding: THEME.spacing.md,
  },
  resultContainer: {
    gap: THEME.spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  scoreText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.primary,
  },
  textDisplayBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.roundness.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.sm,
    height: 140,
  },
  textDisplayScroll: {
    flex: 1,
  },
  displayText: {
    fontSize: 12,
    color: THEME.colors.textPrimary,
    lineHeight: 18,
    fontFamily: THEME.typography.fontFamily.sans,
  },
  variationsRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 4,
  },
  variationTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: '#FFFFFF',
  },
  variationTabActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
  },
  variationText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.typography.weights.medium,
  },
  variationTextActive: {
    color: THEME.colors.primary,
    fontWeight: THEME.typography.weights.bold,
  },
  explanationSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.roundness.md,
    padding: THEME.spacing.sm,
    gap: 4,
  },
  explanationTitle: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  explanationItem: {
    marginBottom: 4,
  },
  explanationAction: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.semibold,
    color: THEME.colors.textPrimary,
  },
  explanationWhy: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    paddingLeft: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
    marginTop: 8,
  },
  secondaryBtn: {
    flex: 1,
    height: 40,
    borderRadius: THEME.roundness.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.typography.weights.semibold,
  },
  primaryBtn: {
    flex: 1.2,
    height: 40,
    borderRadius: THEME.roundness.md,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  primaryBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: THEME.typography.weights.bold,
  },
  formContainer: {
    gap: THEME.spacing.md,
  },
  textareaWrapper: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.roundness.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  textarea: {
    minHeight: 100,
    padding: THEME.spacing.sm,
    paddingRight: 32,
    fontSize: 12,
    color: THEME.colors.textPrimary,
    textAlignVertical: 'top',
  },
  clearInputBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  actionToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleOptionActive: {
    backgroundColor: THEME.colors.primary,
  },
  toggleOptionText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.medium,
    color: THEME.colors.textSecondary,
  },
  toggleOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: THEME.typography.weights.bold,
  },
  gridRow: {
    gap: 4,
  },
  gridCol: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  horizontalSelect: {
    flexDirection: 'row',
  },
  chipsItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 99,
    marginRight: 6,
  },
  chipsItemActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
  },
  chipsText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  chipsTextActive: {
    color: THEME.colors.primary,
    fontWeight: THEME.typography.weights.bold,
  },
  lengthContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  lengthBtn: {
    flex: 1,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lengthBtnActive: {
    borderColor: THEME.colors.primaryLight,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
  },
  lengthText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    textTransform: 'capitalize',
  },
  lengthTextActive: {
    color: THEME.colors.primaryLight,
    fontWeight: THEME.typography.weights.bold,
  },
  submitBtn: {
    height: 42,
    borderRadius: THEME.roundness.md,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 4,
  },
  submitBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: THEME.typography.weights.bold,
  },
});
