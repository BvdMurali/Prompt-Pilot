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
  const { 
    loginWithEmail, 
    signUpWithEmail, 
    signInWithGoogle, 
    loginSandbox, 
    loading, 
    updateConfig, 
    supabaseUrl, 
    supabaseAnonKey 
  } = useAuth();
  
  const [apiUrlInput, setApiUrlInput] = useState('https://prompt-pilot-ochre.vercel.app');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Advanced overrides hidden under Developer Settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sbUrlInput, setSbUrlInput] = useState(supabaseUrl);
  const [sbKeyInput, setSbKeyInput] = useState(supabaseAnonKey);

  // No manual deep link listener needed here.
  // expo-web-browser (WebBrowser.openAuthSessionAsync) handles the OAuth
  // redirect interception internally inside signInWithGoogle() in AuthContext.

  const handleGoogleLogin = async () => {
    try {
      if (showAdvanced) {
        await updateConfig(apiUrlInput.trim(), sbUrlInput.trim(), sbKeyInput.trim());
      } else {
        await updateConfig(apiUrlInput.trim());
      }
      await signInWithGoogle();
    } catch (e: any) {
      Alert.alert('OAuth Failure', e.message || 'Failed to start Google authentication.');
    }
  };

  const handleAuthenticate = async () => {
    try {
      if (!apiUrlInput.trim()) {
        Alert.alert('Configuration Error', 'Please specify your Dashboard API Url.');
        return;
      }
      if (!emailInput.trim() || !passwordInput.trim()) {
        Alert.alert('Configuration Error', 'Please enter both your email address and password.');
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

      if (isSignUp) {
        const success = await signUpWithEmail(apiUrlInput.trim(), emailInput.trim(), passwordInput.trim());
        if (success) {
          Alert.alert('Welcome to PromptPilot', 'Your cloud account has been created successfully!');
        } else {
          Alert.alert('Activation Pending', 'Account created! Please check your email to verify your address if required.');
        }
      } else {
        const success = await loginWithEmail(apiUrlInput.trim(), emailInput.trim(), passwordInput.trim());
        if (success) {
          Alert.alert('Session Synced', 'Successfully connected and synced to your cloud workspace.');
        }
      }
    } catch (e: any) {
      Alert.alert('Authentication Failed', e.message || 'Check your credentials and endpoint URL.');
    }
  };

  const handleSandboxMode = async () => {
    try {
      if (!apiUrlInput.trim()) {
        Alert.alert('Configuration Error', 'Please specify your Dashboard API Url.');
        return;
      }
      await loginSandbox(apiUrlInput.trim());
      Alert.alert('Demo Sandbox Mode', 'Running locally. Changes are cached on your device and will not sync to the cloud.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to enter sandbox mode.');
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
          {/* Continue with Google (OAuth Primary CTA) */}
          <CustomButton
            title="Continue with Google"
            onPress={handleGoogleLogin}
            loading={loading}
            icon="logo-google"
            variant="secondary"
            style={styles.googleButton}
            textStyle={styles.googleButtonText}
          />

          {/* Styled Separator Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or use email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Tab Switcher between Sign In and Sign Up */}
          <View style={styles.tabHeader}>
            <TouchableOpacity 
              onPress={() => {
                setIsSignUp(false);
                setEmailInput('');
                setPasswordInput('');
              }} 
              style={[styles.tabItem, !isSignUp && styles.tabItemActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, !isSignUp && styles.tabTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => {
                setIsSignUp(true);
                setEmailInput('');
                setPasswordInput('');
              }} 
              style={[styles.tabItem, isSignUp && styles.tabItemActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isSignUp && styles.tabTextActive]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Email Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={18} color={THEME.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                value={emailInput}
                onChangeText={setEmailInput}
                placeholder="enter email..."
                placeholderTextColor={THEME.colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                style={styles.input}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color={THEME.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                value={passwordInput}
                onChangeText={setPasswordInput}
                placeholder="enter password..."
                placeholderTextColor={THEME.colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>
          </View>

          {/* Advanced Configurations Collapsible Toggle */}
          <TouchableOpacity 
            onPress={() => setShowAdvanced(!showAdvanced)} 
            style={styles.advancedToggle}
            activeOpacity={0.7}
          >
            <Text style={styles.advancedToggleText}>
              {showAdvanced ? 'Hide Developer Settings' : 'Developer / Local Settings'}
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
                <Text style={styles.label}>Dashboard API Endpoint</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="link-outline" size={18} color={THEME.colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    value={apiUrlInput}
                    onChangeText={setApiUrlInput}
                    placeholder="https://prompt-pilot-ochre.vercel.app"
                    placeholderTextColor={THEME.colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                </View>
              </View>
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

          {/* Primary Email Auth Button */}
          <CustomButton
            title={isSignUp ? "Create Workspace Account" : "Sign In & Sync"}
            onPress={handleAuthenticate}
            loading={loading}
            variant="gradient"
            style={styles.button}
          />

          {/* Local Offline Sandbox Bypass Link */}
          <TouchableOpacity 
            onPress={handleSandboxMode} 
            style={styles.sandboxLink}
            activeOpacity={0.7}
          >
            <Text style={styles.sandboxLinkText}>Continue with Local Sandbox (Offline Demo)</Text>
          </TouchableOpacity>
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
    marginBottom: THEME.spacing.lg,
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
  googleButton: {
    backgroundColor: '#1e293b',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    marginBottom: THEME.spacing.xs,
  },
  googleButtonText: {
    color: '#fff',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: THEME.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  dividerText: {
    fontSize: THEME.typography.sizes.xxs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: THEME.spacing.md,
    letterSpacing: 0.5,
  },
  tabHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: THEME.spacing.lg,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: THEME.colors.primaryLight,
  },
  tabText: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textMuted,
    fontWeight: THEME.typography.weights.semibold,
  },
  tabTextActive: {
    color: THEME.colors.primaryLight,
  },
  formGroup: {
    marginBottom: THEME.spacing.md,
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
  advancedToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: THEME.spacing.sm,
    marginVertical: THEME.spacing.sm,
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
  sandboxLink: {
    alignItems: 'center',
    marginTop: THEME.spacing.lg,
    paddingVertical: 6,
  },
  sandboxLinkText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.typography.weights.medium,
    textDecorationLine: 'underline',
  },
});
