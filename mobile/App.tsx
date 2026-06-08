import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DatabaseProvider } from './src/context/DatabaseContext';
import { THEME } from './src/constants/theme';

// Required so Android closes the OAuth browser tab when it redirects back
WebBrowser.maybeCompleteAuthSession();

import Logo from './src/components/Logo';

// Screens
import AuthScreen from './src/screens/AuthScreen';
import EditorScreen from './src/screens/EditorScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import TemplatesScreen from './src/screens/TemplatesScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';

type TabType = 'editor' | 'library' | 'templates' | 'history' | 'settings';

function AppContent() {
  const { isAuthenticated, loading, isLocalMode } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabType>('editor');
  const [editorPreloadText, setEditorPreloadText] = useState('');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primaryLight} />
        <Text style={styles.loadingText}>Initializing Workspace...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  const handleSendToEditor = (content: string) => {
    setEditorPreloadText(content);
    setCurrentTab('editor');
  };

  const renderActiveScreen = () => {
    switch (currentTab) {
      case 'editor':
        return (
          <EditorScreen 
            preloadText={editorPreloadText} 
            onClearPreloadText={() => setEditorPreloadText('')} 
          />
        );
      case 'library':
        return <LibraryScreen onNavigateToEditor={() => setCurrentTab('editor')} />;
      case 'templates':
        return <TemplatesScreen onSendToEditor={handleSendToEditor} />;
      case 'history':
        return <HistoryScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <EditorScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar style="light" />
      
      {/* Title Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Logo size={22} />
          <Text style={styles.headerTitle}>PromptPilot</Text>
        </View>
        <View style={[
          styles.headerBadge,
          { backgroundColor: isLocalMode ? 'rgba(107, 114, 128, 0.1)' : 'rgba(79, 70, 229, 0.1)' }
        ]}>
          <Text style={[
            styles.headerBadgeText,
            { color: isLocalMode ? THEME.colors.textSecondary : THEME.colors.primaryLight }
          ]}>
            {isLocalMode ? 'Sandbox' : 'Synced'}
          </Text>
        </View>
      </View>

      {/* Screen Workspace */}
      <View style={styles.screenWrapper}>
        {renderActiveScreen()}
      </View>

      {/* Navigation Tab Bar */}
      <View style={styles.tabBar}>
        {(['editor', 'library', 'templates', 'history', 'settings'] as TabType[]).map((tab) => {
          let iconName: any = 'sparkles';
          if (tab === 'library') iconName = 'library-outline';
          else if (tab === 'templates') iconName = 'layout-outline';
          else if (tab === 'history') iconName = 'time-outline';
          else if (tab === 'settings') iconName = 'settings-outline';

          const isActive = currentTab === tab;

          return (
            <TouchableOpacity 
              key={tab} 
              onPress={() => setCurrentTab(tab)}
              style={styles.tabItem}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={isActive ? iconName.replace('-outline', '') : iconName} 
                size={20} 
                color={isActive ? THEME.colors.primaryLight : THEME.colors.textMuted} 
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DatabaseProvider>
        <AppContent />
      </DatabaseProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    paddingTop: Platform.OS === 'android' ? 36 : 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: THEME.colors.textSecondary,
    fontSize: THEME.typography.sizes.sm,
    marginTop: THEME.spacing.sm,
  },
  header: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    backgroundColor: THEME.colors.background,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: THEME.typography.weights.bold,
    color: '#fff',
  },
  headerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.roundness.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  headerBadgeText: {
    fontSize: THEME.typography.sizes.xxs,
    fontWeight: THEME.typography.weights.bold,
  },
  screenWrapper: {
    flex: 1,
  },
  tabBar: {
    height: 60,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    paddingBottom: Platform.OS === 'ios' ? 12 : 4,
    paddingTop: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: THEME.typography.sizes.xxs,
    color: THEME.colors.textMuted,
    marginTop: 2,
    fontWeight: THEME.typography.weights.medium,
  },
  tabLabelActive: {
    color: THEME.colors.primaryLight,
    fontWeight: THEME.typography.weights.bold,
  },
});
