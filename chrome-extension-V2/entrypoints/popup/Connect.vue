<!-- @source cursor @line_count 256 @branch main -->
<template>
    <div class="panel-container">
        <!-- Server Connection Settings Section -->
        <div class="settings-section">
            <h3>Server Connection Settings</h3>
            <div class="form-group">
                <label for="server-host">Server Host</label>
                <input type="text" id="server-host" v-model="settings.serverHost" placeholder="localhost or IP address">
            </div>
            <div class="form-group">
                <label for="server-port">Server Port</label>
                <input type="number" id="server-port" v-model="settings.serverPort" min="1" max="65535">
            </div>
            <div class="quick-actions">
                <button @click="() => discoverServer()" class="action-button">
                    Auto-Discover Server
                </button>
                <button @click="() => testConnection()" class="action-button">
                    Test Connection
                </button>
            </div>
            <div v-if="connectionStatus.show" style="margin-top: 8px;">
                <span
                    :class="['status-indicator', connectionStatus.connected ? 'status-connected' : 'status-disconnected']"></span>
                <span>{{ connectionStatus.text }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'

// Reactive data
const connectionStatus = reactive({
    show: false,
    connected: false,
    text: ''
})

const settings = reactive({
    serverHost: "localhost",
    serverPort: 3025
})

// Connection tracking state
let serverConnected = ref(false)
let reconnectAttemptTimeout: NodeJS.Timeout | null = null
let isDiscoveryInProgress = ref(false)
let discoveryController: AbortController | null = null

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

// Helper function to cancel ongoing discovery operations
const cancelOngoingDiscovery = () => {
    if (isDiscoveryInProgress.value) {
        console.log("Cancelling ongoing discovery operation")

        // Abort any fetch requests in progress
        if (discoveryController) {
            try {
                discoveryController.abort()
            } catch (error) {
                console.error("Error aborting discovery controller:", error)
            }
            discoveryController = null
        }

        // Reset the discovery status
        isDiscoveryInProgress.value = false

        // Clear any pending network timeouts
        if (reconnectAttemptTimeout) {
            clearTimeout(reconnectAttemptTimeout)
            reconnectAttemptTimeout = null
        }

        console.log("Discovery operation cancelled successfully")
    }
}

// Helper function to try connecting to a server
const tryServerConnection = async (host: string, port: number): Promise<boolean | string> => {
    try {
        // Check if the discovery process was cancelled
        if (!isDiscoveryInProgress.value) {
            return false
        }

        // Create a local timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
            controller.abort()
        }, 500) // 500ms timeout for each connection attempt

        try {
            // Use identity endpoint for validation
            const response = await fetch(`http://${host}:${port}/.identity`, {
                signal: discoveryController
                    ? AbortSignal.any([controller.signal, discoveryController.signal])
                    : controller.signal,
            })

            clearTimeout(timeoutId)

            // Check again if discovery was cancelled during the fetch
            if (!isDiscoveryInProgress.value) {
                return false
            }

            if (response.ok) {
                const identity = await response.json()

                // Verify this is actually our server by checking the signature
                if (identity.signature !== "mcp-browser-connector-24x7") {
                    console.log(
                        `Found a server at ${host}:${port} but it's not the Browser Tools server`
                    )
                    return false
                }

                console.log(`Successfully found server at ${host}:${port}`)

                // Update settings with discovered server
                settings.serverHost = host
                settings.serverPort = parseInt(identity.port, 10)
                saveSettings()

                connectionStatus.show = true
                connectionStatus.connected = true
                connectionStatus.text = `Discovered ${identity.name} v${identity.version} at ${host}:${identity.port}`

                // Update connection status
                serverConnected.value = true

                // Clear any scheduled reconnect attempts
                if (reconnectAttemptTimeout) {
                    clearTimeout(reconnectAttemptTimeout)
                    reconnectAttemptTimeout = null
                }

                // End the discovery process
                isDiscoveryInProgress.value = false

                // Successfully found server
                return true
            }

            return false
        } finally {
            clearTimeout(timeoutId)
        }
    } catch (error: any) {
        // Ignore connection errors during discovery
        // But check if it was an abort (cancellation)
        if (error.name === "AbortError") {
            // Check if this was due to the global discovery cancellation
            if (discoveryController && discoveryController.signal.aborted) {
                console.log("Connection attempt aborted by global cancellation")
                return "aborted"
            }
            // Otherwise it was just a timeout for this specific connection attempt
            return false
        }
        console.log(`Connection error for ${host}:${port}: ${error.message}`)
        return false
    }
}

// Schedule a reconnect attempt if server isn't found
const scheduleReconnectAttempt = () => {
    // Clear any existing reconnect timeout
    if (reconnectAttemptTimeout) {
        clearTimeout(reconnectAttemptTimeout)
    }

    // Schedule a reconnect attempt in 30 seconds
    reconnectAttemptTimeout = setTimeout(() => {
        console.log("Attempting to reconnect to server...")
        // Only show minimal UI during auto-reconnect
        discoverServer(true)
    }, 30000) // 30 seconds
}

// Test connection function
const testConnection = async () => {
    const targetHost = settings.serverHost
    const targetPort = settings.serverPort

    // Cancel any ongoing discovery operations
    cancelOngoingDiscovery()

    connectionStatus.show = true
    connectionStatus.connected = false
    connectionStatus.text = 'Testing connection...'

    // Try multiple endpoints to find the server
    const endpointsToTry = [
        '/.identity',
        '/health',
        '/status',
        '/api/health',
        '/ping',
        '/' // root endpoint
    ]

    for (const endpoint of endpointsToTry) {
        try {
            console.log(`Testing endpoint: http://${targetHost}:${targetPort}${endpoint}`)

            const response = await fetch(`http://${targetHost}:${targetPort}${endpoint}`, {
                signal: AbortSignal.timeout(3000), // 3 second timeout
                method: 'GET'
            })

            console.log(`Response from ${endpoint}:`, response.status, response.statusText)

            if (response.ok) {
                let serverInfo = null

                try {
                    const text = await response.text()
                    console.log(`Response body from ${endpoint}:`, text)

                    // Try to parse as JSON
                    if (text.trim().startsWith('{')) {
                        serverInfo = JSON.parse(text)
                    }
                } catch (e) {
                    console.log('Response is not JSON, treating as text')
                }

                // Check if this looks like our Browser Tools server
                if (endpoint === '/.identity' && serverInfo?.signature === "mcp-browser-connector-24x7") {
                    connectionStatus.connected = true
                    connectionStatus.text = `Connected successfully to ${serverInfo.name} v${serverInfo.version} at ${targetHost}:${targetPort}`
                    serverConnected.value = true

                    // Update settings if different port was discovered
                    if (parseInt(serverInfo.port, 10) !== targetPort) {
                        console.log(`Detected different port: ${serverInfo.port}`)
                        settings.serverPort = parseInt(serverInfo.port, 10)
                        saveSettings()
                    }
                    return true
                } else {
                    // Server responded but might not be Browser Tools server
                    connectionStatus.connected = true
                    connectionStatus.text = `Server found at ${targetHost}:${targetPort}${endpoint} (${response.status}) but may not be Browser Tools server`
                    serverConnected.value = true

                    console.log(`Found server at ${endpoint} but signature doesn't match Browser Tools`)
                    return true
                }
            }
        } catch (error: any) {
            console.log(`Failed to connect to ${endpoint}:`, error.message)
            // Continue to next endpoint
        }
    }

    // If we get here, no endpoints responded successfully
    connectionStatus.connected = false
    connectionStatus.text = `Connection failed: No server found at ${targetHost}:${targetPort}. Tried endpoints: ${endpointsToTry.join(', ')}`
    serverConnected.value = false

    // Make sure isDiscoveryInProgress is false
    isDiscoveryInProgress.value = false
    scheduleReconnectAttempt()
    return false
}

// Server discovery function
const discoverServer = async (quietMode = false) => {
    // Cancel any ongoing discovery operations before starting a new one
    cancelOngoingDiscovery()

    // Create a new AbortController for this discovery process
    discoveryController = new AbortController()
    isDiscoveryInProgress.value = true

    // In quiet mode, we don't show the connection status until we either succeed or fail completely
    if (!quietMode) {
        connectionStatus.show = true
        connectionStatus.connected = false
        connectionStatus.text = 'Discovering server...'
    }

    try {
        console.log("Starting server discovery process")

        // Add an early cancellation listener
        discoveryController.signal.addEventListener("abort", () => {
            console.log("Discovery aborted via AbortController signal")
            isDiscoveryInProgress.value = false
        })

        // Common IPs to try (in order of likelihood)
        const hosts = ["localhost", "127.0.0.1"]

        // Add the current configured host if it's not already in the list
        if (
            !hosts.includes(settings.serverHost) &&
            settings.serverHost !== "0.0.0.0"
        ) {
            hosts.unshift(settings.serverHost) // Put at the beginning for priority
        }

        // Build port list in a smart order
        const ports = []
        const configuredPort = parseInt(settings.serverPort.toString(), 10)
        ports.push(configuredPort)

        // Add default port if it's not the same as configured
        if (configuredPort !== 3025) {
            ports.push(3025)
        }

        // Add sequential fallback ports
        for (let p = 3026; p <= 3035; p++) {
            if (p !== configuredPort) {
                ports.push(p)
            }
        }

        // Remove duplicates
        const uniquePorts = [...new Set(ports)]
        console.log("Will check ports:", uniquePorts)

        // Try all hosts and ports combinations
        for (const host of hosts) {
            for (const port of uniquePorts) {
                // Check if discovery was cancelled
                if (!isDiscoveryInProgress.value) {
                    console.log("Discovery process was cancelled")
                    return false
                }

                console.log(`Checking ${host}:${port}...`)
                const result = await tryServerConnection(host, port)

                // Check for cancellation or success
                if (result === "aborted" || !isDiscoveryInProgress.value) {
                    console.log("Discovery process was cancelled")
                    return false
                } else if (result === true) {
                    console.log(`Server found at ${host}:${port}`)
                    return true
                }
            }
        }

        console.log("Discovery process completed, no server found")
        // If we get here, no server was found
        connectionStatus.connected = false
        connectionStatus.text = "No server found. Please check server is running and try again."

        serverConnected.value = false

        // End the discovery process
        isDiscoveryInProgress.value = false

        // Schedule a reconnect attempt
        scheduleReconnectAttempt()

        return false
    } catch (error: any) {
        console.error("Error during server discovery:", error)
        connectionStatus.connected = false
        connectionStatus.text = `Error discovering server: ${error.message}`

        serverConnected.value = false

        // End the discovery process
        isDiscoveryInProgress.value = false

        // Schedule a reconnect attempt
        scheduleReconnectAttempt()

        return false
    } finally {
        console.log("Discovery process finished")
        // Always clean up
        if (discoveryController) {
            discoveryController = null
        }
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

            // Automatically discover server on panel load with quiet mode enabled
            discoverServer(true)
        })

        // Add listener for connection status updates from background script
        chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
            if (message.type === "CONNECTION_STATUS_UPDATE") {
                console.log(
                    `Received connection status update: ${message.isConnected ? "Connected" : "Disconnected"
                    }`
                )

                // Update UI based on connection status
                if (message.isConnected) {
                    if (!serverConnected.value) {
                        serverConnected.value = true
                        connectionStatus.show = true
                        connectionStatus.connected = true
                        connectionStatus.text = `Reconnected to server at ${settings.serverHost}:${settings.serverPort}`
                    }
                } else {
                    serverConnected.value = false
                    connectionStatus.show = true
                    connectionStatus.connected = false
                    connectionStatus.text = 'Connection lost'
                }
            }

            if (message.type === "INITIATE_AUTO_DISCOVERY") {
                console.log(
                    `Initiating auto-discovery after page refresh (reason: ${message.reason})`
                )

                // For page refreshes, always cancel any ongoing discovery and restart
                if (message.reason === "page_refresh" || message.forceRestart === true) {
                    // Cancel any ongoing discovery operation
                    cancelOngoingDiscovery()

                    connectionStatus.show = true
                    connectionStatus.connected = false
                    connectionStatus.text = "Page refreshed. Restarting server discovery..."

                    // Start a new discovery process with quiet mode
                    console.log("Starting fresh discovery after page refresh")
                    discoverServer(true)
                }
                // For other types of auto-discovery requests, only start if not already in progress
                else if (!isDiscoveryInProgress.value) {
                    discoverServer(true)
                }
            }

            // Handle successful server validation
            if (message.type === "SERVER_VALIDATION_SUCCESS") {
                console.log(
                    `Server validation successful: ${message.serverHost}:${message.serverPort}`
                )

                serverConnected.value = true
                connectionStatus.show = true
                connectionStatus.connected = true
                connectionStatus.text = `Connected to ${message.serverInfo.name} v${message.serverInfo.version}`
            }

            // Handle failed server validation
            if (message.type === "SERVER_VALIDATION_FAILED") {
                console.log(
                    `Server validation failed: ${message.reason} - ${message.serverHost}:${message.serverPort}`
                )

                serverConnected.value = false
                connectionStatus.show = true
                connectionStatus.connected = false
                connectionStatus.text = 'Server validation failed'

                // Start auto-discovery if this was a connection error
                if (
                    message.reason === "connection_error" ||
                    message.reason === "http_error"
                ) {
                    if (!isDiscoveryInProgress.value) {
                        console.log("Starting auto-discovery after validation failure")
                        discoverServer(true)
                    }
                }
            }

            // Handle successful WebSocket connection
            if (message.type === "WEBSOCKET_CONNECTED") {
                console.log(
                    `WebSocket connected to ${message.serverHost}:${message.serverPort}`
                )

                if (!serverConnected.value) {
                    serverConnected.value = true
                    connectionStatus.show = true
                    connectionStatus.connected = true
                    connectionStatus.text = `Connected via WebSocket to ${message.serverHost}:${message.serverPort}`
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
</style>
