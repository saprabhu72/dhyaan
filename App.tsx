import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeScreen } from './src/screens/HomeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';

const NAME_KEY = 'dhyaan_user_name';

export default function App() {
  const [userName, setUserName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(NAME_KEY).then((name) => {
      setUserName(name ?? '');
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  if (!userName) {
    return <OnboardingScreen onComplete={(name) => setUserName(name)} />;
  }

  return <HomeScreen userName={userName} />;
}
