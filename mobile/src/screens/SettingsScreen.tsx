import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  TextInput,
  Clipboard,
  Modal,
  Share,
  Platform,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { supabase } from '../services/supabase';
import { THEME } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import CustomButton from '../components/CustomButton';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STANDARD_MODELS = [
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', group: 'Google Gemini' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', group: 'Google Gemini' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', group: 'Google Gemini' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', group: 'OpenAI' },
  { id: 'gpt-4o', name: 'GPT-4o Premium', group: 'OpenAI' },
  { id: 'o1-mini', name: 'o1 Mini', group: 'OpenAI' },
  { id: 'o3-mini', name: 'o3 Mini', group: 'OpenAI' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', group: 'Anthropic Claude' },
  { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', group: 'Anthropic Claude' },
  { id: 'google/gemini-2.5-flash:free', name: 'OpenRouter: Gemini Flash (Free)', group: 'OpenRouter' },
  { id: 'deepseek/deepseek-chat', name: 'OpenRouter: DeepSeek V3 Chat', group: 'OpenRouter' },
  { id: 'deepseek/deepseek-r1', name: 'OpenRouter: DeepSeek R1', group: 'OpenRouter' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'OpenRouter: Llama 3.3 70B', group: 'OpenRouter' },
  { id: 'custom', name: 'Custom Model...', group: 'Other' }
];

const TONES = [
  { id: 'professional', name: 'Professional' },
  { id: 'friendly', name: 'Friendly' },
  { id: 'casual', name: 'Casual' },
  { id: 'executive', name: 'Executive' }
];

export default function SettingsScreen() {
  const { user, logout, isLocalMode, apiUrl, refreshUser } = useAuth();
  const { syncData } = useDatabase();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [preferredModel, setPreferredModel] = useState('gemini-3.1-flash-lite');
  const [customModel, setCustomModel] = useState('');
  const [defaultTone, setDefaultTone] = useState('professional');
  
  // API Keys
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');

  // Show/hide keys toggles
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showOpenrouter, setShowOpenrouter] = useState(false);

  // Statuses
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [deletedAt, setDeletedAt] = useState<string | null>(null);
  const [syncingDeleteState, setSyncingDeleteState] = useState(false);

  // Modal visibility states
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [toneModalVisible, setToneModalVisible] = useState(false);

  useEffect(() => {
    loadUserSettings();
  }, [isLocalMode, user]);

  const loadUserSettings = async () => {
    if (isLocalMode || !user) {
      try {
        const localSettingsStr = await AsyncStorage.getItem('pp_settings');
        if (localSettingsStr) {
          const localSettings = JSON.parse(localSettingsStr);
          const loadedModel = localSettings.preferred_model || 'gemini-3.1-flash-lite';
          if (STANDARD_MODELS.some(m => m.id === loadedModel)) {
            setPreferredModel(loadedModel);
            setCustomModel('');
          } else {
            setPreferredModel('custom');
            setCustomModel(loadedModel);
          }
          setDefaultTone(localSettings.default_tone || 'professional');
          const keys = localSettings.api_key_override || {};
          setGeminiKey(keys.gemini || '');
          setOpenaiKey(keys.openai || '');
          setAnthropicKey(keys.anthropic || '');
          setOpenrouterKey(keys.openrouter || '');
        }
        const cachedName = await AsyncStorage.getItem('pp_user_name');
        setDisplayName(cachedName || 'Sandbox User');
      } catch (e) {
        console.warn('Failed to load local model preference');
      }
      return;
    }

    try {
      setLoadingSettings(true);
      const { data: dbSettings, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!error && dbSettings) {
        const loadedModel = dbSettings.preferred_model || 'gemini-3.1-flash-lite';
        if (STANDARD_MODELS.some(m => m.id === loadedModel)) {
          setPreferredModel(loadedModel);
          setCustomModel('');
        } else {
          setPreferredModel('custom');
          setCustomModel(loadedModel);
        }
        setDefaultTone(dbSettings.default_tone || 'professional');
        const keys = dbSettings.api_key_override || {};
        setGeminiKey(keys.gemini || '');
        setOpenaiKey(keys.openai || '');
        setAnthropicKey(keys.anthropic || '');
        setOpenrouterKey(keys.openrouter || '');
      }

      setDisplayName(user.name || '');
      setAvatarUrl(user.avatar_url || '');

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('deleted_at')
        .eq('id', user.id)
        .single();

      if (!profileError && profile) {
        setDeletedAt(profile.deleted_at);
      }
    } catch (e) {
      console.warn('Failed loading user settings:', e);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSelectAvatar = async () => {
    if (isLocalMode) {
      Alert.alert('Sandbox Mode', 'Avatar upload is not supported in local sandbox mode.');
      return;
    }
    
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permissions are required to upload an avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        await handleUploadAvatar(selectedAsset.uri);
      }
    } catch (e) {
      console.warn('Avatar picker error:', e);
      Alert.alert('Error', 'Failed to pick an image.');
    }
  };

  const handleUploadAvatar = async (uri: string) => {
    if (!user) return;

    try {
      setUploadingAvatar(true);
      
      const fileExt = uri.split('.').pop() || 'jpg';
      const filePath = `${user.id}/avatar-${Math.floor(Math.random() * 1000000)}.${fileExt}`;
      
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: `avatar-${Math.floor(Math.random() * 1000000)}.${fileExt}`,
        type: `image/${fileExt}`,
      } as any);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, formData, { 
          upsert: true 
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      
      const { error: profileError } = await supabase
        .from('users')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      await refreshUser();
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (e: any) {
      console.error('Avatar upload error:', e);
      Alert.alert('Upload Failed', e.message || 'Failed to upload profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[SettingsScreen] Supabase session user:', session?.user?.id);
      console.log('[SettingsScreen] Context user ID:', user?.id);
      console.log('[SettingsScreen] Supabase URL:', (supabase as any).supabaseUrl);
      console.log('[SettingsScreen] isLocalMode:', isLocalMode);
      const keys = {
        gemini: geminiKey.trim() || undefined,
        openai: openaiKey.trim() || undefined,
        anthropic: anthropicKey.trim() || undefined,
        openrouter: openrouterKey.trim() || undefined,
      };

      const finalModel = preferredModel === 'custom' ? customModel.trim() : preferredModel;

      if (preferredModel === 'custom' && !customModel.trim()) {
        throw new Error('Please specify a custom model ID.');
      }

      if (isLocalMode) {
        const localSettings = {
          preferred_model: finalModel,
          default_tone: defaultTone,
          api_key_override: keys,
        };
        await AsyncStorage.setItem('pp_settings', JSON.stringify(localSettings));
        await AsyncStorage.setItem('pp_user_name', displayName.trim());
      } else {
        if (!user) return;
        
        const { error: settingsError } = await supabase
          .from('settings')
          .upsert({
            user_id: user.id,
            preferred_model: finalModel,
            default_tone: defaultTone,
            theme: 'dark',
            api_key_override: keys,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (settingsError) throw settingsError;

        const { error: profileError } = await supabase
          .from('users')
          .update({
            name: displayName.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (profileError) throw profileError;

        await refreshUser();
      }
      Alert.alert('Success', 'Your settings and preferences have been saved!');
    } catch (e: any) {
      Alert.alert('Save Failed', e.message || 'An error occurred while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUserId = () => {
    if (isLocalMode || !user) return;
    Clipboard.setString(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleExportData = async () => {
    if (isLocalMode || !user) {
      Alert.alert('Sandbox Info', 'Data export is not supported in local sandbox mode.');
      return;
    }
    try {
      const { data: prompts } = await supabase.from('prompts').select('*').eq('user_id', user.id);
      const { data: history } = await supabase.from('history').select('*').eq('user_id', user.id);
      const { data: settings } = await supabase.from('settings').select('*').eq('user_id', user.id).single();

      const exportObj = {
        user: {
          id: user.id,
          email: user.email,
        },
        settings,
        prompts,
        history,
        exportedAt: new Date().toISOString(),
      };

      const content = JSON.stringify(exportObj, null, 2);
      await Share.share({
        message: content,
        title: `PromptPilot Data Export`,
      });
    } catch (err: any) {
      Alert.alert('Export Failed', err.message || 'Could not export your data.');
    }
  };

  const handleInitiateDelete = () => {
    if (isLocalMode || !user) {
      Alert.alert('Sandbox Clean', 'You are running in offline sandbox mode.');
      return;
    }

    Alert.alert(
      'Delete Account',
      'Are you sure you want to deactivate your profile? Permanent purging will happen after 30 days. You can cancel deletion in settings anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Deactivate Account', 
          style: 'destructive',
          onPress: async () => {
            try {
              setSyncingDeleteState(true);
              const nowIso = new Date().toISOString();
              const { error } = await supabase
                .from('users')
                .update({ deleted_at: nowIso })
                .eq('id', user.id);

              if (error) throw error;
              setDeletedAt(nowIso);
              Alert.alert('Scheduled', 'Profile soft-deleted. Cloud sync paused.');
              syncData();
            } catch (e) {
              Alert.alert('Failed', 'Could not deactivate profile at this time.');
            } finally {
              setSyncingDeleteState(false);
            }
          }
        }
      ]
    );
  };

  const handleRestoreAccount = async () => {
    try {
      setSyncingDeleteState(true);
      const { error } = await supabase
        .from('users')
        .update({ deleted_at: null })
        .eq('id', user!.id);

      if (error) throw error;
      setDeletedAt(null);
      Alert.alert('Profile Restored', 'Account reactivated. Cloud sync resumed.');
      syncData();
    } catch (e) {
      Alert.alert('Restoration Failed', 'Could not restore user account.');
    } finally {
      setSyncingDeleteState(false);
    }
  };

  const deletionDeadline = () => {
    if (!deletedAt) return '';
    const date = new Date(deletedAt);
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      {/* Ambient background glows */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        {/* Soft Delete Warning Banner */}
        {deletedAt && (
          <View style={styles.deleteWarningBanner}>
            <Ionicons name="warning" size={20} color={THEME.colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.deleteWarningTitle}>Profile Scheduled for Deletion</Text>
              <Text style={styles.deleteWarningDesc}>
                Deactivation initiated. Permanent purging scheduled on {deletionDeadline()}.
              </Text>
            </View>
            <TouchableOpacity 
              onPress={handleRestoreAccount} 
              disabled={syncingDeleteState}
              style={styles.restoreBtn}
            >
              {syncingDeleteState ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.restoreBtnText}>Restore</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Profile Card */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="person-outline" size={18} color={THEME.colors.primary} style={styles.cardHeaderIcon} />
            <Text style={styles.cardTitle}>Profile Details</Text>
          </View>

          <View style={styles.avatarSection}>
            <TouchableOpacity 
              onPress={handleSelectAvatar} 
              disabled={uploadingAvatar}
              style={styles.avatarBtn}
              activeOpacity={0.8}
            >
              {uploadingAvatar ? (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator color={THEME.colors.primaryLight} size="small" />
                </View>
              ) : (
                <View style={styles.avatarUploadHover}>
                  <Ionicons name="camera-outline" size={16} color="#818cf8" />
                </View>
              )}

              {avatarUrl ? (
                <Image 
                  source={{ uri: avatarUrl }} 
                  style={styles.avatarImage} 
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>
                    {displayName ? displayName.substring(0, 2).toUpperCase() : (user?.email?.substring(0, 2).toUpperCase() || 'SB')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
            <View style={styles.avatarDescContainer}>
              <Text style={styles.avatarDescTitle}>Profile Picture</Text>
              <Text style={styles.avatarDescSub}>Tap to upload. PNG, JPG, or WebP under 2MB.</Text>
            </View>
          </View>

          {/* Display Name Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="E.g. Murali"
              placeholderTextColor={THEME.colors.textMuted}
              autoCorrect={false}
              style={styles.textInput}
            />
          </View>

          {/* Email (Read-Only) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Address (Read-only)</Text>
            <View style={styles.readOnlyField}>
              <Ionicons name="lock-closed-outline" size={14} color="#475569" style={styles.readOnlyIcon} />
              <Text style={styles.readOnlyText} numberOfLines={1}>
                {isLocalMode ? 'local@sandbox.demo' : user?.email}
              </Text>
            </View>
          </View>

          {/* User UID (Read-Only) */}
          {!isLocalMode && user && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>User UID</Text>
              <View style={styles.uidContainer}>
                <Text style={styles.uidText} numberOfLines={1}>{user.id}</Text>
                <TouchableOpacity onPress={handleCopyUserId} style={styles.copyBtn} activeOpacity={0.7}>
                  <Ionicons 
                    name={copiedId ? "checkmark" : "copy-outline"} 
                    size={15} 
                    color={copiedId ? THEME.colors.success : THEME.colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </GlassCard>

        {/* Workspace Preferences Card */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="settings-outline" size={18} color={THEME.colors.primary} style={styles.cardHeaderIcon} />
            <Text style={styles.cardTitle}>Workspace Preferences</Text>
          </View>

          {loadingSettings ? (
            <ActivityIndicator color={THEME.colors.primaryLight} style={{ marginVertical: 20 }} />
          ) : (
            <View style={{ gap: 16 }}>
              {/* Preferred Model Custom Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Preferred AI Model</Text>
                <TouchableOpacity
                  onPress={() => setModelModalVisible(true)}
                  style={styles.dropdownBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownBtnText}>
                    {STANDARD_MODELS.find(m => m.id === preferredModel)?.name || preferredModel}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={THEME.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {preferredModel === 'custom' && (
                <View style={[styles.formGroup, { marginTop: -4 }]}>
                  <Text style={styles.label}>Custom Model ID</Text>
                  <TextInput
                    value={customModel}
                    onChangeText={setCustomModel}
                    placeholder="e.g. meta-llama/llama-3-8b-instruct"
                    placeholderTextColor={THEME.colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.textInput}
                  />
                  <Text style={styles.fieldHint}>
                    Type the exact model identifier required by your API provider.
                  </Text>
                </View>
              )}

              {/* Default Tone Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Default Tone</Text>
                <TouchableOpacity
                  onPress={() => setToneModalVisible(true)}
                  style={styles.dropdownBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownBtnText}>
                    {TONES.find(t => t.id === defaultTone)?.name || defaultTone}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={THEME.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </GlassCard>

        {/* API Credentials Card */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="key-outline" size={18} color={THEME.colors.primary} style={styles.cardHeaderIcon} />
            <Text style={styles.cardTitle}>API Key Overrides (Optional)</Text>
          </View>

          <View style={{ gap: 16 }}>
            {/* Gemini Key */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Google Gemini Key</Text>
              <View style={styles.keyInputWrapper}>
                <TextInput
                  value={geminiKey}
                  onChangeText={setGeminiKey}
                  placeholder={geminiKey ? "••••••••••••••••" : "AIzaSy..."}
                  placeholderTextColor={THEME.colors.textMuted}
                  secureTextEntry={!showGemini}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.keyInput}
                />
                <TouchableOpacity onPress={() => setShowGemini(!showGemini)} style={styles.keyEyeBtn}>
                  <Ionicons name={showGemini ? "eye-off-outline" : "eye-outline"} size={16} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* OpenAI Key */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>OpenAI API Key</Text>
              <View style={styles.keyInputWrapper}>
                <TextInput
                  value={openaiKey}
                  onChangeText={setOpenaiKey}
                  placeholder={openaiKey ? "••••••••••••••••" : "sk-proj-..."}
                  placeholderTextColor={THEME.colors.textMuted}
                  secureTextEntry={!showOpenai}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.keyInput}
                />
                <TouchableOpacity onPress={() => setShowOpenai(!showOpenai)} style={styles.keyEyeBtn}>
                  <Ionicons name={showOpenai ? "eye-off-outline" : "eye-outline"} size={16} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Anthropic Key */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Anthropic Key</Text>
              <View style={styles.keyInputWrapper}>
                <TextInput
                  value={anthropicKey}
                  onChangeText={setAnthropicKey}
                  placeholder={anthropicKey ? "••••••••••••••••" : "sk-ant-..."}
                  placeholderTextColor={THEME.colors.textMuted}
                  secureTextEntry={!showAnthropic}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.keyInput}
                />
                <TouchableOpacity onPress={() => setShowAnthropic(!showAnthropic)} style={styles.keyEyeBtn}>
                  <Ionicons name={showAnthropic ? "eye-off-outline" : "eye-outline"} size={16} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* OpenRouter Key */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>OpenRouter Key</Text>
              <View style={styles.keyInputWrapper}>
                <TextInput
                  value={openrouterKey}
                  onChangeText={setOpenrouterKey}
                  placeholder={openrouterKey ? "••••••••••••••••" : "sk-or-v1-..."}
                  placeholderTextColor={THEME.colors.textMuted}
                  secureTextEntry={!showOpenrouter}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.keyInput}
                />
                <TouchableOpacity onPress={() => setShowOpenrouter(!showOpenrouter)} style={styles.keyEyeBtn}>
                  <Ionicons name={showOpenrouter ? "eye-off-outline" : "eye-outline"} size={16} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Save Button */}
            <CustomButton
              title={saving ? "Saving Settings..." : "Save Settings"}
              onPress={handleSaveSettings}
              loading={saving}
              variant="gradient"
              icon="save-outline"
              style={styles.saveBtn}
            />
          </View>
        </GlassCard>

        {/* Privacy & Danger Card */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color={THEME.colors.primary} style={styles.cardHeaderIcon} />
            <Text style={styles.cardTitle}>Account & Privacy</Text>
          </View>

          <View style={{ gap: 20 }}>
            <View style={styles.privacyDescRow}>
              <Ionicons name="shield-outline" size={18} color={THEME.colors.success} style={{ marginRight: 8, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.privacyDescTitle}>Privacy First Architecture</Text>
                <Text style={styles.privacyDescText}>
                  Your data is securely isolated using Row Level Security. You hold the authority to export or permanently purge all database logs.
                </Text>
              </View>
            </View>

            {/* Export data */}
            <View style={styles.dividerSub} />
            <View style={styles.privacyActionRow}>
              <Text style={styles.privacyActionTitle}>Export Information</Text>
              <TouchableOpacity onPress={handleExportData} style={styles.exportBtn} activeOpacity={0.7}>
                <Ionicons name="download-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.exportBtnText}>Export My Data</Text>
              </TouchableOpacity>
            </View>

            {/* Delete account */}
            {!isLocalMode && (
              <>
                <View style={styles.dividerSub} />
                <View style={styles.privacyActionRow}>
                  <Text style={styles.privacyActionTitle}>Danger Zone</Text>
                  <TouchableOpacity 
                    onPress={handleInitiateDelete} 
                    disabled={deletedAt !== null}
                    style={[styles.deleteTriggerBtn, deletedAt !== null && { opacity: 0.4 }]} 
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={15} color={THEME.colors.danger} style={{ marginRight: 6 }} />
                    <Text style={styles.deleteTriggerText}>Delete My Account</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </GlassCard>

        {/* Sign Out Button */}
        <CustomButton
          title="Sign Out / Change Workspace"
          onPress={logout}
          icon="log-out-outline"
          variant="secondary"
          style={styles.signOutButton}
        />
      </ScrollView>

      {/* Model Selection Modal */}
      <Modal
        visible={modelModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModelModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity 
            style={styles.modalCloseOverlay} 
            activeOpacity={1} 
            onPress={() => setModelModalVisible(false)} 
          />
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Preferred Model</Text>
              <TouchableOpacity onPress={() => setModelModalVisible(false)}>
                <Ionicons name="close" size={20} color={THEME.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalListScroll}>
              {['Google Gemini', 'OpenAI', 'Anthropic Claude', 'OpenRouter', 'Other'].map(group => {
                const groupModels = STANDARD_MODELS.filter(m => m.group === group);
                if (groupModels.length === 0) return null;
                return (
                  <View key={group} style={styles.modalGroup}>
                    <Text style={styles.modalGroupHeader}>{group}</Text>
                    {groupModels.map(m => {
                      const isSelected = preferredModel === m.id;
                      return (
                        <TouchableOpacity
                          key={m.id}
                          onPress={() => {
                            setPreferredModel(m.id);
                            setModelModalVisible(false);
                          }}
                          style={[styles.modalItem, isSelected && styles.modalItemActive]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.modalItemText, isSelected && styles.modalItemTextActive]}>
                            {m.name}
                          </Text>
                          {isSelected && <Ionicons name="checkmark" size={16} color={THEME.colors.primaryLight} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          </GlassCard>
        </View>
      </Modal>

      {/* Tone Selection Modal */}
      <Modal
        visible={toneModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setToneModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity 
            style={styles.modalCloseOverlay} 
            activeOpacity={1} 
            onPress={() => setToneModalVisible(false)} 
          />
          <GlassCard style={styles.modalContentSmall}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Default Tone</Text>
              <TouchableOpacity onPress={() => setToneModalVisible(false)}>
                <Ionicons name="close" size={20} color={THEME.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalListScroll}>
              {TONES.map(t => {
                const isSelected = defaultTone === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => {
                      setDefaultTone(t.id);
                      setToneModalVisible(false);
                    }}
                    style={[styles.modalItem, isSelected && styles.modalItemActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextActive]}>
                      {t.name}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color={THEME.colors.primaryLight} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </GlassCard>
        </View>
      </Modal>
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
    backgroundColor: 'rgba(124, 58, 237, 0.04)', // brand-start subtle glow
    pointerEvents: 'none',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -120,
    right: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(6, 182, 212, 0.04)', // brand-end subtle glow
    pointerEvents: 'none',
  },
  scrollContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 40,
  },
  deleteWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderColor: THEME.colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  deleteWarningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  deleteWarningDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 14,
    marginTop: 2,
  },
  restoreBtn: {
    backgroundColor: THEME.colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  restoreBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
    paddingBottom: 12,
    marginBottom: 20,
  },
  cardHeaderIcon: {
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  avatarBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: THEME.colors.borderLight,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  avatarUploadHover: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarDescContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  avatarDescTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  avatarDescSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 14,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 14,
    color: THEME.colors.textPrimary,
    fontSize: 14,
  },
  fieldHint: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 6,
    lineHeight: 14,
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.borderLight,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 14,
  },
  readOnlyIcon: {
    marginRight: 8,
  },
  readOnlyText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
  uidContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.borderLight,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 14,
  },
  uidText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    flex: 1,
    marginRight: 12,
  },
  copyBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 14,
  },
  dropdownBtnText: {
    fontSize: 14,
    color: THEME.colors.textPrimary,
  },
  keyInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 14,
  },
  keyInput: {
    flex: 1,
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    height: '100%',
  },
  keyEyeBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    marginTop: 12,
    height: 44,
  },
  privacyDescRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  privacyDescTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  privacyDescText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 16,
  },
  dividerSub: {
    height: 1,
    backgroundColor: THEME.colors.border,
  },
  privacyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  privacyActionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exportBtnText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  deleteTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteTriggerText: {
    fontSize: 12,
    color: THEME.colors.danger,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 12,
    height: 48,
    marginBottom: 20,
  },
  // Modal layout
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCloseOverlay: {
    position: 'absolute',
    inset: 0,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    padding: THEME.spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
  },
  modalContentSmall: {
    width: '100%',
    maxHeight: '50%',
    padding: THEME.spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  modalListScroll: {
    flexGrow: 0,
  },
  modalGroup: {
    marginBottom: 14,
  },
  modalGroupHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 6,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
  },
  modalItemActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  modalItemText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  modalItemTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
});
