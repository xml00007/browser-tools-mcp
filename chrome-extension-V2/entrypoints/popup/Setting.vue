/* @source cursor @line_count 331 @branch main*/
<template>
  <div>
    <!-- Quick Actions Section -->
    <div class="settings-section">
      <h3>Quick Actions</h3>
      <div class="quick-actions">
        <button class="action-button" @click="captureScreenshot">
          Capture Screenshot
        </button>
        <button class="action-button danger" @click="wipeLogs">
          Wipe All Logs
        </button>
      </div>
      <div
        class="checkbox-group-2"
        style="margin-top: 10px; display: flex; align-items: center"
      >
        <label>
          <input v-model="allowAutoPaste" type="checkbox" />
          Allow Auto-paste to Cursor
        </label>
      </div>
    </div>

    <!-- Screenshot Settings Section -->
    <div class="settings-section">
      <h3>Screenshot Settings</h3>
      <div class="form-group">
        <label for="screenshot-path"
          >Provide a directory to save screenshots to (by default screenshots
          will be saved to your downloads folder if no path is provided)</label
        >
        <input
          id="screenshot-path"
          v-model="screenshotPath"
          type="text"
          placeholder="/path/to/screenshots"
        />
      </div>
    </div>

    <!-- Advanced Settings Section -->
    <div class="settings-section">
      <div class="settings-header" @click="toggleAdvancedSettings">
        <h3>Advanced Settings</h3>
        <svg
          :class="['chevron', { open: advancedSettingsVisible }]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <div :class="['settings-content', { visible: advancedSettingsVisible }]">
        <div class="form-group">
          <label for="log-limit">Log Limit (number of logs)</label>
          <input id="log-limit" type="number" v-model="logLimit" min="1" />
        </div>

        <div class="form-group">
          <label for="query-limit">Query Limit (characters)</label>
          <input id="query-limit" type="number" v-model="queryLimit" min="1" />
        </div>

        <div class="form-group">
          <label for="string-size-limit">String Size Limit (characters)</label>
          <input
            id="string-size-limit"
            v-model="stringSizeLimit"
            type="number"
            min="1"
          />
        </div>

        <div class="form-group">
          <label for="max-log-size">Max Log Size (characters)</label>
          <input
            id="max-log-size"
            v-model="maxLogSize"
            type="number"
            min="1000"
          />
        </div>

        <div class="checkbox-group">
          <label>
            <input v-model="showRequestHeaders" type="checkbox" />
            Include Request Headers
          </label>
        </div>

        <div class="checkbox-group">
          <label>
            <input v-model="showResponseHeaders" type="checkbox" />
            Include Response Headers
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue';

// Props from parent
interface Props {
  settings: any;
}

const props = defineProps<Props>();

// Emits for updating parent
const emit = defineEmits(['update:settings']);

// Computed refs for two-way binding with all settings
const screenshotPath = computed({
  get: () => props.settings.screenshotPath,
  set: (value: string) => {
    const newSettings = { ...props.settings, screenshotPath: value };
    emit('update:settings', newSettings);
  },
});

const allowAutoPaste = computed({
  get: () => props.settings.allowAutoPaste,
  set: (value: boolean) => {
    const newSettings = { ...props.settings, allowAutoPaste: value };
    emit('update:settings', newSettings);
  },
});

const logLimit = computed({
  get: () => props.settings.logLimit,
  set: (value: number) => {
    const newSettings = { ...props.settings, logLimit: value };
    emit('update:settings', newSettings);
  },
});

const queryLimit = computed({
  get: () => props.settings.queryLimit,
  set: (value: number) => {
    const newSettings = { ...props.settings, queryLimit: value };
    emit('update:settings', newSettings);
  },
});

const stringSizeLimit = computed({
  get: () => props.settings.stringSizeLimit,
  set: (value: number) => {
    const newSettings = { ...props.settings, stringSizeLimit: value };
    emit('update:settings', newSettings);
  },
});

const maxLogSize = computed({
  get: () => props.settings.maxLogSize,
  set: (value: number) => {
    const newSettings = { ...props.settings, maxLogSize: value };
    emit('update:settings', newSettings);
  },
});

const showRequestHeaders = computed({
  get: () => props.settings.showRequestHeaders,
  set: (value: boolean) => {
    const newSettings = { ...props.settings, showRequestHeaders: value };
    emit('update:settings', newSettings);
  },
});

const showResponseHeaders = computed({
  get: () => props.settings.showResponseHeaders,
  set: (value: boolean) => {
    const newSettings = { ...props.settings, showResponseHeaders: value };
    emit('update:settings', newSettings);
  },
});

// Local state
const advancedSettingsVisible = ref(false);

// Methods
const toggleAdvancedSettings = () => {
  advancedSettingsVisible.value = !advancedSettingsVisible.value;
};

const captureScreenshot = async () => {
  try {
    if (typeof chrome !== 'undefined' && chrome?.runtime) {
      // Get the current active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
          const currentTab = tabs[0];

          // Send message to background script to capture screenshot
          chrome.runtime.sendMessage(
            {
              type: 'CAPTURE_SCREENSHOT',
              tabId: currentTab.id,
              screenshotPath: props.settings.screenshotPath,
            },
            (response: any) => {
              console.log('Screenshot capture response:', response);
              if (!response) {
                console.error(
                  'Screenshot capture failed: No response received',
                );
              } else if (!response.success) {
                console.error('Screenshot capture failed:', response.error);
              } else {
                console.log('Screenshot captured successfully:', response.path);
              }
            },
          );
        } else {
          console.error('No active tab found');
        }
      });
    }
  } catch (error) {
    console.error('Error capturing screenshot:', error);
  }
};

const wipeLogs = async () => {
  try {
    const serverUrl = `http://${props.settings.serverHost}:${props.settings.serverPort}/wipelogs`;
    console.log(`Sending wipe request to ${serverUrl}`);

    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await response.json();
    console.log('Logs wiped successfully:', result.message);
  } catch (error: any) {
    console.error('Failed to wipe logs:', error);
  }
};
</script>

<style scoped>
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
}

input[type='number'],
input[type='text'] {
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
