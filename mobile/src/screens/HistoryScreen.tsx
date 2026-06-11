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
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../context/DatabaseContext';
import { THEME } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import CustomButton from '../components/CustomButton';

export default function HistoryScreen() {
  const { historyList, clearHistory, loading } = useDatabase();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', 'Prompt copied to system clipboard.');
  };

  const handleClearAll = () => {
    if (historyList.length === 0) return;
    
    Alert.alert(
      'Clear History',
      'Are you sure you want to permanently delete all execution history logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            try {
              await clearHistory();
            } catch (e) {
              Alert.alert('Error', 'Failed to clear history logs.');
            }
          }
        }
      ]
    );
  };

  const filteredList = historyList.filter(item => 
    item.original_input.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.optimized_output.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.action_used.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Search and Action Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={THEME.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search history logs..."
            placeholderTextColor={THEME.colors.textMuted}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {historyList.length > 0 && (
          <TouchableOpacity 
            onPress={handleClearAll} 
            style={styles.clearBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color={THEME.colors.danger} />
          </TouchableOpacity>
        )}
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={THEME.colors.primaryLight} size="large" />
          <Text style={styles.loadingText}>Loading synced history...</Text>
        </View>
      ) : filteredList.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <Ionicons name="time-outline" size={60} color={THEME.colors.textMuted} />
          <Text style={styles.emptyTitle}>No History Logs</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery 
              ? 'No records match your search filters.' 
              : 'Your processed prompts will be listed here.'}
          </Text>
        </ScrollView>
      ) : (
        <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent}>
          {filteredList.map((item) => {
            const isExpanded = expandedId === item.id;
            const score = item.metadata?.score?.overall;
            const hasScore = score !== undefined;

            return (
              <GlassCard key={item.id} style={styles.card}>
                <TouchableOpacity 
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                  activeOpacity={0.85}
                  style={styles.cardHeader}
                >
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardActionLabel}>{item.action_used.replace('_', ' ')}</Text>
                    <Text style={styles.cardTime}>
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.original_input}
                    </Text>
                    {hasScore && (
                      <View style={[
                        styles.scoreBadge,
                        { backgroundColor: score >= 75 ? 'rgba(16, 185, 129, 0.1)' : score >= 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
                      ]}>
                        <Text style={[
                          styles.scoreText,
                          { color: score >= 75 ? THEME.colors.success : score >= 50 ? THEME.colors.warning : THEME.colors.danger }
                        ]}>
                          Grade: {score}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.detailContainer}>
                    <Text style={styles.detailLabel}>Original Input</Text>
                    <View style={styles.textContainer}>
                      <Text style={styles.detailText}>{item.original_input}</Text>
                    </View>

                    <Text style={[styles.detailLabel, { marginTop: THEME.spacing.md }]}>Optimized Result</Text>
                    <View style={[styles.textContainer, styles.optimizedContainer]}>
                      <Text style={[styles.detailText, styles.optimizedText]}>{item.optimized_output}</Text>
                    </View>

                    {item.metadata?.model && (
                      <Text style={styles.modelTag}>Processed with: {item.metadata.model}</Text>
                    )}

                    <View style={styles.actionsRow}>
                      <CustomButton
                        title="Copy Result"
                        onPress={() => handleCopy(item.optimized_output)}
                        icon="copy-outline"
                        variant="secondary"
                        style={styles.actionBtn}
                      />
                    </View>
                  </View>
                )}
              </GlassCard>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.sm,
    gap: THEME.spacing.md,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.roundness.lg,
    height: 44,
    paddingHorizontal: THEME.spacing.md,
  },
  searchIcon: {
    marginRight: THEME.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.sm,
  },
  clearBtn: {
    width: 44,
    height: 44,
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.roundness.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.xl,
  },
  loadingText: {
    color: THEME.colors.textMuted,
    fontSize: THEME.typography.sizes.sm,
    marginTop: THEME.spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.xxl,
  },
  emptyTitle: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
    marginTop: THEME.spacing.md,
  },
  emptySubtitle: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textMuted,
    marginTop: THEME.spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 40,
  },
  card: {
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
  },
  cardHeader: {
    width: '100%',
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardActionLabel: {
    fontSize: THEME.typography.sizes.xxs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.primaryLight,
    textTransform: 'uppercase',
  },
  cardTime: {
    fontSize: THEME.typography.sizes.xxs,
    color: THEME.colors.textMuted,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  cardTitle: {
    flex: 1,
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.roundness.sm,
  },
  scoreText: {
    fontSize: THEME.typography.sizes.xxs,
    fontWeight: THEME.typography.weights.bold,
  },
  detailContainer: {
    marginTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
    paddingTop: THEME.spacing.md,
  },
  detailLabel: {
    fontSize: THEME.typography.sizes.xxs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  textContainer: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    padding: THEME.spacing.md,
    borderRadius: THEME.roundness.md,
    marginBottom: THEME.spacing.sm,
  },
  optimizedContainer: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  detailText: {
    fontSize: THEME.typography.sizes.xs + 1,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    fontFamily: THEME.typography.fontFamily.mono,
  },
  optimizedText: {
    color: THEME.colors.textPrimary,
  },
  modelTag: {
    fontSize: THEME.typography.sizes.xxs,
    color: THEME.colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: THEME.spacing.md,
  },
  actionBtn: {
    width: 140,
    height: 38,
  },
});
