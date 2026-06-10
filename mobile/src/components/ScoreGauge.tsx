import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Easing } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { THEME } from '../constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ScoreGaugeProps {
  score: number; // 0 to 100
  breakdown?: {
    clarity?: number;
    context?: number;
    constraints?: number;
    structure?: number;
    specificity?: number;
  };
}

export default function ScoreGauge({ score, breakdown }: ScoreGaugeProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  const radius = 45;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: score,
      duration: 1000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [score]);

  // Interpolate stroke dash offset
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  // Determine color based on score
  const getScoreColor = (val: number) => {
    if (val >= 75) return THEME.colors.success;
    if (val >= 50) return THEME.colors.warning;
    return THEME.colors.danger;
  };

  const activeColor = getScoreColor(score);

  const renderProgressRow = (label: string, value: number) => {
    const rowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(rowAnim, {
        toValue: value,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false, // width interpolation doesn't support native driver
      }).start();
    }, [value]);

    const barWidth = rowAnim.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    });

    return (
      <View key={label} style={styles.metricRow}>
        <View style={styles.metricLabelRow}>
          <Text style={styles.metricLabel}>{label}</Text>
          <Text style={[styles.metricVal, { color: getScoreColor(value) }]}>{value}/100</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <Animated.View 
            style={[
              styles.progressBarFill, 
              { 
                width: barWidth,
                backgroundColor: getScoreColor(value)
              }
            ]} 
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.circleContainer}>
        <Svg width={110} height={110} viewBox="0 0 110 110">
          <G rotation="-90" origin="55, 55">
            {/* Background Circle */}
            <Circle
              cx="55"
              cy="55"
              r={radius}
              stroke="rgba(15, 23, 42, 0.05)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Foreground Circle */}
            <AnimatedCircle
              cx="55"
              cy="55"
              r={radius}
              stroke={activeColor}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        <View style={styles.scoreTextContainer}>
          <Text style={[styles.scoreNumber, { color: activeColor }]}>
            {score}
          </Text>
          <Text style={styles.scoreLabel}>GRADE</Text>
        </View>
      </View>

      {breakdown && Object.keys(breakdown).length > 0 && (
        <View style={styles.breakdownContainer}>
          <Text style={styles.sectionTitle}>Breakdown Metrics</Text>
          {breakdown.clarity !== undefined && renderProgressRow('Clarity', breakdown.clarity)}
          {breakdown.context !== undefined && renderProgressRow('Context & Scope', breakdown.context)}
          {breakdown.constraints !== undefined && renderProgressRow('Constraints', breakdown.constraints)}
          {breakdown.structure !== undefined && renderProgressRow('Structure', breakdown.structure)}
          {breakdown.specificity !== undefined && renderProgressRow('Specificity', breakdown.specificity)}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.md,
  },
  circleContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },
  scoreTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: THEME.typography.sizes.xxxl,
    fontWeight: THEME.typography.weights.bold,
  },
  scoreLabel: {
    fontSize: THEME.typography.sizes.xxs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textMuted,
    marginTop: -2,
    letterSpacing: 1,
  },
  breakdownContainer: {
    width: '100%',
    marginTop: THEME.spacing.sm,
  },
  sectionTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: THEME.spacing.md,
    letterSpacing: 0.5,
  },
  metricRow: {
    marginBottom: THEME.spacing.sm,
  },
  metricLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.typography.weights.medium,
  },
  metricVal: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: THEME.typography.weights.bold,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    borderRadius: THEME.roundness.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: THEME.roundness.full,
  },
});
