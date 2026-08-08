
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { SplashScreen } from '@/screens/onboarding/SplashScreen';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 1800);

    return () => clearTimeout(timer);
  }, [router]);

  return <SplashScreen />;
}
