import React, { useState, useRef } from 'react';
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
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { processPromptApi, AIResultV2, scoreNum } from '../services/api';
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
  { value: 'gemini', label: 'Gemini (2.5 Flash)' },
  { value: 'deepseek', label: 'DeepSeek' }
];

const PIPELINE_STAGES = [
  'Intent Detection',
  'Domain Detection',
  'Ambiguity Check',
  'Context Sufficiency',
  'Safety Review',
  'Confidence Score',
];

export default function EditorScreen({ preloadText, onClearPreloadText }: EditorScreenProps) {
  const { apiUrl, token } = useAuth();
  const { addHistoryItem, savePrompt } = useDatabase();
  const scrollViewRef = useRef<ScrollView>(null);

  const [inputText, setInputText] = useState('');
  const [action, setAction] = useState<'optimize' | 'rewrite'>('optimize');
  const [tone, setTone] = useState('professional');
  const [platform, setPlatform] = useState('');
  const [length, setLength] = useState('');

  const [loading, setLoading] = useState(false);
  const [pipelineStage, setPipelineStage] = useState(0);
  const [result, setResult] = useState<AIResultV2 | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null);
  const [showOptions, setShowOptions] = useState(true);

  // Clarification state
  const [clarificationAnswers, setClarificationAnswers] = useState<string[]>([]);

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

  // Pipeline stage animator
  React.useEffect(() => {
    if (!loading) { setPipelineStage(0); return; }
    let stage = 0;
    const interval = setInterval(() => {
      stage = Math.min(stage + 1, PIPELINE_STAGES.length - 1);
      setPipelineStage(stage);
    }, 900);
    return () => clearInterval(interval);
  }, [loading]);

  // ─── Core API call ──────────────────────────────────────────────────────────
  const submitRequest = async (text: string) => {
    Keyboard.dismiss();
    setLoading(true);
    setResult(null);
    setSelectedVariation(null);
    setShowOptions(false);
    setClarificationAnswers([]);

    try {
      const data = await processPromptApi(apiUrl, token, {
        text,
        action,
        tone: tone || undefined,
        platform: platform || undefined,
        length: length || undefined,
        version: 'v2',
      });

      setResult(data);

      // Only add to history on successful optimizations
      if (data.status === 'optimized' && data.optimized_text) {
        await addHistoryItem(inputText, data.optimized_text, action, {
          score: data.score,
          explanations: data.explanations,
          variations: data.variations,
          suggestions: data.suggestions,
          tone,
          platform,
          length,
          v2_status: data.status,
          confidence: data.confidence,
          intent: data.intent,
          domain: data.domain,
        });
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }

    } catch (e: any) {
      Alert.alert('Processing Failed', e.message || 'API request failed. Verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!inputText.trim()) {
      Alert.alert('Empty Input', 'Please type or paste some text to process.');
      return;
    }
    await submitRequest(inputText);
  };

  const handleReoptimizeWithAnswers = async () => {
    if (!result?.questions) return;
    const clarificationContext = result.questions
      .map((q, i) => `Q: ${q}\nA: ${clarificationAnswers[i] || '(not answered)'}`)
      .join('\n\n');
    const enrichedText = `${inputText}\n\n--- Clarification Context ---\n${clarificationContext}`;
    setShowOptions(false);
    await submitRequest(enrichedText);
  };

  // ─── Other handlers ─────────────────────────────────────────────────────────
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
    if (!promptTitle.trim()) { Alert.alert('Error', 'Please enter a valid title.'); return; }
    const textToSave = selectedVariation === null
      ? (result?.optimized_text ?? '')
      : (result?.variations?.[selectedVariation] ?? '');
    try {
      await savePrompt(promptTitle.trim(), textToSave, action === 'optimize' ? 'Optimization' : 'Rewriting');
      setSaveModalVisible(false);
      Alert.alert('Saved', 'Prompt saved to your synced library.');
    } catch (e) {
      Alert.alert('Failed to Save', 'Could not save prompt to library.');
    }
  };

  const getActiveText = () => {
    if (!result || result.status !== 'optimized') return '';
    return selectedVariation === null
      ? (result.optimized_text ?? '')
      : (result.variations?.[selectedVariation] ?? '');
  };

  // ─── Score adapter for ScoreGauge (expects V1 flat numbers) ─────────────────
  const adaptScoreForGauge = (score: AIResultV2['score']) => {
    if (!score) return null;
    return {
      overall: scoreNum(score.overall),
      clarity: scoreNum(score.clarity),
      context: scoreNum(score.context),
      constraints: scoreNum(score.constraints),
      structure: scoreNum(score.structure),
      specificity: scoreNum(score.specificity),
    };
  };

  return (
    <ScrollView ref={scrollViewRef} style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

      {/* Action Selector */}
      <View style={styles.actionToggle}>
        <TouchableOpacity onPress={() => setAction('optimize')} style={[styles.toggleBtn, action === 'optimize' && styles.toggleBtnActive]} activeOpacity={0.8}>
          <Text style={[styles.toggleText, action === 'optimize' && styles.toggleTextActive]}>Optimize Prompt</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAction('rewrite')} style={[styles.toggleBtn, action === 'rewrite' && styles.toggleBtnActive]} activeOpacity={0.8}>
          <Text style={[styles.toggleText, action === 'rewrite' && styles.toggleTextActive]}>Rewrite Text</Text>
        </TouchableOpacity>
      </View>

      {/* Main Input */}
      <View style={styles.textareaContainer}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          multiline
          numberOfLines={6}
          placeholder={
            action === 'optimize'
              ? 'Draft a weak prompt (e.g. write python function for fibonacci)...'
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
      <TouchableOpacity onPress={() => setShowOptions(!showOptions)} style={styles.optionsToggle}>
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
              <TouchableOpacity onPress={() => setShowToneModal(true)} style={styles.dropdownTrigger} activeOpacity={0.8}>
                <Text style={styles.dropdownTriggerText}>{TONES.find(t => t.value === tone)?.label || 'Default'}</Text>
                <Ionicons name="chevron-down" size={14} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.optionCol}>
              <Text style={styles.optionLabel}>Target Platform</Text>
              <TouchableOpacity onPress={() => setShowPlatformModal(true)} style={styles.dropdownTrigger} activeOpacity={0.8}>
                <Text style={styles.dropdownTriggerText}>{PLATFORMS.find(p => p.value === platform)?.label || 'General AI'}</Text>
                <Ionicons name="chevron-down" size={14} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.optionRow, { marginTop: THEME.spacing.md }]}>
            <View style={styles.optionCol}>
              <Text style={styles.optionLabel}>Length Limit</Text>
              <View style={styles.lengthRow}>
                {['short', 'medium', 'long'].map((len) => (
                  <TouchableOpacity key={len} onPress={() => setLength(length === len ? '' : len)}
                    style={[styles.lengthBtn, length === len && styles.lengthBtnActive]}>
                    <Text style={[styles.lengthBtnText, length === len && styles.lengthBtnTextActive]}>{len}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </GlassCard>
      )}

      {/* Process Button */}
      <CustomButton
        title={action === 'optimize' ? 'Run V2 Pipeline' : 'Rewrite Text'}
        onPress={handleProcess}
        loading={loading}
        icon="sparkles"
        variant="gradient"
        style={styles.processBtn}
      />

      {/* ─── LOADING: Pipeline Stepper ────────────────────────────────────── */}
      {loading && (
        <GlassCard style={styles.pipelineCard}>
          <Text style={styles.pipelineTitle}>V2 Intelligence Pipeline Running</Text>
          {PIPELINE_STAGES.map((stage, idx) => {
            const isActive = idx === pipelineStage;
            const isDone = idx < pipelineStage;
            return (
              <View key={stage} style={[styles.pipelineRow, isActive && styles.pipelineRowActive, isDone && styles.pipelineRowDone]}>
                <View style={[styles.pipelineDot, isActive && styles.pipelineDotActive, isDone && styles.pipelineDotDone]}>
                  {isDone && <Ionicons name="checkmark" size={10} color="#fff" />}
                  {isActive && <ActivityIndicator size="small" color="#fff" style={{ transform: [{ scale: 0.6 }] }} />}
                </View>
                <Text style={[styles.pipelineLabel, isActive && styles.pipelineLabelActive, isDone && styles.pipelineLabelDone]}>
                  {stage}
                </Text>
                {isActive && <Text style={styles.pipelineDesc}>Analyzing…</Text>}
              </View>
            );
          })}
        </GlassCard>
      )}

      {/* ─── RESULT: Clarification ────────────────────────────────────────── */}
      {!loading && result?.status === 'needs_clarification' && (
        <View style={styles.resultsWorkspace}>
          <GlassCard style={styles.clarificationCard}>
            {/* Header */}
            <View style={styles.clarificationHeader}>
              <View style={styles.clarificationIconWrap}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#d97706" />
              </View>
              <View style={{ flex: 1, marginLeft: THEME.spacing.sm }}>
                <Text style={styles.clarificationTitle}>More context needed</Text>
                <Text style={styles.clarificationSubtitle}>
                  The V2 pipeline needs more info before it can optimize safely.
                </Text>
              </View>
              <View style={[styles.confidenceBadge, { backgroundColor: result.confidence >= 65 ? '#ecfdf5' : '#fffbeb', borderColor: result.confidence >= 65 ? '#a7f3d0' : '#fcd34d' }]}>
                <Text style={[styles.confidenceText, { color: result.confidence >= 65 ? '#059669' : '#d97706' }]}>
                  {result.confidence}%
                </Text>
              </View>
            </View>

            {/* Tags */}
            {(result.intent || result.domain) && (
              <View style={styles.tagsRow}>
                {result.intent && (
                  <View style={styles.tagChip}>
                    <Text style={styles.tagChipText}>Intent: {result.intent}</Text>
                  </View>
                )}
                {result.domain && (
                  <View style={[styles.tagChip, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }]}>
                    <Text style={[styles.tagChipText, { color: '#4338ca' }]}>Domain: {result.domain}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Questions */}
            {(result.questions || []).map((question, idx) => (
              <View key={idx} style={styles.questionBlock}>
                <View style={styles.questionHeader}>
                  <View style={styles.questionNumber}>
                    <Text style={styles.questionNumberText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.questionText}>{question}</Text>
                </View>
                <TextInput
                  value={clarificationAnswers[idx] || ''}
                  onChangeText={(val) => {
                    const updated = [...clarificationAnswers];
                    updated[idx] = val;
                    setClarificationAnswers(updated);
                  }}
                  placeholder="Your answer…"
                  placeholderTextColor={THEME.colors.textMuted}
                  multiline
                  numberOfLines={2}
                  style={styles.answerInput}
                />
              </View>
            ))}

            <CustomButton
              title="Answer & Re-optimize"
              onPress={handleReoptimizeWithAnswers}
              icon="sparkles"
              variant="gradient"
              style={{ marginTop: THEME.spacing.md }}
            />
            <CustomButton
              title="Back to input"
              onPress={() => { setResult(null); setShowOptions(true); }}
              variant="secondary"
              style={{ marginTop: THEME.spacing.sm }}
            />
          </GlassCard>
        </View>
      )}

      {/* ─── RESULT: Rejected ─────────────────────────────────────────────── */}
      {!loading && result?.status === 'rejected' && (
        <View style={styles.resultsWorkspace}>
          <GlassCard style={styles.rejectionCard}>
            <View style={styles.rejectionHeader}>
              <Ionicons name="close-circle" size={22} color="#dc2626" />
              <View style={{ flex: 1, marginLeft: THEME.spacing.sm }}>
                <Text style={styles.rejectionTitle}>Request could not be processed</Text>
                <Text style={styles.rejectionDesc}>
                  {result.reason || 'This request contains content that violates our usage policy.'}
                </Text>
              </View>
            </View>
            <CustomButton
              title="Clear & Retry"
              onPress={() => { setResult(null); setShowOptions(true); }}
              icon="refresh-outline"
              variant="secondary"
              style={{ marginTop: THEME.spacing.md }}
            />
          </GlassCard>
        </View>
      )}

      {/* ─── RESULT: Optimized ────────────────────────────────────────────── */}
      {!loading && result?.status === 'optimized' && (
        <View style={styles.resultsWorkspace}>

          {/* V2 Meta Tags */}
          {(result.intent || result.domain || result.confidence != null) && (
            <View style={styles.tagsRow}>
              {result.intent && (
                <View style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{result.intent}</Text>
                </View>
              )}
              {result.domain && (
                <View style={[styles.tagChip, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }]}>
                  <Text style={[styles.tagChipText, { color: '#4338ca' }]}>{result.domain}</Text>
                </View>
              )}
              {result.confidence != null && (
                <View style={[styles.tagChip, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
                  <Text style={[styles.tagChipText, { color: '#059669' }]}>{result.confidence}% confidence</Text>
                </View>
              )}
            </View>
          )}

          {/* Score Gauge */}
          {result.score && (
            <GlassCard>
              <ScoreGauge score={scoreNum(result.score.overall)} breakdown={adaptScoreForGauge(result.score)} />
            </GlassCard>
          )}

          {/* Improvements */}
          {result.improvements && result.improvements.length > 0 && (
            <GlassCard>
              <Text style={styles.explanationTitle}>Improvements Made</Text>
              <View style={styles.improvementsRow}>
                {result.improvements.map((imp, i) => (
                  <View key={i} style={styles.improvementChip}>
                    <Text style={styles.improvementChipText}>{imp}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          )}

          {/* Output + Variations */}
          <GlassCard style={styles.outputBox}>
            <VariationSwiper
              standardText={result.optimized_text ?? ''}
              variations={result.variations || []}
              selectedIndex={selectedVariation}
              onSelect={setSelectedVariation}
            />

            <View style={styles.actionRow}>
              <CustomButton title="Copy Text" onPress={() => handleCopy(getActiveText())} icon="copy-outline" variant="secondary" style={styles.actionBtn} />
              <CustomButton title="Save Library" onPress={handleSavePrompt} icon="save-outline" variant="gradient" style={styles.actionBtn} />
            </View>
          </GlassCard>

          {/* Explanations */}
          {result.explanations && result.explanations.length > 0 && (
            <GlassCard>
              <Text style={styles.explanationTitle}>Adjustments Made</Text>
              {result.explanations.map((exp, idx) => (
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

      {/* ─── Tone Modal ──────────────────────────────────────────────────── */}
      <Modal visible={showToneModal} transparent animationType="slide" onRequestClose={() => setShowToneModal(false)}>
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
                      <TouchableOpacity key={t.value} onPress={() => { setTone(t.value); setShowToneModal(false); }} style={styles.modalItem}>
                        <Text style={[styles.modalItemText, isSelected && styles.modalItemTextActive]}>{t.label}</Text>
                        {isSelected && <Ionicons name="checkmark" size={18} color={THEME.colors.primaryLight} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ─── Platform Modal ───────────────────────────────────────────────── */}
      <Modal visible={showPlatformModal} transparent animationType="slide" onRequestClose={() => setShowPlatformModal(false)}>
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
                      <TouchableOpacity key={p.value} onPress={() => { setPlatform(p.value); setShowPlatformModal(false); }} style={styles.modalItem}>
                        <Text style={[styles.modalItemText, isSelected && styles.modalItemTextActive]}>{p.label}</Text>
                        {isSelected && <Ionicons name="checkmark" size={18} color={THEME.colors.primaryLight} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ─── Save to Library Modal ────────────────────────────────────────── */}
      <Modal visible={saveModalVisible} transparent animationType="fade" onRequestClose={() => setSaveModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setSaveModalVisible(false)}>
          <View style={styles.modalCenteredOverlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', alignItems: 'center' }}>
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
                    <CustomButton title="Cancel" onPress={() => setSaveModalVisible(false)} variant="secondary" style={styles.saveModalBtn} />
                    <CustomButton title="Save" onPress={confirmSavePrompt} variant="gradient" style={styles.saveModalBtn} />
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
  container: { flex: 1, backgroundColor: THEME.colors.background },
  scrollContent: { padding: THEME.spacing.lg, paddingBottom: 40 },
  actionToggle: { flexDirection: 'row', backgroundColor: THEME.colors.surface, padding: 4, borderRadius: THEME.roundness.lg, borderWidth: 1, borderColor: THEME.colors.border, marginBottom: THEME.spacing.lg },
  toggleBtn: { flex: 1, paddingVertical: THEME.spacing.sm + 2, alignItems: 'center', borderRadius: THEME.roundness.md },
  toggleBtnActive: { backgroundColor: THEME.colors.primary },
  toggleText: { color: THEME.colors.textSecondary, fontSize: THEME.typography.sizes.sm, fontWeight: THEME.typography.weights.medium },
  toggleTextActive: { color: '#fff', fontWeight: THEME.typography.weights.bold },
  textareaContainer: { position: 'relative', marginBottom: THEME.spacing.lg },
  textarea: { backgroundColor: THEME.colors.surface, borderColor: THEME.colors.border, borderWidth: 1, borderRadius: THEME.roundness.lg, padding: THEME.spacing.lg, fontSize: THEME.typography.sizes.md, color: THEME.colors.textPrimary, minHeight: 160, textAlignVertical: 'top' },
  clearBtn: { position: 'absolute', top: THEME.spacing.sm, right: THEME.spacing.sm },
  optionsToggle: { flexDirection: 'row', alignItems: 'center', gap: THEME.spacing.sm, paddingVertical: THEME.spacing.sm, marginBottom: THEME.spacing.lg },
  optionsToggleText: { fontSize: THEME.typography.sizes.sm, color: THEME.colors.primaryLight, fontWeight: THEME.typography.weights.semibold },
  optionsBox: { padding: THEME.spacing.md, marginBottom: THEME.spacing.lg, marginTop: -THEME.spacing.sm },
  optionRow: { flexDirection: 'row', gap: THEME.spacing.md },
  optionCol: { flex: 1 },
  optionLabel: { fontSize: THEME.typography.sizes.xs, color: THEME.colors.textMuted, fontWeight: THEME.typography.weights.bold, textTransform: 'uppercase', marginBottom: 6 },
  dropdownTrigger: { backgroundColor: THEME.colors.surface, borderColor: THEME.colors.border, borderWidth: 1, borderRadius: THEME.roundness.md, height: 40, paddingHorizontal: THEME.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownTriggerText: { color: THEME.colors.textPrimary, fontSize: THEME.typography.sizes.sm },
  lengthRow: { flexDirection: 'row', gap: THEME.spacing.sm },
  lengthBtn: { flex: 1, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.colors.surface, borderColor: THEME.colors.border, borderWidth: 1, borderRadius: THEME.roundness.md },
  lengthBtnActive: { borderColor: THEME.colors.primaryLight, backgroundColor: 'rgba(129, 140, 248, 0.05)' },
  lengthBtnText: { fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary, textTransform: 'capitalize' },
  lengthBtnTextActive: { color: THEME.colors.primaryLight, fontWeight: THEME.typography.weights.bold },
  processBtn: { marginBottom: THEME.spacing.xl },
  resultsWorkspace: { gap: THEME.spacing.lg },
  outputBox: { paddingBottom: THEME.spacing.md },
  actionRow: { flexDirection: 'row', gap: THEME.spacing.md, marginTop: THEME.spacing.lg },
  actionBtn: { flex: 1 },

  // Pipeline
  pipelineCard: { padding: THEME.spacing.lg, marginBottom: THEME.spacing.lg },
  pipelineTitle: { fontSize: THEME.typography.sizes.xs, fontWeight: THEME.typography.weights.bold, color: THEME.colors.textMuted, textTransform: 'uppercase', marginBottom: THEME.spacing.md },
  pipelineRow: { flexDirection: 'row', alignItems: 'center', gap: THEME.spacing.sm, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, marginBottom: 4, opacity: 0.4, backgroundColor: THEME.colors.surface, borderWidth: 1, borderColor: THEME.colors.border },
  pipelineRowActive: { opacity: 1, backgroundColor: 'rgba(124,58,237,0.06)', borderColor: '#ddd6fe' },
  pipelineRowDone: { opacity: 1, backgroundColor: 'rgba(5,150,105,0.06)', borderColor: '#a7f3d0' },
  pipelineDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
  pipelineDotActive: { backgroundColor: '#7c3aed' },
  pipelineDotDone: { backgroundColor: '#059669' },
  pipelineLabel: { fontSize: THEME.typography.sizes.sm, color: THEME.colors.textMuted, fontWeight: THEME.typography.weights.semibold, flex: 1 },
  pipelineLabelActive: { color: '#6d28d9' },
  pipelineLabelDone: { color: '#065f46' },
  pipelineDesc: { fontSize: THEME.typography.sizes.xs, color: '#7c3aed' },

  // Clarification
  clarificationCard: { padding: THEME.spacing.lg },
  clarificationHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: THEME.spacing.md },
  clarificationIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a', justifyContent: 'center', alignItems: 'center' },
  clarificationTitle: { fontSize: THEME.typography.sizes.sm, fontWeight: THEME.typography.weights.bold, color: '#92400e' },
  clarificationSubtitle: { fontSize: THEME.typography.sizes.xs, color: '#b45309', marginTop: 2, lineHeight: 16 },
  confidenceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  confidenceText: { fontSize: THEME.typography.sizes.xs, fontWeight: THEME.typography.weights.bold },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: THEME.spacing.md },
  tagChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe' },
  tagChipText: { fontSize: 10, fontWeight: '700', color: '#7c3aed', textTransform: 'uppercase' },
  questionBlock: { marginBottom: THEME.spacing.md, backgroundColor: THEME.colors.surface, borderRadius: THEME.roundness.md, padding: THEME.spacing.md, borderWidth: 1, borderColor: THEME.colors.border },
  questionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: THEME.spacing.sm, marginBottom: 8 },
  questionNumber: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.1)', borderWidth: 1, borderColor: '#ddd6fe', justifyContent: 'center', alignItems: 'center' },
  questionNumberText: { fontSize: 10, fontWeight: '700', color: '#7c3aed' },
  questionText: { flex: 1, fontSize: THEME.typography.sizes.sm, fontWeight: THEME.typography.weights.medium, color: THEME.colors.textPrimary, lineHeight: 18 },
  answerInput: { backgroundColor: THEME.colors.background, borderColor: THEME.colors.border, borderWidth: 1, borderRadius: THEME.roundness.sm, padding: THEME.spacing.sm, color: THEME.colors.textPrimary, fontSize: THEME.typography.sizes.sm, textAlignVertical: 'top', minHeight: 56 },

  // Rejection
  rejectionCard: { padding: THEME.spacing.lg, backgroundColor: '#fef2f2', borderColor: '#fca5a5', borderWidth: 1 },
  rejectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: THEME.spacing.sm },
  rejectionTitle: { fontSize: THEME.typography.sizes.sm, fontWeight: THEME.typography.weights.bold, color: '#991b1b', marginBottom: 4 },
  rejectionDesc: { fontSize: THEME.typography.sizes.xs, color: '#b91c1c', lineHeight: 16 },

  // Improvements
  improvementsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  improvementChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0' },
  improvementChipText: { fontSize: 11, fontWeight: '600', color: '#065f46' },

  // Existing explanation styles
  explanationTitle: { fontSize: THEME.typography.sizes.md, fontWeight: THEME.typography.weights.bold, color: THEME.colors.textPrimary, marginBottom: THEME.spacing.md, borderBottomWidth: 1, borderBottomColor: THEME.colors.border, paddingBottom: 8 },
  explanationItem: { marginBottom: THEME.spacing.lg },
  explanationHeader: { flexDirection: 'row', alignItems: 'center', gap: THEME.spacing.sm, marginBottom: 6 },
  bulletNumber: { width: 22, height: 22, borderRadius: THEME.roundness.full, backgroundColor: 'rgba(79, 70, 229, 0.15)', borderWidth: 1, borderColor: THEME.colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  bulletText: { fontSize: THEME.typography.sizes.xs, fontWeight: THEME.typography.weights.bold, color: THEME.colors.primaryLight },
  explanationAction: { fontSize: THEME.typography.sizes.sm, fontWeight: THEME.typography.weights.bold, color: THEME.colors.textPrimary },
  explanationContent: { paddingLeft: 30 },
  explanationText: { fontSize: THEME.typography.sizes.xs + 1, color: THEME.colors.textSecondary, lineHeight: 18 },
  boldLabel: { fontWeight: THEME.typography.weights.bold, color: THEME.colors.textPrimary },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.75)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: THEME.colors.surface, borderTopLeftRadius: THEME.roundness.xl, borderTopRightRadius: THEME.roundness.xl, borderWidth: 1, borderColor: THEME.colors.border, maxHeight: '50%', paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: THEME.spacing.lg, borderBottomWidth: 1, borderBottomColor: THEME.colors.border },
  modalTitle: { fontSize: THEME.typography.sizes.md, fontWeight: THEME.typography.weights.bold, color: THEME.colors.textPrimary },
  modalScroll: { paddingHorizontal: THEME.spacing.lg },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: THEME.colors.borderLight },
  modalItemText: { color: THEME.colors.textSecondary, fontSize: THEME.typography.sizes.md },
  modalItemTextActive: { color: THEME.colors.primaryLight, fontWeight: THEME.typography.weights.bold },
  modalCenteredOverlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.75)', justifyContent: 'center', alignItems: 'center', padding: THEME.spacing.lg },
  saveModalBox: { width: '90%', maxWidth: 360, padding: THEME.spacing.lg, borderWidth: 1, borderColor: THEME.colors.border },
  saveModalBody: { marginVertical: THEME.spacing.lg, gap: 8 },
  saveModalLabel: { fontSize: THEME.typography.sizes.xs, color: THEME.colors.textMuted, fontWeight: THEME.typography.weights.bold, textTransform: 'uppercase' },
  saveModalInput: { backgroundColor: THEME.colors.surface, borderColor: THEME.colors.border, borderWidth: 1, borderRadius: THEME.roundness.md, height: 44, paddingHorizontal: THEME.spacing.md, color: THEME.colors.textPrimary, fontSize: THEME.typography.sizes.sm },
  saveModalActions: { flexDirection: 'row', gap: THEME.spacing.md },
  saveModalBtn: { flex: 1 },
});
