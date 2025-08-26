import { onMounted, reactive, watch } from 'vue'

// Chrome API types
declare const chrome: any

// Define the settings object with default values
const settings = reactive<BrowserConnectorSettings>({
  logLimit: 50,
  queryLimit: 30000,
  stringSizeLimit: 500,
  showRequestHeaders: false,
  showResponseHeaders: false,
  maxLogSize: 20000,
  screenshotPath: '',
  serverHost: 'localhost',
  serverPort: 3025,
  allowAutoPaste: true,
  showDataQuery: false,
})

// Function to save settings to chrome storage
function saveSettings() {
  if (typeof chrome !== 'undefined' && chrome?.storage) {
    chrome.storage.local.set({ browserConnectorSettings: { ...settings } })
    // Notify background script about settings change
    chrome.runtime.sendMessage({
      type: 'SETTINGS_UPDATED',
      settings: { ...settings },
    })
  }
}

// Function to load settings from chrome storage
function loadSettings() {
  if (typeof chrome !== 'undefined' && chrome?.storage) {
    chrome.storage.local.get(
      ['browserConnectorSettings'],
      (result: { browserConnectorSettings?: Partial<BrowserConnectorSettings> }) => {
        if (result.browserConnectorSettings) {
          Object.assign(settings, result.browserConnectorSettings)
        }
      },
    )
  }
}

// Watch for settings changes and save them
watch(
  settings,
  () => {
    saveSettings()
  },
  { deep: true },
)

// The composable function
export function useSettings() {
  // Load settings when the composable is first used
  onMounted(() => {
    loadSettings()
  })

  const updateSettings = (newSettings: Partial<BrowserConnectorSettings>) => {
    Object.assign(settings, newSettings)
  }

  return {
    settings,
    updateSettings,
  }
}
