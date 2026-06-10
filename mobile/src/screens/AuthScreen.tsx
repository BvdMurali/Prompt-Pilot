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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { THEME } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import CustomButton from '../components/CustomButton';

export default function AuthScreen() {
  const { 
    loginWithEmail, 
    signUpWithEmail, 
    signInWithGoogle, 
    apiUrl,
    loading 
  } = useAuth();
  
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (e: any) {
      Alert.alert('OAuth Failure', e.message || 'Failed to start Google authentication.');
    }
  };

  const handleAuthenticate = async () => {
    try {
      if (!emailInput.trim() || !passwordInput.trim()) {
        Alert.alert('Configuration Error', 'Please enter both your email address and password.');
        return;
      }

      if (isSignUp) {
        const success = await signUpWithEmail(apiUrl, emailInput.trim(), passwordInput.trim());
        if (success) {
          Alert.alert('Welcome to PromptPilot', 'Your cloud account has been created successfully!');
        } else {
          Alert.alert('Activation Pending', 'Account created! Please check your email to verify your address if required.');
        }
      } else {
        const success = await loginWithEmail(apiUrl, emailInput.trim(), passwordInput.trim());
        if (success) {
          Alert.alert('Session Synced', 'Successfully connected and synced to your cloud workspace.');
        }
      }
    } catch (e: any) {
      Alert.alert('Authentication Failed', e.message || 'Check your credentials.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Decorative ambient background glows */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          keyboardShouldPersistTaps="handled"
        >
          <GlassCard style={styles.card}>
            {/* Header Section */}
            <View style={styles.header}>
              <LinearGradient
                colors={THEME.colors.primaryGradient as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sparklesIconContainer}
              >
                <Ionicons name="sparkles" size={20} color="#fff" />
              </LinearGradient>
              <Text style={styles.cardTitle}>
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {isSignUp 
                  ? 'Get started with PromptPilot today' 
                  : 'Sign in to access your PromptPilot workspace'}
              </Text>
            </View>

            {/* Email Input */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={16} color={THEME.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  value={emailInput}
                  onChangeText={setEmailInput}
                  placeholder="you@example.com"
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
                <Ionicons name="lock-closed-outline" size={16} color={THEME.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                  placeholder="••••••••"
                  placeholderTextColor={THEME.colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  style={styles.eyeIconContainer}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={18} 
                    color={THEME.colors.textMuted} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <CustomButton
              title={isSignUp ? "Create Account" : "Sign In"}
              onPress={handleAuthenticate}
              loading={loading}
              variant="gradient"
              style={styles.submitButton}
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google OAuth Button */}
            <CustomButton
              title="Google"
              onPress={handleGoogleLogin}
              loading={loading}
              icon="logo-google"
              variant="secondary"
              style={styles.googleButton}
              textStyle={styles.googleButtonText}
            />

            {/* Switch Mode Link */}
            <TouchableOpacity 
              onPress={() => {
                setIsSignUp(!isSignUp);
                setEmailInput('');
                setPasswordInput('');
                setShowPassword(false);
              }} 
              style={styles.switchModeContainer}
              activeOpacity={0.7}
            >
              <Text style={styles.switchModeText}>
                {isSignUp 
                  ? 'Already have an account? Sign In' 
                  : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    position: 'relative',
  },
  glowTop: {
    position: 'absolute',
    top: -120,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(124, 58, 237, 0.05)', // brand-start subtle glow
    pointerEvents: 'none',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -120,
    right: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(6, 182, 212, 0.05)', // brand-end subtle glow
    pointerEvents: 'none',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: THEME.spacing.xl,
  },
  card: {
    padding: THEME.spacing.xl,
    borderRadius: THEME.roundness.xl,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  header: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xxl + 4,
  },
  sparklesIconContainer: {
    width: 42,
    height: 42,
    borderRadius: THEME.roundness.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.lg,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.xs + 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: THEME.spacing.lg,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: THEME.spacing.sm,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.roundness.md,
    height: 48,
    paddingHorizontal: THEME.spacing.md + 2,
  },
  inputIcon: {
    marginRight: THEME.spacing.sm + 2,
  },
  input: {
    flex: 1,
    color: THEME.colors.textPrimary,
    fontSize: 14,
    height: '100%',
  },
  eyeIconContainer: {
    padding: THEME.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    marginTop: THEME.spacing.sm,
    height: 48,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: THEME.spacing.xxl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.border,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: THEME.spacing.md,
    letterSpacing: 0.5,
  },
  googleButton: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    height: 48,
  },
  googleButtonText: {
    color: THEME.colors.textPrimary,
  },
  switchModeContainer: {
    alignItems: 'center',
    marginTop: THEME.spacing.xxl,
    paddingVertical: THEME.spacing.sm - 2,
  },
  switchModeText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
});
