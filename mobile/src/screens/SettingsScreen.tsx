import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { supabase } from '../services/supabase';
import { THEME } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import CustomButton from '../components/CustomButton';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MODELS = [
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Default)', provider: 'Google' },
  { id: 'gemini-3.5-pro', name: 'Gemini 3.5 Pro', provider: 'Google' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' }
];

export default function SettingsScreen() {
  const { user, logout, isLocalMode, apiUrl, token } = useAuth();
  const { syncData } = useDatabase();

  const [preferredModel, setPreferredModel] = useState('gemini-3.5-flash');
  const [loadingSettings, setLoadingSettings] = useState(false);
  
  // Soft delete tracking
  const [deletedAt, setDeletedAt] = useState<string | null>(null);
  const [syncingDeleteState, setSyncingDeleteState] = useState(false);

  useEffect(() => {
    loadUserSettings();
  }, [isLocalMode, user]);

  const loadUserSettings = async () => {
    if (isLocalMode || !user) {
      // Local storage lookup
      try {
        const localModel = await localStorageGet('pp_preferred_model');
        if (localModel) setPreferredModel(localModel);
      } catch (e) {
        console.warn('Failed to load local model preference');
      }
      return;
    }

    try {
      setLoadingSettings(true);
      // Fetch settings from DB
      const { data: dbSettings, error } = await supabase
        .from('settings')
        .select('preferred_model')
        .eq('user_id', user.id)
        .single();

      if (!error && dbSettings) {
        setPreferredModel(dbSettings.preferred_model);
      }

      // Fetch soft delete state from users profile
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

  const handleModelChange = async (modelId: string) => {
    setPreferredModel(modelId);
    if (isLocalMode) {
      await localStorageSet('pp_preferred_model', modelId);
      return;
    }

    try {
      const { error } = await supabase
        .from('settings')
        .update({ preferred_model: modelId })
        .eq('user_id', user!.id);

      if (error) throw error;
    } catch (e) {
      Alert.alert('Error', 'Failed to update preferred model in the database.');
    }
  };

  // Helper local storage wrappers
  const localStorageGet = async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const localStorageSet = async (key: string, val: string) => {
    try {
      await AsyncStorage.setItem(key, val);
    } catch {}
  };

  // Soft delete procedures
  const handleInitiateDelete = () => {
    if (isLocalMode || !user) {
      Alert.alert('Sandbox Clean', 'You are in local sandbox mode. Sign out to clear cache data.');
      return;
    }

    Alert.alert(
      'Initiate Account Deletion',
      'Are you sure? Your account will be marked for deletion. You will have a 30-day grace period to restore your profile before all data is permanently deleted.',
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
              Alert.alert('Scheduled', 'Your account has been soft-deleted. You can restore it anytime in settings within 30 days.');
              syncData(); // Reload RLS states
            } catch (e) {
              Alert.alert('Failed Deactivation', 'Could not soft delete profile at this time.');
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
      Alert.alert('Profile Restored', 'Your PromptPilot profile has been reactivated. Cloud syncing resumed.');
      syncData();
    } catch (e) {
      Alert.alert('Restoration Failed', 'Could not restore user account. Contact administration.');
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Sync State Banner */}
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
      <GlassCard style={styles.profileCard}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={28} color={THEME.colors.textSecondary} />
          </View>
          <View>
            <Text style={styles.profileName}>
              {isLocalMode ? 'Sandbox User' : user?.name || 'Synced Profile'}
            </Text>
            <Text style={styles.profileEmail}>
              {isLocalMode ? 'Running in offline local mode' : user?.email || 'Connected'}
            </Text>
          </View>
          <View style={[
            styles.syncBadge, 
            { backgroundColor: isLocalMode ? 'rgba(107, 114, 128, 0.1)' : 'rgba(16, 185, 129, 0.1)' }
          ]}>
            <Text style={[
              styles.syncBadgeText, 
              { color: isLocalMode ? THEME.colors.textSecondary : THEME.colors.success }
            ]}>
              {isLocalMode ? 'Local' : 'Cloud'}
            </Text>
          </View>
        </View>
      </GlassCard>

      {/* Model Selection */}
      <Text style={styles.sectionTitle}>Prompting Configuration</Text>
      <GlassCard style={styles.optionsCard}>
        <Text style={styles.cardHeader}>Preferred AI Model</Text>
        <Text style={styles.cardSubheader}>This model will be queried by default for prompt generation.</Text>
        
        {loadingSettings ? (
          <ActivityIndicator color={THEME.colors.primaryLight} style={{ marginVertical: THEME.spacing.md }} />
        ) : (
          <View style={styles.modelList}>
            {MODELS.map((m) => {
              const isSelected = preferredModel === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => handleModelChange(m.id)}
                  style={[
                    styles.modelItem,
                    isSelected && styles.modelItemActive
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={styles.modelCheck}>
                    <Ionicons 
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'} 
                      size={18} 
                      color={isSelected ? THEME.colors.primaryLight : THEME.colors.textMuted} 
                    />
                  </View>
                  <View>
                    <Text style={[styles.modelName, isSelected && styles.modelNameActive]}>{m.name}</Text>
                    <Text style={styles.modelProvider}>{m.provider} Integration</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </GlassCard>

      {/* System Settings Details */}
      <Text style={styles.sectionTitle}>Connection Details</Text>
      <GlassCard style={styles.connectionCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Gateway URL</Text>
          <Text style={styles.infoVal}>{apiUrl}</Text>
        </View>
        <View style={[styles.infoRow, { marginTop: THEME.spacing.sm }]}>
          <Text style={styles.infoLabel}>Local Cache</Text>
          <Text style={styles.infoVal}>Sync Database Configured</Text>
        </View>
      </GlassCard>

      {/* Deletion & Sign Out Actions */}
      <View style={styles.actionContainer}>
        <CustomButton
          title="Sign Out / Change Workspace"
          onPress={logout}
          icon="log-out-outline"
          variant="secondary"
          style={styles.signOutBtn}
        />

        {!isLocalMode && (
          <TouchableOpacity 
            onPress={handleInitiateDelete} 
            disabled={deletedAt !== null}
            style={[
              styles.deleteBtn,
              deletedAt !== null && styles.deleteBtnDisabled
            ]}
          >
            <Ionicons name="trash-outline" size={16} color={THEME.colors.danger} />
            <Text style={styles.deleteText}>Initiate Profile Deactivation</Text>
          </TouchableOpacity>
        )}
      </View>
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
  deleteWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: THEME.colors.danger,
    borderWidth: 1,
    borderRadius: THEME.roundness.lg,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
    gap: THEME.spacing.md,
  },
  deleteWarningTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.bold,
    color: '#fff',
  },
  deleteWarningDesc: {
    fontSize: THEME.typography.sizes.xxs + 1,
    color: THEME.colors.textSecondary,
    lineHeight: 14,
    marginTop: 2,
  },
  restoreBtn: {
    backgroundColor: THEME.colors.danger,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 6,
    borderRadius: THEME.roundness.md,
  },
  restoreBtnText: {
    color: '#fff',
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
  },
  profileCard: {
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.xl,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: THEME.roundness.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  profileEmail: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  syncBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.roundness.sm,
  },
  syncBadgeText: {
    fontSize: THEME.typography.sizes.xxs,
    fontWeight: THEME.typography.weights.bold,
  },
  sectionTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: THEME.spacing.md,
  },
  optionsCard: {
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.xl,
  },
  cardHeader: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  cardSubheader: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    marginTop: 4,
    marginBottom: THEME.spacing.md,
    lineHeight: 16,
  },
  modelList: {
    gap: THEME.spacing.sm,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.roundness.md,
    gap: THEME.spacing.md,
  },
  modelItemActive: {
    borderColor: THEME.colors.primaryLight,
    backgroundColor: 'rgba(129, 140, 248, 0.03)',
  },
  modelCheck: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelName: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.medium,
    color: THEME.colors.textSecondary,
  },
  modelNameActive: {
    color: THEME.colors.primaryLight,
    fontWeight: THEME.typography.weights.bold,
  },
  modelProvider: {
    fontSize: THEME.typography.sizes.xxs,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  connectionCard: {
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
  },
  infoVal: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    fontFamily: THEME.typography.fontFamily.mono,
  },
  actionContainer: {
    gap: THEME.spacing.md,
    alignItems: 'center',
  },
  signOutBtn: {
    width: '100%',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: THEME.spacing.sm,
    marginTop: THEME.spacing.sm,
  },
  deleteBtnDisabled: {
    opacity: 0.3,
  },
  deleteText: {
    fontSize: THEME.typography.sizes.xs + 1,
    color: THEME.colors.danger,
    fontWeight: THEME.typography.weights.semibold,
  },
});
