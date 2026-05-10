import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Radius } from '../theme';

const NAME_KEY = 'dhyaan_user_name';

interface Props {
  onComplete: (name: string) => void;
}

export function OnboardingScreen({ onComplete }: Props) {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? Colors.darkBg : Colors.lightBg;
  const surface = isDark ? Colors.darkSurface : Colors.lightSurface;
  const textPrimary = isDark ? Colors.darkText : Colors.amberText;
  const textSub = isDark ? Colors.darkSubtext : Colors.lightSubtext;

  const [name, setName] = useState('');
  const canBegin = name.trim().length > 0;

  const handleBegin = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await AsyncStorage.setItem(NAME_KEY, trimmed);
    onComplete(trimmed);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={bg}
      />
      <View style={styles.inner}>
        <Text style={[styles.om, { color: Colors.amber }]}>ॐ</Text>
        <Text style={[styles.heading, { color: textPrimary }]}>Welcome to Dhyaan</Text>
        <TextInput
          style={[
            styles.input,
            {
              color: textPrimary,
              backgroundColor: surface,
              borderColor: Colors.amberBorder,
            },
          ]}
          placeholder="Enter your name"
          placeholderTextColor={textSub}
          value={name}
          onChangeText={setName}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={canBegin ? handleBegin : undefined}
        />
        <TouchableOpacity
          style={[
            styles.button,
            {
              borderColor: Colors.amber,
              backgroundColor: canBegin ? Colors.amber : 'transparent',
            },
          ]}
          onPress={handleBegin}
          disabled={!canBegin}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.buttonText,
              { color: canBegin ? Colors.white : Colors.amberBorder },
            ]}
          >
            Begin your practice
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  om: {
    fontSize: Typography.omSymbol,
    fontFamily: 'Georgia',
    lineHeight: Typography.omSymbol + 12,
    marginBottom: Spacing.sm,
  },
  heading: {
    fontSize: Typography.headerLarge,
    fontFamily: 'Georgia',
    fontWeight: '400',
    letterSpacing: 1,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    fontSize: Typography.body,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  button: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: Typography.button,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
