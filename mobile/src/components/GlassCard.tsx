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
    borderRadius: THEME.roundness.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  solidBg: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
  },
});
