import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  Clipboard,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase, TemplateItem } from '../context/DatabaseContext';
import { THEME } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import CustomButton from '../components/CustomButton';

interface TemplatesScreenProps {
  onSendToEditor: (content: string) => void;
}

export default function TemplatesScreen({ onSendToEditor }: TemplatesScreenProps) {
  const { templatesList } = useDatabase();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [compiledText, setCompiledText] = useState('');

  // Extract variables when a template is selected
  useEffect(() => {
    if (!selectedTemplate) {
      setVariables({});
      setCompiledText('');
      return;
    }

    const regex = /\[(.*?)\]/g;
    let match;
    const vars: Record<string, string> = {};
    
    while ((match = regex.exec(selectedTemplate.content)) !== null) {
      vars[match[1]] = '';
    }
    
    setVariables(vars);
    setCompiledText(selectedTemplate.content);
  }, [selectedTemplate]);

  // Re-compile whenever variables change
  useEffect(() => {
    if (!selectedTemplate) return;

    let compiled = selectedTemplate.content;
    Object.entries(variables).forEach(([key, value]) => {
      // Escape special characters in key for regex
      const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      compiled = compiled.replace(new RegExp(`\\[${escapedKey}\\]`, 'g'), value || `[${key}]`);
    });

    setCompiledText(compiled);
  }, [variables, selectedTemplate]);

  const handleCopy = () => {
    if (!compiledText) return;
    Clipboard.setString(compiledText);
    Alert.alert('Copied', 'Compiled template prompt copied to clipboard.');
  };

  const handleSend = () => {
    if (!compiledText) return;
    onSendToEditor(compiledText);
    Alert.alert('Sent to Editor', 'Compiled prompt loaded into the editor.');
  };

  if (selectedTemplate) {
    const varKeys = Object.keys(variables);
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            onPress={() => setSelectedTemplate(null)} 
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={THEME.colors.primaryLight} />
            <Text style={styles.backBtnText}>Back to Presets</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
          <Text style={styles.templateTitle}>{selectedTemplate.title}</Text>
          <Text style={styles.templateDesc}>{selectedTemplate.description}</Text>

          <GlassCard style={styles.variablesCard}>
            <Text style={styles.cardSectionTitle}>Fill Parameters</Text>
            {varKeys.length === 0 ? (
              <Text style={styles.noVariablesText}>No placeholder bracket parameters in this template.</Text>
            ) : (
              varKeys.map((key) => (
                <View key={key} style={styles.formGroup}>
                  <Text style={styles.label}>{key}</Text>
                  <TextInput
                    value={variables[key]}
                    onChangeText={(val) => setVariables(prev => ({ ...prev, [key]: val }))}
                    placeholder={`Enter ${key.toLowerCase()}...`}
                    placeholderTextColor={THEME.colors.textMuted}
                    style={styles.input}
                  />
                </View>
              ))
            )}
          </GlassCard>

          <GlassCard style={styles.previewCard}>
            <Text style={styles.cardSectionTitle}>Output Preview</Text>
            <ScrollView style={styles.previewScroll} nestedScrollEnabled>
              <Text style={styles.previewText}>{compiledText}</Text>
            </ScrollView>

            <View style={styles.actionRow}>
              <CustomButton
                title="Copy Text"
                onPress={handleCopy}
                icon="copy-outline"
                variant="secondary"
                style={styles.copyBtn}
              />
              <CustomButton
                title="Send to Editor"
                onPress={handleSend}
                icon="arrow-forward-outline"
                variant="gradient"
                style={styles.sendBtn}
              />
            </View>
          </GlassCard>
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.listContent}>
      <Text style={styles.sectionTitle}>Global Presets</Text>
      
      {templatesList.map((template) => (
        <TouchableOpacity 
          key={template.id}
          onPress={() => setSelectedTemplate(template)}
          activeOpacity={0.85}
        >
          <GlassCard style={styles.listCard}>
            <View style={styles.listCardHeader}>
              <Text style={styles.listCardTitle}>{template.title}</Text>
              <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
            </View>
            <Text style={styles.listCardDesc}>{template.description}</Text>
            <View style={styles.tagsContainer}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>
                  {template.is_system ? 'System Preset' : 'Custom'}
                </Text>
              </View>
            </View>
          </GlassCard>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  headerRow: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
    marginBottom: THEME.spacing.md,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: THEME.spacing.xs + 2,
    paddingHorizontal: THEME.spacing.sm + 2,
    marginLeft: -8,
    borderRadius: THEME.roundness.md,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: THEME.spacing.xs + 2,
  },
  backBtnText: {
    fontSize: THEME.typography.sizes.md,
    color: THEME.colors.primaryLight,
    fontWeight: THEME.typography.weights.semibold,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xl,
  },
  templateTitle: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.xs,
  },
  templateDesc: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.lg,
    lineHeight: 20,
  },
  variablesCard: {
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
  },
  cardSectionTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
    paddingBottom: 6,
  },
  noVariablesText: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    paddingVertical: THEME.spacing.md,
  },
  formGroup: {
    marginBottom: THEME.spacing.md,
  },
  label: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.roundness.md,
    height: 40,
    paddingHorizontal: THEME.spacing.md,
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.sm,
  },
  previewCard: {
    padding: THEME.spacing.lg,
  },
  previewScroll: {
    height: 140,
    backgroundColor: THEME.colors.borderLight,
    borderRadius: THEME.roundness.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.lg,
  },
  previewText: {
    fontFamily: THEME.typography.fontFamily.mono,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginTop: THEME.spacing.md,
    width: '100%',
  },
  copyBtn: {
    flex: 1,
  },
  sendBtn: {
    flex: 1.2,
  },
  listContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: THEME.spacing.md,
  },
  listCard: {
    padding: THEME.spacing.lg,
  },
  listCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  listCardTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  listCardDesc: {
    fontSize: THEME.typography.sizes.xs + 1,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginBottom: THEME.spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
  },
  tag: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.roundness.sm,
  },
  tagText: {
    fontSize: THEME.typography.sizes.xxs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.primaryLight,
  },
});
