import { onMounted, reactive, watch } from 'vue'

// Define the settings object with default values
const settings = reactive({
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
})

interface Settings {
  logLimit: number
  queryLimit: number
  stringSizeLimit: number
  showRequestHeaders: boolean
  showResponseHeaders: boolean
  maxLogSize: number
  screenshotPath: string
  serverHost: string
  serverPort: number
  allowAutoPaste: boolean
}

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
      (result: { browserConnectorSettings?: Partial<Settings> }) => {
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

  const updateSettings = (newSettings: Partial<Settings>) => {
    Object.assign(settings, newSettings)
  }

  return {
    settings,
    updateSettings,
  }
}
