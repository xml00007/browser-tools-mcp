import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    permissions: [
      'activeTab',
      'downloads',
      'tabs',
      'scripting',
      'storage',
      'debugger',
      'tabCapture',
      'windows',
    ],
    host_permissions: [
      'http://localhost/*',
      'https://localhost/*',
      '*://*.google.com/*',
    ],
  },
});
