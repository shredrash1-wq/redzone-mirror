import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.redzone.app',
  appName: 'REDZONE',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      '*.tmdb.org',
      '*.themoviedb.org',
      '*.videasy.to',
      '*.vidlink.pro',
      '*.autoembed.cc',
      '*.vidsrc.icu',
      '*.smashystream.com',
      '*.2embed.cc',
      '*.vidking.net'
    ]
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0a0c',
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a0a0c',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0c',
      overlay: true
    }
  }
};

export default config;
