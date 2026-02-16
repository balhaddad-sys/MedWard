import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.medward.pro',
  appName: 'MedWard Pro',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    cleartext: true,
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1000,
      backgroundColor: '#1e40af',
      showSpinner: false,
    },
  },
}

export default config
