import type { ExpoConfig } from 'expo/config';

// Single source of truth for app config (app.json was removed in its favour).
// EXPO_PUBLIC_* variables are inlined into the client bundle by Expo at build
// time; see .env.example for the required keys. No secret key exists anywhere
// in this project — Paystack's pk_test_ key is publishable by design.
const config: ExpoConfig = {
  name: 'The Book Nook',
  slug: 'booknook',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
};

export default config;
