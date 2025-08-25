<script setup lang="ts">
import { computed } from 'vue'
import SettingsSection from '../../components/SettingsSection.vue'
import { useSettings } from '../../composables/useSettings'

const { settings, updateSettings } = useSettings()

const screenshotPath = computed({
  get: () => settings.screenshotPath,
  set: (value: string) =>
    updateSettings({ ...settings, screenshotPath: value }),
})

const allowAutoPaste = computed({
  get: () => settings.allowAutoPaste,
  set: (value: boolean) =>
    updateSettings({ ...settings, allowAutoPaste: value }),
})

const logLimit = computed({
  get: () => settings.logLimit,
  set: (value: number) => updateSettings({ ...settings, logLimit: value }),
})

const queryLimit = computed({
  get: () => settings.queryLimit,
  set: (value: number) => updateSettings({ ...settings, queryLimit: value }),
})

const stringSizeLimit = computed({
  get: () => settings.stringSizeLimit,
  set: (value: number) =>
    updateSettings({ ...settings, stringSizeLimit: value }),
})

const maxLogSize = computed({
  get: () => settings.maxLogSize,
  set: (value: number) => updateSettings({ ...settings, maxLogSize: value }),
})

const showRequestHeaders = computed({
  get: () => settings.showRequestHeaders,
  set: (value: boolean) =>
    updateSettings({ ...settings, showRequestHeaders: value }),
})

const showResponseHeaders = computed({
  get: () => settings.showResponseHeaders,
  set: (value: boolean) =>
    updateSettings({ ...settings, showResponseHeaders: value }),
})

async function captureScreenshot() {
  try {
    if (typeof chrome !== 'undefined' && chrome?.runtime) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
          const currentTab = tabs[0]
          chrome.runtime.sendMessage(
            {
              type: 'CAPTURE_SCREENSHOT',
              tabId: currentTab.id,
              screenshotPath: settings.screenshotPath,
            },
            (response: { success: boolean, error?: string }) => {
              if (!response || !response.success) {
                console.error('Screenshot capture failed:', response?.error)
              }
            },
          )
        }
      })
    }
  }
  catch (error) {
    console.error('Error capturing screenshot:', error)
  }
}

async function wipeLogs() {
  try {
    const serverUrl = `http://${settings.serverHost}:${settings.serverPort}/wipelogs`
    await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
  }
  catch (error) {
    console.error('Failed to wipe logs:', error)
  }
}
</script>

<template>
  <div>
    <SettingsSection title="Quick Actions">
      <div class="quick-actions">
        <button class="action-button" @click="captureScreenshot">
          Capture Screenshot
        </button>
        <button class="action-button danger" @click="wipeLogs">
          Wipe All Logs
        </button>
      </div>
      <div class="checkbox-group-2" style="margin-top: 10px; display: flex; align-items: center">
        <label>
          <input v-model="allowAutoPaste" type="checkbox">
          Allow Auto-paste to Cursor
        </label>
      </div>
    </SettingsSection>

    <SettingsSection title="Screenshot Settings">
      <div class="form-group">
        <label for="screenshot-path">
          Provide a directory to save screenshots to (by default screenshots
          will be saved to your downloads folder if no path is provided)
        </label>
        <input id="screenshot-path" v-model="screenshotPath" type="text" placeholder="/path/to/screenshots">
      </div>
    </SettingsSection>

    <SettingsSection title="Advanced Settings" :collapsible="true" :start-open="false">
      <div class="form-group">
        <label for="log-limit">Log Limit (number of logs)</label>
        <input id="log-limit" v-model="logLimit" type="number" min="1">
      </div>
      <div class="form-group">
        <label for="query-limit">Query Limit (characters)</label>
        <input id="query-limit" v-model="queryLimit" type="number" min="1">
      </div>
      <div class="form-group">
        <label for="string-size-limit">String Size Limit (characters)</label>
        <input id="string-size-limit" v-model="stringSizeLimit" type="number" min="1">
      </div>
      <div class="form-group">
        <label for="max-log-size">Max Log Size (characters)</label>
        <input id="max-log-size" v-model="maxLogSize" type="number" min="1000">
      </div>
      <div class="checkbox-group">
        <label>
          <input v-model="showRequestHeaders" type="checkbox">
          Include Request Headers
        </label>
      </div>
      <div class="checkbox-group">
        <label>
          <input v-model="showResponseHeaders" type="checkbox">
          Include Response Headers
        </label>
      </div>
    </SettingsSection>
  </div>
</template>

<style scoped>
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

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
}

input[type='text'],
input[type='number'] {
  padding: 4px;
  width: 200px;
}

.checkbox-group {
  margin-bottom: 16px;
}
</style>
