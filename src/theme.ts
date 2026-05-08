import { Platform } from 'react-native';

export const Colors = {
  amber: '#EF9F27',
  amberLight: '#FAEEDA',
  amberText: '#BA7517',
  amberDim: 'rgba(239, 159, 39, 0.3)',
  amberBorder: 'rgba(239, 159, 39, 0.6)',

  // Dark mode
  darkBg: '#1A1208',
  darkSurface: '#2A1E0A',
  darkText: '#F5DFA8',
  darkSubtext: '#C9A55A',

  // Light mode
  lightBg: '#FAEEDA',
  lightSurface: '#FDF3E0',
  lightText: '#BA7517',
  lightSubtext: '#C97A1A',

  white: '#FFFFFF',
  black: '#000000',
};

export const Typography = {
  serifFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  sansFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',

  omSymbol: 72,
  shantiSize: 64,
  headerLarge: 28,
  headerSmall: 14,
  countdownLarge: 36,
  body: 16,
  small: 13,
  button: 17,
  stepper: 22,
  stepperValue: 28,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  pill: 100,
  md: 12,
  sm: 8,
};
