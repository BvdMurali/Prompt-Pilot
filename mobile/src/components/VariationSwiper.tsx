import React, { useRef, useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Animated, 
  ScrollView,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface VariationSwiperProps {
  standardText: string;
  variations: string[];
  selectedIndex: number | null; // null = standard improved_text, 0, 1... = variations
  onSelect: (index: number | null) => void;
}

export default function VariationSwiper({ 
  standardText, 
  variations, 
  selectedIndex, 
  onSelect 
}: VariationSwiperProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  
  // Tabs will be ['Std', 'A', 'B', 'C'...]
  const tabs = ['Standard', ...variations.map((_, i) => `Option ${String.fromCharCode(65 + i)}`)];
  const activeIndex = selectedIndex === null ? 0 : selectedIndex + 1;

  // Render horizontal tab buttons
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.sectionTitle}>Variations</Text>
        <View style={styles.rightHeader}>
          <Text style={styles.variationsCount}>{tabs.length} options available</Text>
          <TouchableOpacity 
            onPress={() => setIsMaximized(true)}
            style={styles.maximizeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="expand-outline" size={16} color={THEME.colors.primaryLight} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScroll}
      >
        {tabs.map((tab, idx) => {
          const isActive = idx === activeIndex;
          return (
            <TouchableOpacity
              key={idx}
              onPress={() => {
                if (idx === 0) {
                  onSelect(null);
                } else {
                  onSelect(idx - 1);
                }
              }}
              style={[
                styles.tabButton,
                isActive && styles.tabButtonActive
              ]}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.tabText,
                isActive && styles.tabTextActive
              ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.contentContainer}>
        <ScrollView style={styles.textScroll} nestedScrollEnabled>
          <Text style={styles.promptText}>
            {selectedIndex === null ? standardText : variations[selectedIndex]}
          </Text>
        </ScrollView>
      </View>

      <Modal
        visible={isMaximized}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMaximized(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentMaximized}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Maximized View</Text>
              <TouchableOpacity onPress={() => setIsMaximized(false)}>
                <Ionicons name="close" size={24} color={THEME.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalTextScroll}>
              <Text style={styles.promptTextMaximized}>
                {selectedIndex === null ? standardText : variations[selectedIndex]}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: THEME.spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  maximizeButton: {
    padding: 2,
  },
  sectionTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  variationsCount: {
    fontSize: THEME.typography.sizes.xxs,
    color: THEME.colors.textMuted,
  },
  tabsScroll: {
    gap: THEME.spacing.sm,
    paddingBottom: THEME.spacing.xs,
    marginBottom: THEME.spacing.sm,
  },
  tabButton: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm - 2,
    borderRadius: THEME.roundness.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
  },
  tabButtonActive: {
    borderColor: THEME.colors.primaryLight,
    backgroundColor: 'rgba(129, 140, 248, 0.08)',
  },
  tabText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.medium,
    color: THEME.colors.textSecondary,
  },
  tabTextActive: {
    color: THEME.colors.primaryLight,
    fontWeight: THEME.typography.weights.bold,
  },
  contentContainer: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.roundness.lg,
    padding: THEME.spacing.md,
    height: 160,
  },
  textScroll: {
    flex: 1,
  },
  promptText: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textPrimary,
    lineHeight: 20,
    fontFamily: THEME.typography.fontFamily.mono,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  modalContentMaximized: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.roundness.xl,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    width: '100%',
    height: '80%',
    padding: THEME.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingBottom: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  modalTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  modalTextScroll: {
    flex: 1,
  },
  promptTextMaximized: {
    fontSize: THEME.typography.sizes.md,
    color: THEME.colors.textPrimary,
    lineHeight: 24,
    fontFamily: THEME.typography.fontFamily.mono,
  },
});
