import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'Manga Translator',
    description: 'Local-first automatic manga translation overlay',
    version: '0.1.0',
    // Manifest version is controlled by WXT's target (chrome-mv3 by default).
    permissions: ['activeTab', 'storage', 'offscreen'],
    optional_host_permissions: ['*://*/*'],
    action: {
      default_popup: 'popup.html',
    },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
  },
  vite: () => ({
    plugins: [react()],
    build: {
      target: 'es2022',
    },
  }),
});
