import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  Clipboard,
  Alert,
  Keyboard,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { processPromptApi } from '../services/api';
import { THEME } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import CustomButton from '../components/CustomButton';
import ScoreGauge from '../components/ScoreGauge';
import VariationSwiper from '../components/VariationSwiper';

interface EditorScreenProps {
  preloadText?: string;
  onClearPreloadText?: () => void;
}

const TONES = [
  { value: '', label: 'Default' },
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
  { value: 'chatgpt', label: 'ChatGPT (GPT-4o)' },
  { value: 'claude', label: 'Claude (Sonnet 3.5)' },
  { value: 'gemini', label: 'Gemini (3.5 Flash)' },
  { value: 'deepseek', label: 'DeepSeek' }
];

export default function EditorScreen({ preloadText, onClearPreloadText }: EditorScreenProps) {
  const { apiUrl, token } = useAuth();
  const { addHistoryItem, savePrompt } = useDatabase();

  const [inputText, setInputText] = useState('');
  const [action, setAction] = useState<'optimize' | 'rewrite'>('optimize');
  const [tone, setTone] = useState('professional');
  const [platform, setPlatform] = useState('');
  const [length, setLength] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  
  // Modal visibility states
  const [showToneModal, setShowToneModal] = useState(false);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');

  React.useEffect(() => {
    if (preloadText) {
      setInputText(preloadText);
      if (onClearPreloadText) onClearPreloadText();
    }
  }, [preloadText]);

  const handleProcess = async () => {
    if (!inputText.trim()) {
      Alert.alert('Empty Input', 'Please type or paste some text to process.');
      return;
    }

    Keyboard.dismiss();
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
      
      // Update local execution logs context
      await addHistoryItem(inputText, data.improved_text, action, {
        score: data.score,
        explanations: data.explanations,
        variations: data.variations,
        suggestions: data.suggestions,
        tone,
        platform,
        length,
      });

    } catch (e: any) {
      Alert.alert('Processing Failed', e.message || 'API request failed. Verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', 'Text copied to system clipboard.');
  };

  const handleSavePrompt = () => {
    const defaultTitle = action === 'optimize' ? 'My Optimized Prompt' : 'My Improved Text';
    setPromptTitle(defaultTitle);
    setSaveModalVisible(true);
  };

  const confirmSavePrompt = async () => {
    if (!promptTitle.trim()) {
      Alert.alert('Error', 'Please enter a valid title.');
      return;
    }

    const textToSave = selectedVariation === null 
      ? result.improved_text 
      : result.variations[selectedVariation];

    try {
      await savePrompt(promptTitle.trim(), textToSave, action === 'optimize' ? 'Optimization' : 'Rewriting');
      setSaveModalVisible(false);
      Alert.alert('Saved', 'Prompt saved to your synced library.');
    } catch (e) {
      Alert.alert('Failed to Save', 'Could not save prompt to library.');
    }
  };

  const getActiveText = () => {
    if (!result) return '';
    return selectedVariation === null ? result.improved_text : result.variations[selectedVariation];
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {/* Action Selector */}
      <View style={styles.actionToggle}>
        <TouchableOpacity
          onPress={() => setAction('optimize')}
          style={[styles.toggleBtn, action === 'optimize' && styles.toggleBtnActive]}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleText, action === 'optimize' && styles.toggleTextActive]}>Optimize Prompt</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setAction('rewrite')}
          style={[styles.toggleBtn, action === 'rewrite' && styles.toggleBtnActive]}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleText, action === 'rewrite' && styles.toggleTextActive]}>Rewrite Text</Text>
        </TouchableOpacity>
      </View>

      {/* Main Input Textarea */}
      <View style={styles.textareaContainer}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          multiline
          numberOfLines={6}
          placeholder={
            action === 'optimize' 
              ? 'Draft a weak prompt instructions (e.g. write python function for fibonacci)...' 
              : 'Paste context message or email to polish grammar and tone...'
          }
          placeholderTextColor={THEME.colors.textMuted}
          style={styles.textarea}
        />
        {inputText.length > 0 && (
          <TouchableOpacity onPress={() => setInputText('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={20} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Advanced Options Toggle */}
      <TouchableOpacity 
        onPress={() => setShowOptions(!showOptions)} 
        style={styles.optionsToggle}
      >
        <Ionicons name={showOptions ? 'options' : 'options-outline'} size={16} color={THEME.colors.primaryLight} />
        <Text style={styles.optionsToggleText}>
          {showOptions ? 'Hide Refinement Options' : 'Configure Refinement Options'}
        </Text>
        <Ionicons name={showOptions ? 'chevron-up' : 'chevron-down'} size={14} color={THEME.colors.primaryLight} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {showOptions && (
        <GlassCard style={styles.optionsBox}>
          <View style={styles.optionRow}>
            <View style={styles.optionCol}>
              <Text style={styles.optionLabel}>Tone Modifier</Text>
              <TouchableOpacity
                onPress={() => setShowToneModal(true)}
                style={styles.dropdownTrigger}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownTriggerText}>
                  {TONES.find(t => t.value === tone)?.label || 'Default'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.optionCol}>
              <Text style={styles.optionLabel}>Target Platform</Text>
              <TouchableOpacity
                onPress={() => setShowPlatformModal(true)}
                style={styles.dropdownTrigger}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownTriggerText}>
                  {PLATFORMS.find(p => p.value === platform)?.label || 'General AI'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.optionRow, { marginTop: THEME.spacing.md }]}>
            <View style={styles.optionCol}>
              <Text style={styles.optionLabel}>Length Limit</Text>
              <View style={styles.lengthRow}>
                {['short', 'medium', 'long'].map((len) => (
                  <TouchableOpacity
                    key={len}
                    onPress={() => setLength(length === len ? '' : len)}
                    style={[
                      styles.lengthBtn,
                      length === len && styles.lengthBtnActive
                    ]}
                  >
                    <Text style={[
                      styles.lengthBtnText,
                      length === len && styles.lengthBtnTextActive
                    ]}>
                      {len}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </GlassCard>
      )}

      {/* Process Button */}
      <CustomButton
        title={action === 'optimize' ? 'Optimize Prompt' : 'Rewrite Text'}
        onPress={handleProcess}
        loading={loading}
        icon="sparkles"
        variant="gradient"
        style={styles.processBtn}
      />

      {/* Results Workspace */}
      {result && (
        <View style={styles.resultsWorkspace}>
          {/* Score overview */}
          {result.score && (
            <GlassCard>
              <ScoreGauge score={result.score.overall} breakdown={result.score} />
            </GlassCard>
          )}

          {/* Prompt Output with Variations Swiper */}
          <GlassCard style={styles.outputBox}>
            <VariationSwiper
              standardText={result.improved_text}
              variations={result.variations || []}
              selectedIndex={selectedVariation}
              onSelect={setSelectedVariation}
            />

            {/* Actions Row */}
            <View style={styles.actionRow}>
              <CustomButton
                title="Copy Text"
                onPress={() => handleCopy(getActiveText())}
                icon="copy-outline"
                variant="secondary"
                style={styles.actionBtn}
              />
              <CustomButton
                title="Save Library"
                onPress={handleSavePrompt}
                icon="save-outline"
                variant="gradient"
                style={styles.actionBtn}
              />
            </View>
          </GlassCard>

          {/* Explanation Step-by-Step */}
          {result.explanations && result.explanations.length > 0 && (
            <GlassCard>
              <Text style={styles.explanationTitle}>Adjustments Made</Text>
              {result.explanations.map((exp: any, idx: number) => (
                <View key={idx} style={styles.explanationItem}>
                  <View style={styles.explanationHeader}>
                    <View style={styles.bulletNumber}>
                      <Text style={styles.bulletText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.explanationAction}>{exp.action}</Text>
                  </View>
                  <View style={styles.explanationContent}>
                    <Text style={styles.explanationText}>
                      <Text style={styles.boldLabel}>Why: </Text>{exp.why}
                    </Text>
                    <Text style={[styles.explanationText, { marginTop: 4 }]}>
                      <Text style={styles.boldLabel}>How: </Text>{exp.how}
                    </Text>
                  </View>
                </View>
              ))}
            </GlassCard>
          )}
        </View>
      )}

      {/* Tone Selection Bottom Sheet */}
      <Modal
        visible={showToneModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowToneModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowToneModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Tone</Text>
                  <TouchableOpacity onPress={() => setShowToneModal(false)}>
                    <Ionicons name="close" size={20} color={THEME.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                  {TONES.map((t) => {
                    const isSelected = tone === t.value;
                    return (
                      <TouchableOpacity
                        key={t.value}
                        onPress={() => {
                          setTone(t.value);
                          setShowToneModal(false);
                        }}
                        style={styles.modalItem}
                      >
                        <Text style={[
                          styles.modalItemText,
                          isSelected && styles.modalItemTextActive
                        ]}>
                          {t.label}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark" size={18} color={THEME.colors.primaryLight} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Platform Selection Bottom Sheet */}
      <Modal
        visible={showPlatformModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlatformModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowPlatformModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Target Platform</Text>
                  <TouchableOpacity onPress={() => setShowPlatformModal(false)}>
                    <Ionicons name="close" size={20} color={THEME.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                  {PLATFORMS.map((p) => {
                    const isSelected = platform === p.value;
                    return (
                      <TouchableOpacity
                        key={p.value}
                        onPress={() => {
                          setPlatform(p.value);
                          setShowPlatformModal(false);
                        }}
                        style={styles.modalItem}
                      >
                        <Text style={[
                          styles.modalItemText,
                          isSelected && styles.modalItemTextActive
                        ]}>
                          {p.label}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark" size={18} color={THEME.colors.primaryLight} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Save to Library Modal */}
      <Modal
        visible={saveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSaveModalVisible(false)}>
          <View style={styles.modalCenteredOverlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ width: '100%', alignItems: 'center' }}
              >
                <GlassCard style={styles.saveModalBox}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Save to Library</Text>
                    <TouchableOpacity onPress={() => setSaveModalVisible(false)}>
                      <Ionicons name="close" size={20} color={THEME.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.saveModalBody}>
                    <Text style={styles.saveModalLabel}>Prompt Title</Text>
                    <TextInput
                      value={promptTitle}
                      onChangeText={setPromptTitle}
                      placeholder="Enter a title..."
                      placeholderTextColor={THEME.colors.textMuted}
                      autoFocus
                      style={styles.saveModalInput}
                    />
                  </View>

                  <View style={styles.saveModalActions}>
                    <CustomButton
                      title="Cancel"
                      onPress={() => setSaveModalVisible(false)}
                      variant="secondary"
                      style={styles.saveModalBtn}
                    />
                    <CustomButton
                      title="Save"
                      onPress={confirmSavePrompt}
                      variant="gradient"
                      style={styles.saveModalBtn}
                    />
                  </View>
                </GlassCard>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 40,
  },
  actionToggle: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    padding: 4,
    borderRadius: THEME.roundness.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.lg,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: THEME.spacing.sm + 2,
    alignItems: 'center',
    borderRadius: THEME.roundness.md,
  },
  toggleBtnActive: {
    backgroundColor: THEME.colors.primary,
  },
  toggleText: {
    color: THEME.colors.textSecondary,
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.medium,
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: THEME.typography.weights.bold,
  },
  textareaContainer: {
    position: 'relative',
    marginBottom: THEME.spacing.lg,
  },
  textarea: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.roundness.lg,
    padding: THEME.spacing.lg,
    fontSize: THEME.typography.sizes.md,
    color: THEME.colors.textPrimary,
    minHeight: 160,
    textAlignVertical: 'top',
  },
  clearBtn: {
    position: 'absolute',
    top: THEME.spacing.sm,
    right: THEME.spacing.sm,
  },
  optionsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
    paddingVertical: THEME.spacing.sm,
    marginBottom: THEME.spacing.lg,
  },
  optionsToggleText: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.primaryLight,
    fontWeight: THEME.typography.weights.semibold,
  },
  optionsBox: {
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
    marginTop: -THEME.spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
  },
  optionCol: {
    flex: 1,
  },
  optionLabel: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    fontWeight: THEME.typography.weights.bold,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  optionInput: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.roundness.md,
    height: 40,
    paddingHorizontal: THEME.spacing.md,
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.sm,
  },
  dropdownTrigger: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.roundness.md,
    height: 40,
    paddingHorizontal: THEME.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownTriggerText: {
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: THEME.roundness.xl,
    borderTopRightRadius: THEME.roundness.xl,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    maxHeight: '50%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  modalTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  modalScroll: {
    paddingHorizontal: THEME.spacing.lg,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
  },
  modalItemText: {
    color: THEME.colors.textSecondary,
    fontSize: THEME.typography.sizes.md,
  },
  modalItemTextActive: {
    color: THEME.colors.primaryLight,
    fontWeight: THEME.typography.weights.bold,
  },
  lengthRow: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
  lengthBtn: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.roundness.md,
  },
  lengthBtnActive: {
    borderColor: THEME.colors.primaryLight,
    backgroundColor: 'rgba(129, 140, 248, 0.05)',
  },
  lengthBtnText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    textTransform: 'capitalize',
  },
  lengthBtnTextActive: {
    color: THEME.colors.primaryLight,
    fontWeight: THEME.typography.weights.bold,
  },
  processBtn: {
    marginBottom: THEME.spacing.xl,
  },
  resultsWorkspace: {
    gap: THEME.spacing.lg,
  },
  outputBox: {
    paddingBottom: THEME.spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginTop: THEME.spacing.lg,
  },
  actionBtn: {
    flex: 1,
  },
  explanationTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingBottom: 8,
  },
  explanationItem: {
    marginBottom: THEME.spacing.lg,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
    marginBottom: 6,
  },
  bulletNumber: {
    width: 22,
    height: 22,
    borderRadius: THEME.roundness.full,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderWidth: 1,
    borderColor: THEME.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulletText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.primaryLight,
  },
  explanationAction: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  explanationContent: {
    paddingLeft: 30,
  },
  explanationText: {
    fontSize: THEME.typography.sizes.xs + 1,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  boldLabel: {
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  modalCenteredOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  saveModalBox: {
    width: '90%',
    maxWidth: 360,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  saveModalBody: {
    marginVertical: THEME.spacing.lg,
    gap: 8,
  },
  saveModalLabel: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    fontWeight: THEME.typography.weights.bold,
    textTransform: 'uppercase',
  },
  saveModalInput: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.roundness.md,
    height: 44,
    paddingHorizontal: THEME.spacing.md,
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.sm,
  },
  saveModalActions: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
  },
  saveModalBtn: {
    flex: 1,
  },
});
