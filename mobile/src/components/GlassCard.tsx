import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  useGradient?: boolean;
}

export default function GlassCard({ children, style, useGradient = true }: GlassCardProps) {
  if (useGradient) {
    return (
      <LinearGradient
        colors={THEME.colors.glassGradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  return <View style={[styles.card, styles.solidBg, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
    backgroundColor: THEME.colors.surface,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  solidBg: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
  },
});
