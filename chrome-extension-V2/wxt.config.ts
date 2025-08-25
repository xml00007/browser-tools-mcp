import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    permissions: ['activeTab',
      'downloads',
      'tabs',
      'scripting',
      'storage',
      'debugger',
      'tabCapture',
      'windows',
      'webRequest',
      'sidePanel',],
    action: {
      default_title: 'Browser Tools',
    },
    side_panel: {
      default_path: 'sidePanel.html',
    },
    host_permissions: ['<all_urls>'],
    // side_panel: {
    //   default_path: 'sidepanel.html',
    // },
  },
})
