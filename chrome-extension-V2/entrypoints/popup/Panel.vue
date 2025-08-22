<template>
  <div class="panel-container">
    <!-- Quick Actions Section -->
    <div class="settings-section">
      <h3>Quick Actions</h3>
      <div class="quick-actions">
        <button @click="captureScreenshot" class="action-button">
          Capture Screenshot
        </button>
        <button @click="wipeLogs" class="action-button danger">
          Wipe All Logs
        </button>
      </div>
      <div class="checkbox-group-2" style="margin-top: 10px; display: flex; align-items: center;">
        <label>
          <input type="checkbox" v-model="settings.allowAutoPaste">
          Allow Auto-paste to Cursor
        </label>
      </div>
    </div>

    <!-- Screenshot Settings Section -->
    <div class="settings-section">
      <h3>Screenshot Settings</h3>
      <div class="form-group">
        <label for="screenshot-path">Provide a directory to save screenshots to (by default screenshots will be saved to your downloads folder if no path is provided)</label>
        <input 
          type="text" 
          id="screenshot-path" 
          v-model="settings.screenshotPath"
          placeholder="/path/to/screenshots"
        >
      </div>
    </div>

    <!-- Server Connection Settings Section -->
    <div class="settings-section">
      <h3>Server Connection Settings</h3>
      <div class="form-group">
        <label for="server-host">Server Host</label>
        <input 
          type="text" 
          id="server-host" 
          v-model="settings.serverHost"
          placeholder="localhost or IP address"
        >
      </div>
      <div class="form-group">
        <label for="server-port">Server Port</label>
        <input 
          type="number" 
          id="server-port" 
          v-model="settings.serverPort"
          min="1" 
          max="65535"
        >
      </div>
      <div class="quick-actions">
        <button @click="discoverServer" class="action-button">
          Auto-Discover Server
        </button>
        <button @click="testConnection" class="action-button">
          Test Connection
        </button>
      </div>
      <div v-if="connectionStatus.show" style="margin-top: 8px;">
        <span :class="['status-indicator', connectionStatus.connected ? 'status-connected' : 'status-disconnected']"></span>
        <span>{{ connectionStatus.text }}</span>
      </div>
    </div>

    <!-- Advanced Settings Section -->
    <div class="settings-section">
      <div class="settings-header" @click="toggleAdvancedSettings">
        <h3>Advanced Settings</h3>
        <svg 
          :class="['chevron', { 'open': advancedSettingsVisible }]" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      
      <div :class="['settings-content', { 'visible': advancedSettingsVisible }]">
        <div class="form-group">
          <label for="log-limit">Log Limit (number of logs)</label>
          <input 
            type="number" 
            id="log-limit" 
            v-model="settings.logLimit"
            min="1"
          >
        </div>

        <div class="form-group">
          <label for="query-limit">Query Limit (characters)</label>
          <input 
            type="number" 
            id="query-limit" 
            v-model="settings.queryLimit"
            min="1"
          >
        </div>

        <div class="form-group">
          <label for="string-size-limit">String Size Limit (characters)</label>
          <input 
            type="number" 
            id="string-size-limit" 
            v-model="settings.stringSizeLimit"
            min="1"
          >
        </div>

        <div class="form-group">
          <label for="max-log-size">Max Log Size (characters)</label>
          <input 
            type="number" 
            id="max-log-size" 
            v-model="settings.maxLogSize"
            min="1000"
          >
        </div>

        <div class="checkbox-group">
          <label>
            <input type="checkbox" v-model="settings.showRequestHeaders">
            Include Request Headers
          </label>
        </div>

        <div class="checkbox-group">
          <label>
            <input type="checkbox" v-model="settings.showResponseHeaders">
            Include Response Headers
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

// Type definitions for Chrome API
declare global {
  interface Window {
    chrome: {
      storage: {
        sync: {
          get: (keys: string[], callback: (result: any) => void) => void;
          set: (items: any, callback?: () => void) => void;
        };
      };
    };
  }
}

// Reactive data
const advancedSettingsVisible = ref(false)
const connectionStatus = reactive({
  show: false,
  connected: false,
  text: ''
})

const settings = reactive({
  allowAutoPaste: false,
  screenshotPath: '',
  serverHost: '',
  serverPort: 3025,
  logLimit: 50,
  queryLimit: 30000,
  stringSizeLimit: 500,
  maxLogSize: 20000,
  showRequestHeaders: false,
  showResponseHeaders: false
})

// Methods
const toggleAdvancedSettings = () => {
  advancedSettingsVisible.value = !advancedSettingsVisible.value
}

const captureScreenshot = async () => {
  try {
    // Implementation for screenshot capture
    console.log('Capturing screenshot...')
    // Add your screenshot logic here
  } catch (error) {
    console.error('Error capturing screenshot:', error)
  }
}

const wipeLogs = async () => {
  try {
    // Implementation for wiping logs
    console.log('Wiping all logs...')
    // Add your log wiping logic here
  } catch (error) {
    console.error('Error wiping logs:', error)
  }
}

const discoverServer = async () => {
  try {
    // Implementation for server discovery
    console.log('Discovering server...')
    // Add your server discovery logic here
  } catch (error) {
    console.error('Error discovering server:', error)
  }
}

const testConnection = async () => {
  try {
    // Implementation for connection testing
    console.log('Testing connection...')
    connectionStatus.show = true
    connectionStatus.connected = true
    connectionStatus.text = 'Connected successfully'
    // Add your connection test logic here
  } catch (error) {
    console.error('Error testing connection:', error)
    connectionStatus.show = true
    connectionStatus.connected = false
    connectionStatus.text = 'Connection failed'
  }
}

// Load settings on mount
onMounted(() => {
  // Load saved settings from storage
  if (typeof window !== 'undefined' && window.chrome?.storage) {
    window.chrome.storage.sync.get(['panelSettings'], (result: any) => {
      if (result.panelSettings) {
        Object.assign(settings, result.panelSettings)
      }
    })
  }
})

// Watch for settings changes and save to storage
import { watch } from 'vue'
watch(settings, (newSettings) => {
  if (typeof window !== 'undefined' && window.chrome?.storage) {
    window.chrome.storage.sync.set({ panelSettings: newSettings })
  }
}, { deep: true })
</script>

<style scoped>
.panel-container {
  padding: 16px;
  font-family: system-ui, -apple-system, sans-serif;
  background-color: #282828;
  color: #fff;
}

.endpoint-list {
  margin: 16px 0;
}

.endpoint-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.endpoint-form {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  align-items: center;
}

button {
  padding: 4px 8px;
}

input {
  padding: 4px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-connected {
  background: #4caf50;
}

.status-disconnected {
  background: #f44336;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
}

.checkbox-group {
  margin-bottom: 8px;
}

.checkbox-group-2 {
  margin-bottom: 6px;
}

input[type="number"],
input[type="text"] {
  padding: 4px;
  width: 200px;
}

.settings-section {
  border: 1px solid #ccc;
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 4px;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.settings-header h3 {
  margin: 0;
}

.settings-content {
  display: none;
  margin-top: 16px;
}

.settings-content.visible {
  display: block;
}

.chevron {
  width: 20px;
  height: 20px;
  transition: transform 0.3s ease;
}

.chevron.open {
  transform: rotate(180deg);
}

.quick-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.action-button {
  background-color: #4a4a4a;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-button:hover {
  background-color: #5a5a5a;
}

.action-button.danger {
  background-color: #f44336;
}

.action-button.danger:hover {
  background-color: #d32f2f;
}
</style>
