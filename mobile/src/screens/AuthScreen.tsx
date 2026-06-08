import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { THEME } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import CustomButton from '../components/CustomButton';
import Logo from '../components/Logo';

export default function AuthScreen() {
  const { login, loading, updateConfig, supabaseUrl, supabaseAnonKey } = useAuth();
  
  const [apiUrlInput, setApiUrlInput] = useState('http://localhost:3000');
  const [tokenInput, setTokenInput] = useState('');
  
  // Advanced Supabase overrides
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sbUrlInput, setSbUrlInput] = useState(supabaseUrl);
  const [sbKeyInput, setSbKeyInput] = useState(supabaseAnonKey);

  const handleAuthenticate = async () => {
    try {
      if (!apiUrlInput.trim()) {
        Alert.alert('Configuration Error', 'Please specify your Dashboard API Url.');
        return;
      }

      if (showAdvanced) {
        if (!sbUrlInput.trim() || !sbKeyInput.trim()) {
          Alert.alert('Configuration Error', 'Please enter both Supabase URL and Anon Key, or disable advanced settings.');
          return;
        }
        await updateConfig(apiUrlInput.trim(), sbUrlInput.trim(), sbKeyInput.trim());
      } else {
        await updateConfig(apiUrlInput.trim());
      }

      const success = await login(apiUrlInput.trim(), tokenInput.trim() || null);
      if (success) {
        if (!tokenInput.trim()) {
          Alert.alert('Demo Mode Enabled', 'Running in local sandbox mode. Changes will be saved locally on your device.');
        } else {
          Alert.alert('Session Synchronized', 'Connected to the PromptPilot Cloud Workspace.');
        }
      }
    } catch (e: any) {
      Alert.alert('Authentication Failed', e.message || 'Check your credentials and API endpoint.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Logo size={44} />
          </View>
          <Text style={styles.title}>PromptPilot</Text>
          <Text style={styles.subtitle}>Cross-Platform Prompt Workspace</Text>
        </View>

        <GlassCard style={styles.card}>
          <Text style={styles.cardHeader}>Workspace Connection</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Dashboard API Endpoint</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="link-outline" size={18} color={THEME.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                value={apiUrlInput}
                onChangeText={setApiUrlInput}
                placeholder="http://10.0.2.2:3000 (Android) or http://localhost:3000"
                placeholderTextColor={THEME.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Access Sync Token</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={18} color={THEME.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                value={tokenInput}
                onChangeText={setTokenInput}
                secureTextEntry
                placeholder="Paste token from Web Settings to sync"
                placeholderTextColor={THEME.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>
            <Text style={styles.hintText}>Leave blank to evaluate local sandbox demo</Text>
          </View>

          <TouchableOpacity 
            onPress={() => setShowAdvanced(!showAdvanced)} 
            style={styles.advancedToggle}
          >
            <Text style={styles.advancedToggleText}>
              {showAdvanced ? 'Hide Database Overrides' : 'Advanced Database Configuration'}
            </Text>
            <Ionicons 
              name={showAdvanced ? 'chevron-up' : 'chevron-down'} 
              size={14} 
              color={THEME.colors.primaryLight} 
            />
          </TouchableOpacity>

          {showAdvanced && (
            <View style={styles.advancedBox}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Supabase Project URL</Text>
                <TextInput
                  value={sbUrlInput}
                  onChangeText={setSbUrlInput}
                  placeholder="https://your-project.supabase.co"
                  placeholderTextColor={THEME.colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.subInput}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Supabase Anon Key</Text>
                <TextInput
                  value={sbKeyInput}
                  onChangeText={setSbKeyInput}
                  placeholder="sb_publishable_anon_key"
                  placeholderTextColor={THEME.colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  style={styles.subInput}
                />
              </View>
            </View>
          )}

          <CustomButton
            title="Authenticate & Sync"
            onPress={handleAuthenticate}
            loading={loading}
            variant="gradient"
            style={styles.button}
          />
        </GlassCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: THEME.spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xxl,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: THEME.roundness.full,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  title: {
    fontSize: THEME.typography.sizes.xxxl,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textMuted,
    marginTop: THEME.spacing.xs,
  },
  card: {
    padding: THEME.spacing.xl,
  },
  cardHeader: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: THEME.spacing.sm,
  },
  formGroup: {
    marginBottom: THEME.spacing.lg,
  },
  label: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: THEME.spacing.sm,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.roundness.lg,
    height: 48,
    paddingHorizontal: THEME.spacing.md,
  },
  inputIcon: {
    marginRight: THEME.spacing.sm,
  },
  input: {
    flex: 1,
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.md,
    height: '100%',
  },
  hintText: {
    fontSize: THEME.typography.sizes.xxs,
    color: THEME.colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  advancedToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: THEME.spacing.sm,
    marginBottom: THEME.spacing.md,
  },
  advancedToggleText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.primaryLight,
    fontWeight: THEME.typography.weights.medium,
  },
  advancedBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderRadius: THEME.roundness.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
  },
  subInput: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.roundness.md,
    height: 40,
    paddingHorizontal: THEME.spacing.md,
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.sm,
  },
  button: {
    marginTop: THEME.spacing.sm,
  },
});
