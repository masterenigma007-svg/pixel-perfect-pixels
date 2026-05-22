import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.relationshipsaver.translator',
  appName: 'Relationship Saver',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    backgroundColor: '#1a1330',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#1a1330',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: false,
      backgroundColor: '#1a1330',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a1330',
      overlaysWebView: false,
    },
  },
};

export default config;
