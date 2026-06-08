import React, { useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  Animated, 
  ViewStyle, 
  TextStyle,
  StyleProp
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gradient';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const LAYOUT_KEYS = [
  'position', 'top', 'right', 'bottom', 'left',
  'flex', 'flexGrow', 'flexShrink', 'flexBasis',
  'alignSelf',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
  'width', 'height', 'zIndex'
];

export default function CustomButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}: CustomButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();
  };

  const isGradient = variant === 'gradient';
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';

  // Extract layout styles from the passed style so we can apply them to Animated.View
  const flatStyle = StyleSheet.flatten(style) || {};
  const layoutStyle: ViewStyle = {};
  const buttonStyleOverride: ViewStyle = {};

  Object.keys(flatStyle).forEach((key) => {
    if (LAYOUT_KEYS.includes(key)) {
      (layoutStyle as any)[key] = (flatStyle as any)[key];
    } else {
      (buttonStyleOverride as any)[key] = (flatStyle as any)[key];
    }
  });

  const animatedViewStyle: StyleProp<ViewStyle> = [
    { height: layoutStyle.height ?? 48 }, // default height is 48
    layoutStyle,
    { transform: [{ scale: scaleAnim }] }
  ];

  const buttonStyle: StyleProp<ViewStyle> = [
    styles.button,
    { width: '100%', height: '100%' } as ViewStyle, // fill the Animated.View container
    isPrimary && styles.primaryBtn,
    isSecondary && styles.secondaryBtn,
    isDanger && styles.dangerBtn,
    isGhost && styles.ghostBtn,
    disabled && styles.disabledBtn,
    buttonStyleOverride
  ];

  const textStyles: StyleProp<TextStyle> = [
    styles.text,
    isPrimary && styles.primaryText,
    isSecondary && styles.secondaryText,
    isDanger && styles.dangerText,
    isGhost && styles.ghostText,
    disabled && styles.disabledText,
    textStyle
  ];

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? THEME.colors.primaryLight : '#fff'} size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={16} color={isSecondary || isGhost ? THEME.colors.primaryLight : isDanger ? THEME.colors.danger : '#fff'} style={styles.icon} />}
          <Text 
            style={textStyles}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {title}
          </Text>
        </>
      )}
    </>
  );

  const gradientStyles = [
    styles.gradientFill,
    buttonStyleOverride.borderRadius !== undefined && { borderRadius: buttonStyleOverride.borderRadius }
  ];

  return (
    <Animated.View style={animatedViewStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
        style={buttonStyle}
      >
        {isGradient ? (
          <LinearGradient
            colors={THEME.colors.primaryGradient as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={gradientStyles}
          >
            {renderContent()}
          </LinearGradient>
        ) : (
          renderContent()
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: THEME.roundness.lg,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
    paddingHorizontal: THEME.spacing.md,
  },
  gradientFill: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.roundness.lg, // Default radius to fix Android native view clipping
  },
  primaryBtn: {
    backgroundColor: THEME.colors.primary,
  },
  secondaryBtn: {
    backgroundColor: THEME.colors.surfaceCard,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  dangerBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: THEME.colors.danger,
  },
  ghostBtn: {
    backgroundColor: 'transparent',
  },
  disabledBtn: {
    opacity: 0.5,
    backgroundColor: THEME.colors.surfaceCard,
    borderColor: THEME.colors.border,
  },
  text: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: THEME.typography.weights.semibold,
    color: '#fff',
  },
  primaryText: {
    color: '#fff',
  },
  secondaryText: {
    color: THEME.colors.primaryLight,
  },
  dangerText: {
    color: THEME.colors.danger,
  },
  ghostText: {
    color: THEME.colors.primaryLight,
  },
  disabledText: {
    color: THEME.colors.textMuted,
  },
  icon: {
    marginRight: THEME.spacing.sm,
  },
});
