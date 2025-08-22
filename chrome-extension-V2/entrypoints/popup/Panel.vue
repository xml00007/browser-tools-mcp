/* @source cursor @line_count 174 @branch main*/
<template>
  <div class="panel-container">
    <!-- Connect Component -->
    <Connect
      ref="connectRef"
      :settings="settings"
      @update:settings="updateSettings"
    />

    <!-- Settings Component -->
    <Setting :settings="settings" @update:settings="updateSettings" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import Connect from './Connect.vue';
import Setting from './Setting.vue';

// Reactive data
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
});

// Refs
const connectRef = ref();

// Update settings function
const updateSettings = (_newSettings: any) => {
  Object.assign(settings, _newSettings);
};

// Save settings function
const saveSettings = () => {
  if (typeof chrome !== 'undefined' && chrome?.storage) {
    chrome.storage.local.set({ browserConnectorSettings: settings });
    // Notify background script about settings change
    chrome.runtime.sendMessage({
      type: 'SETTINGS_UPDATED',
      settings: settings,
    });
  }
};

// Load settings on mount
onMounted(() => {
  // Load saved settings from storage
  if (typeof chrome !== 'undefined' && chrome?.storage) {
    chrome.storage.local.get(['browserConnectorSettings'], (result: any) => {
      if (result.browserConnectorSettings) {
        Object.assign(settings, result.browserConnectorSettings);
      }
    });

    // Add listener for background script messages
    chrome.runtime.onMessage.addListener(
      (message: any, _sender: any, _sendResponse: any) => {
        if (message.type === 'CONNECTION_STATUS_UPDATE') {
          console.log(
            `Received connection status update: ${
              message.isConnected ? 'Connected' : 'Disconnected'
            }`,
          );

          // Forward to Connect component if it exists
          if (connectRef.value && connectRef.value.connectionStatus) {
            if (message.isConnected) {
              connectRef.value.connectionStatus.show = true;
              connectRef.value.connectionStatus.connected = true;
              connectRef.value.connectionStatus.text = `Reconnected to server at ${settings.serverHost}:${settings.serverPort}`;
            } else {
              connectRef.value.connectionStatus.show = true;
              connectRef.value.connectionStatus.connected = false;
              connectRef.value.connectionStatus.text = 'Connection lost';
            }
          }
        }

        if (message.type === 'INITIATE_AUTO_DISCOVERY') {
          console.log(
            `Initiating auto-discovery after page refresh (reason: ${message.reason})`,
          );

          // Forward to Connect component
          if (connectRef.value && connectRef.value.discoverServer) {
            connectRef.value.discoverServer(true);
          }
        }

        // Handle successful server validation
        if (message.type === 'SERVER_VALIDATION_SUCCESS') {
          console.log(
            `Server validation successful: ${message.serverHost}:${message.serverPort}`,
          );

          if (connectRef.value && connectRef.value.connectionStatus) {
            connectRef.value.connectionStatus.show = true;
            connectRef.value.connectionStatus.connected = true;
            connectRef.value.connectionStatus.text = `Connected to ${message.serverInfo.name} v${message.serverInfo.version}`;
          }
        }

        // Handle failed server validation
        if (message.type === 'SERVER_VALIDATION_FAILED') {
          console.log(
            `Server validation failed: ${message.reason} - ${message.serverHost}:${message.serverPort}`,
          );

          if (connectRef.value && connectRef.value.connectionStatus) {
            connectRef.value.connectionStatus.show = true;
            connectRef.value.connectionStatus.connected = false;
            connectRef.value.connectionStatus.text = 'Server validation failed';
          }

          // Start auto-discovery if this was a connection error
          if (
            message.reason === 'connection_error' ||
            message.reason === 'http_error'
          ) {
            if (connectRef.value && connectRef.value.discoverServer) {
              connectRef.value.discoverServer(true);
            }
          }
        }

        // Handle successful WebSocket connection
        if (message.type === 'WEBSOCKET_CONNECTED') {
          console.log(
            `WebSocket connected to ${message.serverHost}:${message.serverPort}`,
          );

          if (connectRef.value && connectRef.value.connectionStatus) {
            connectRef.value.connectionStatus.show = true;
            connectRef.value.connectionStatus.connected = true;
            connectRef.value.connectionStatus.text = `Connected via WebSocket to ${message.serverHost}:${message.serverPort}`;
          }
        }
      },
    );
  }
});

// Watch for settings changes and save to storage
watch(
  settings,
  () => {
    saveSettings();
  },
  { deep: true },
);
</script>

<style scoped>
.panel-container {
  padding: 16px;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  background-color: #282828;
  color: #fff;
}
</style>
