import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path } from 'react-native-svg';

interface LogoProps {
  size?: number;
}

export default function Logo({ size = 28 }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Defs>
        <LinearGradient id="pGradDash" x1="50" y1="165" x2="160" y2="40" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#7c3aed"/>
          <Stop offset="40%" stopColor="#2563eb"/>
          <Stop offset="75%" stopColor="#06b6d4"/>
          <Stop offset="100%" stopColor="#22d3ee"/>
        </LinearGradient>
        <LinearGradient id="speedGradDash" x1="10" y1="90" x2="70" y2="90" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#7c3aed"/>
          <Stop offset="100%" stopColor="#2563eb"/>
        </LinearGradient>
      </Defs>
      <Rect x="42" y="75" width="28" height="10" rx="5" fill="url(#speedGradDash)"/>
      <Rect x="15" y="95" width="18" height="10" rx="5" fill="#7c3aed"/>
      <Rect x="38" y="95" width="32" height="10" rx="5" fill="#2563eb"/>
      <Rect x="15" y="115" width="10" height="8" rx="4" fill="#1d4ed8"/>
      <Rect x="29" y="115" width="18" height="8" rx="4" fill="#2563eb"/>
      <Circle cx="85" cy="100" r="5" fill="#7c3aed"/>
      <Circle cx="102" cy="100" r="5" fill="#3b82f6"/>
      <Circle cx="119" cy="100" r="5" fill="#0ea5e9"/>
      <Path d="M 70 42 H 125 C 158 42, 172 65, 172 90 C 172 115, 158 138, 125 138 H 80 C 70 138, 62 148, 58 165 C 61 146, 70 128, 76 114 H 125 C 140 114, 146 102, 146 90 C 146 78, 140 66, 125 66 H 70 C 63 66, 63 42, 70 42 Z" fill="url(#pGradDash)"/>
    </Svg>
  );
}
