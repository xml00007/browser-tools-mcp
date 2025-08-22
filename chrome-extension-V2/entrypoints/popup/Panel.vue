<template>
    <div class="panel-container">
        <!-- Connect Component -->
        <Connect :settings="settings" @update:settings="updateSettings" ref="connectRef" />
        
        <!-- Settings Component -->
        <Setting :settings="settings" @update:settings="updateSettings" />
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import Connect from './Connect.vue'
import Setting from './Setting.vue'

// Reactive data
const settings = reactive({
    logLimit: 50,
    queryLimit: 30000,
    stringSizeLimit: 500,
    showRequestHeaders: false,
    showResponseHeaders: false,
    maxLogSize: 20000,
    screenshotPath: "",
    serverHost: "localhost",
    serverPort: 3025,
    allowAutoPaste: true
})

// Refs
const connectRef = ref()

// Update settings function
const updateSettings = (newSettings: any) => {
    Object.assign(settings, newSettings)
}

// Save settings function
const saveSettings = () => {
    if (typeof chrome !== 'undefined' && chrome?.storage) {
        chrome.storage.local.set({ browserConnectorSettings: settings })
        // Notify background script about settings change
        chrome.runtime.sendMessage({
            type: "SETTINGS_UPDATED",
            settings: settings,
        })
    }
}

// Load settings on mount
onMounted(() => {
    // Load saved settings from storage
    if (typeof chrome !== 'undefined' && chrome?.storage) {
        chrome.storage.local.get(['browserConnectorSettings'], (result: any) => {
            if (result.browserConnectorSettings) {
                Object.assign(settings, result.browserConnectorSettings)
            }
        })

        // Add listener for background script messages
        chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
            if (message.type === "CONNECTION_STATUS_UPDATE") {
                console.log(
                    `Received connection status update: ${message.isConnected ? "Connected" : "Disconnected"
                    }`
                )
                
                // Forward to Connect component if it exists
                if (connectRef.value && connectRef.value.connectionStatus) {
                    if (message.isConnected) {
                        connectRef.value.connectionStatus.show = true
                        connectRef.value.connectionStatus.connected = true
                        connectRef.value.connectionStatus.text = `Reconnected to server at ${settings.serverHost}:${settings.serverPort}`
                    } else {
                        connectRef.value.connectionStatus.show = true
                        connectRef.value.connectionStatus.connected = false
                        connectRef.value.connectionStatus.text = 'Connection lost'
                    }
                }
            }

            if (message.type === "INITIATE_AUTO_DISCOVERY") {
                console.log(
                    `Initiating auto-discovery after page refresh (reason: ${message.reason})`
                )
                
                // Forward to Connect component
                if (connectRef.value && connectRef.value.discoverServer) {
                    connectRef.value.discoverServer(true)
                }
            }

            // Handle successful server validation
            if (message.type === "SERVER_VALIDATION_SUCCESS") {
                console.log(
                    `Server validation successful: ${message.serverHost}:${message.serverPort}`
                )

                if (connectRef.value && connectRef.value.connectionStatus) {
                    connectRef.value.connectionStatus.show = true
                    connectRef.value.connectionStatus.connected = true
                    connectRef.value.connectionStatus.text = `Connected to ${message.serverInfo.name} v${message.serverInfo.version}`
                }
            }

            // Handle failed server validation
            if (message.type === "SERVER_VALIDATION_FAILED") {
                console.log(
                    `Server validation failed: ${message.reason} - ${message.serverHost}:${message.serverPort}`
                )

                if (connectRef.value && connectRef.value.connectionStatus) {
                    connectRef.value.connectionStatus.show = true
                    connectRef.value.connectionStatus.connected = false
                    connectRef.value.connectionStatus.text = 'Server validation failed'
                }

                // Start auto-discovery if this was a connection error
                if (
                    message.reason === "connection_error" ||
                    message.reason === "http_error"
                ) {
                    if (connectRef.value && connectRef.value.discoverServer) {
                        connectRef.value.discoverServer(true)
                    }
                }
            }

            // Handle successful WebSocket connection
            if (message.type === "WEBSOCKET_CONNECTED") {
                console.log(
                    `WebSocket connected to ${message.serverHost}:${message.serverPort}`
                )

                if (connectRef.value && connectRef.value.connectionStatus) {
                    connectRef.value.connectionStatus.show = true
                    connectRef.value.connectionStatus.connected = true
                    connectRef.value.connectionStatus.text = `Connected via WebSocket to ${message.serverHost}:${message.serverPort}`
                }
            }
        })
    }
})

// Watch for settings changes and save to storage
watch(settings, (newSettings) => {
    saveSettings()
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
