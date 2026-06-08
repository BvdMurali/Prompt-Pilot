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

export default function LibraryScreen({ onNavigateToEditor }: { onNavigateToEditor?: () => void }) {
  const { libraryList, deletePrompt, loading } = useDatabase();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Extract all categories dynamically
  const categories = ['All', ...Array.from(new Set(libraryList.map(item => item.category)))];

  const handleCopy = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', 'Prompt copied to system clipboard.');
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to remove "${title}" from your library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePrompt(id);
            } catch (e) {
              Alert.alert('Error', 'Failed to delete the prompt.');
            }
          }
        }
      ]
    );
  };

  // Filter library list
  const filteredList = libraryList.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = 
      selectedCategory === 'All' || 
      item.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={THEME.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search saved prompts..."
            placeholderTextColor={THEME.colors.textMuted}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories Horizontal Tabs */}
      {categories.length > 1 && (
        <View style={styles.categoriesWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {categories.map((cat) => {
              const isActive = cat === selectedCategory;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.categoryTab,
                    isActive && styles.categoryTabActive
                  ]}
                >
                  <Text style={[
                    styles.categoryText,
                    isActive && styles.categoryTextActive
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Prompts list */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={THEME.colors.primaryLight} size="large" />
          <Text style={styles.loadingText}>Loading synced library...</Text>
        </View>
      ) : filteredList.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <Ionicons name="library-outline" size={60} color={THEME.colors.textMuted} />
          <Text style={styles.emptyTitle}>Empty Library</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery || selectedCategory !== 'All' 
              ? 'No prompts match your search filters.' 
              : 'Save optimized prompts from the Editor to access them here.'}
          </Text>
          {(!searchQuery && selectedCategory === 'All' && onNavigateToEditor) && (
            <CustomButton
              title="Optimize a Prompt Now"
              onPress={onNavigateToEditor}
              icon="sparkles"
              variant="gradient"
              style={styles.emptyBtn}
            />
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent}>
          {filteredList.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <GlassCard key={item.id} style={styles.card}>
                <TouchableOpacity 
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardCategory}>{item.category}</Text>
                    {item.created_at && (
                      <Text style={styles.cardTime}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  
                  <Text 
                    style={[
                      styles.cardSnippet, 
                      isExpanded && styles.cardSnippetExpanded
                    ]}
                    numberOfLines={isExpanded ? undefined : 3}
                  >
                    {item.content}
                  </Text>
                </TouchableOpacity>

                <View style={styles.cardActions}>
                  <TouchableOpacity 
                    onPress={() => handleCopy(item.content)}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="copy-outline" size={16} color={THEME.colors.primaryLight} />
                    <Text style={styles.actionBtnText}>Copy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleDelete(item.id, item.title)}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color={THEME.colors.danger} />
                    <Text style={[styles.actionBtnText, styles.deleteText]}>Delete</Text>
                  </TouchableOpacity>
                </View>
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
  searchHeader: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.sm,
  },
  searchContainer: {
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
  categoriesWrapper: {
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  categoriesScroll: {
    paddingHorizontal: THEME.spacing.lg,
    gap: THEME.spacing.sm,
  },
  categoryTab: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 6,
    borderRadius: THEME.roundness.full,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
  },
  categoryTabActive: {
    borderColor: THEME.colors.primaryLight,
    backgroundColor: 'rgba(129, 140, 248, 0.08)',
  },
  categoryText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.typography.weights.medium,
  },
  categoryTextActive: {
    color: THEME.colors.primaryLight,
    fontWeight: THEME.typography.weights.bold,
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
    textAlign: 'center',
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
  emptyBtn: {
    marginTop: THEME.spacing.xl,
    width: 240,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    padding: THEME.spacing.lg,
  },
  card: {
    padding: THEME.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardCategory: {
    fontSize: THEME.typography.sizes.xxs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.primaryLight,
    textTransform: 'uppercase',
  },
  cardTime: {
    fontSize: THEME.typography.sizes.xxs,
    color: THEME.colors.textMuted,
  },
  cardTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.sm,
  },
  cardSnippet: {
    fontFamily: THEME.typography.fontFamily.mono,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    backgroundColor: 'rgba(0,0,0,0.15)',
    padding: THEME.spacing.sm,
    borderRadius: THEME.roundness.md,
    lineHeight: 18,
  },
  cardSnippetExpanded: {
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: THEME.spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  actionBtnText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.semibold,
    color: THEME.colors.primaryLight,
  },
  deleteBtn: {
    color: THEME.colors.danger,
  },
  deleteText: {
    color: THEME.colors.danger,
  },
});
