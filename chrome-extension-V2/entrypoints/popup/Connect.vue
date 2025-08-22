<template>
  <div class="settings-section">
    <h3>Server Connection Settings</h3>
    <div class="form-group">
      <label for="server-host">Server Host</label>
      <input
        id="server-host"
        v-model="serverHost"
        type="text"
        placeholder="localhost or IP address"
      />
    </div>
    <div class="form-group">
      <label for="server-port">Server Port</label>
      <input
        id="server-port"
        v-model="serverPort"
        type="number"
        min="1"
        max="65535"
      />
    </div>
    <div class="quick-actions">
      <button class="action-button" @click="() => discoverServer()">
        Auto-Discover Server
      </button>
      <button class="action-button" @click="() => testConnection()">
        Test Connection
      </button>
    </div>
    <div v-if="connectionStatus.show" style="margin-top: 8px">
      <span
        :class="[
          'status-indicator',
          connectionStatus.connected
            ? 'status-connected'
            : 'status-disconnected',
        ]"
      />
      <span>{{ connectionStatus.text }}</span>
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

// Computed refs for two-way binding
const serverHost = computed({
  get: () => props.settings.serverHost,
  set: (value: string) => {
    const newSettings = { ...props.settings, serverHost: value };
    emit('update:settings', newSettings);
  },
});

const serverPort = computed({
  get: () => props.settings.serverPort,
  set: (value: number) => {
    const newSettings = { ...props.settings, serverPort: value };
    emit('update:settings', newSettings);
  },
});

// Connection status
const connectionStatus = reactive({
  show: false,
  connected: false,
  text: '',
});
// Connection tracking state
let serverConnected = ref(false);
let reconnectAttemptTimeout: NodeJS.Timeout | null = null;
let isDiscoveryInProgress = ref(false);
let discoveryController: AbortController | null = null;

// Helper function to cancel ongoing discovery operations
const cancelOngoingDiscovery = () => {
  if (isDiscoveryInProgress.value) {
    console.log('Cancelling ongoing discovery operation');

    // Abort any fetch requests in progress
    if (discoveryController) {
      try {
        discoveryController.abort();
      } catch (error) {
        console.error('Error aborting discovery controller:', error);
      }
      discoveryController = null;
    }

    // Reset the discovery status
    isDiscoveryInProgress.value = false;

    // Clear any pending network timeouts
    if (reconnectAttemptTimeout) {
      clearTimeout(reconnectAttemptTimeout);
      reconnectAttemptTimeout = null;
    }

    console.log('Discovery operation cancelled successfully');
  }
};

// Helper function to try connecting to a server
const tryServerConnection = async (
  host: string,
  port: number,
): Promise<boolean | string> => {
  try {
    // Check if the discovery process was cancelled
    if (!isDiscoveryInProgress.value) {
      return false;
    }

    // Create a local timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 500); // 500ms timeout for each connection attempt

    try {
      // Use identity endpoint for validation
      const response = await fetch(`http://${host}:${port}/.identity`, {
        signal: discoveryController
          ? AbortSignal.any([controller.signal, discoveryController.signal])
          : controller.signal,
      });

      clearTimeout(timeoutId);

      // Check again if discovery was cancelled during the fetch
      if (!isDiscoveryInProgress.value) {
        return false;
      }

      if (response.ok) {
        const identity = await response.json();

        // Verify this is actually our server by checking the signature
        if (identity.signature !== 'mcp-browser-connector-24x7') {
          console.log(
            `Found a server at ${host}:${port} but it's not the Browser Tools server`,
          );
          return false;
        }

        console.log(`Successfully found server at ${host}:${port}`);

        // Update settings with discovered server
        const newSettings = {
          ...props.settings,
          serverHost: host,
          serverPort: parseInt(identity.port, 10),
        };
        emit('update:settings', newSettings);

        connectionStatus.show = true;
        connectionStatus.connected = true;
        connectionStatus.text = `Discovered ${identity.name} v${identity.version} at ${host}:${identity.port}`;

        // Update connection status
        serverConnected.value = true;

        // Clear any scheduled reconnect attempts
        if (reconnectAttemptTimeout) {
          clearTimeout(reconnectAttemptTimeout);
          reconnectAttemptTimeout = null;
        }

        // End the discovery process
        isDiscoveryInProgress.value = false;

        // Successfully found server
        return true;
      }

      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    // Ignore connection errors during discovery
    // But check if it was an abort (cancellation)
    if (error.name === 'AbortError') {
      // Check if this was due to the global discovery cancellation
      if (discoveryController && discoveryController.signal.aborted) {
        console.log('Connection attempt aborted by global cancellation');
        return 'aborted';
      }
      // Otherwise it was just a timeout for this specific connection attempt
      return false;
    }
    console.log(`Connection error for ${host}:${port}: ${error.message}`);
    return false;
  }
};

// Schedule a reconnect attempt if server isn't found
const scheduleReconnectAttempt = () => {
  // Clear any existing reconnect timeout
  if (reconnectAttemptTimeout) {
    clearTimeout(reconnectAttemptTimeout);
  }

  // Schedule a reconnect attempt in 30 seconds
  reconnectAttemptTimeout = setTimeout(() => {
    console.log('Attempting to reconnect to server...');
    // Only show minimal UI during auto-reconnect
    discoverServer(true);
  }, 30000); // 30 seconds
};

// Test connection function
const testConnection = async (host?: string, port?: number) => {
  const targetHost = props.settings.serverHost;
  const targetPort = props.settings.serverPort;

  // Cancel any ongoing discovery operations
  cancelOngoingDiscovery();

  connectionStatus.show = true;
  connectionStatus.connected = false;
  connectionStatus.text = 'Testing connection...';

  // Try multiple endpoints to find the server
  const endpointsToTry = [
    '/.identity',
    '/health',
    '/status',
    '/api/health',
    '/ping',
    '/', // root endpoint
  ];

  for (const endpoint of endpointsToTry) {
    try {
      console.log(
        `Testing endpoint: http://${targetHost}:${targetPort}${endpoint}`,
      );

      const response = await fetch(
        `http://${targetHost}:${targetPort}${endpoint}`,
        {
          signal: AbortSignal.timeout(3000), // 3 second timeout
          method: 'GET',
        },
      );

      console.log(
        `Response from ${endpoint}:`,
        response.status,
        response.statusText,
      );

      if (response.ok) {
        let serverInfo = null;

        try {
          const text = await response.text();
          console.log(`Response body from ${endpoint}:`, text);

          // Try to parse as JSON
          if (text.trim().startsWith('{')) {
            serverInfo = JSON.parse(text);
          }
        } catch (e) {
          console.log('Response is not JSON, treating as text');
        }

        // Check if this looks like our Browser Tools server
        if (
          endpoint === '/.identity' &&
          serverInfo?.signature === 'mcp-browser-connector-24x7'
        ) {
          connectionStatus.connected = true;
          connectionStatus.text = `Connected successfully to ${serverInfo.name} v${serverInfo.version} at ${targetHost}:${targetPort}`;
          serverConnected.value = true;

          // Update settings if different port was discovered
          if (parseInt(serverInfo.port, 10) !== targetPort) {
            console.log(`Detected different port: ${serverInfo.port}`);
            const newSettings = {
              ...props.settings,
              serverPort: parseInt(serverInfo.port, 10),
            };
            emit('update:settings', newSettings);
          }
          return true;
        } else {
          // Server responded but might not be Browser Tools server
          connectionStatus.connected = true;
          connectionStatus.text = `Server found at ${targetHost}:${targetPort}${endpoint} (${response.status}) but may not be Browser Tools server`;
          serverConnected.value = true;

          console.log(
            `Found server at ${endpoint} but signature doesn't match Browser Tools`,
          );
          return true;
        }
      }
    } catch (error: any) {
      console.log(`Failed to connect to ${endpoint}:`, error.message);
      // Continue to next endpoint
    }
  }

  // If we get here, no endpoints responded successfully
  connectionStatus.connected = false;
  connectionStatus.text = `Connection failed: No server found at ${targetHost}:${targetPort}. Tried endpoints: ${endpointsToTry.join(', ')}`;
  serverConnected.value = false;

  // Make sure isDiscoveryInProgress is false
  isDiscoveryInProgress.value = false;
  scheduleReconnectAttempt();
  return false;
};

// Server discovery function
const discoverServer = async (quietMode = false) => {
  // Cancel any ongoing discovery operations before starting a new one
  cancelOngoingDiscovery();

  // Create a new AbortController for this discovery process
  discoveryController = new AbortController();
  isDiscoveryInProgress.value = true;

  // In quiet mode, we don't show the connection status until we either succeed or fail completely
  if (!quietMode) {
    connectionStatus.show = true;
    connectionStatus.connected = false;
    connectionStatus.text = 'Discovering server...';
  }

  try {
    console.log('Starting server discovery process');

    // Add an early cancellation listener
    discoveryController.signal.addEventListener('abort', () => {
      console.log('Discovery aborted via AbortController signal');
      isDiscoveryInProgress.value = false;
    });

    // Common IPs to try (in order of likelihood)
    const hosts = ['localhost', '127.0.0.1'];

    // Add the current configured host if it's not already in the list
    if (
      !hosts.includes(props.settings.serverHost) &&
      props.settings.serverHost !== '0.0.0.0'
    ) {
      hosts.unshift(props.settings.serverHost); // Put at the beginning for priority
    }

    // Add common local network IPs
    const commonLocalIps = ['192.168.0.', '192.168.1.', '10.0.0.', '10.0.1.'];
    for (const prefix of commonLocalIps) {
      for (let i = 1; i <= 5; i++) {
        hosts.push(`${prefix}${i}`);
      }
    }

    // Build port list in a smart order
    const ports = [];
    const configuredPort = parseInt(props.settings.serverPort.toString(), 10);
    ports.push(configuredPort);

    // Add default port if it's not the same as configured
    if (configuredPort !== 3025) {
      ports.push(3025);
    }

    // Add sequential fallback ports
    for (let p = 3026; p <= 3035; p++) {
      if (p !== configuredPort) {
        ports.push(p);
      }
    }

    // Remove duplicates
    const uniquePorts = [...new Set(ports)];
    console.log('Will check ports:', uniquePorts);

    let totalChecked = 0;
    const totalAttempts = hosts.length * uniquePorts.length;

    // Phase 1: Try the most likely combinations first
    console.log('Starting Phase 1: Quick check of high-priority hosts/ports');
    const priorityHosts = hosts.slice(0, 2);
    for (const host of priorityHosts) {
      // Check if discovery was cancelled
      if (!isDiscoveryInProgress.value) {
        console.log('Discovery process was cancelled during Phase 1');
        return false;
      }

      // Try configured port first
      totalChecked++;
      if (!quietMode) {
        connectionStatus.text = `Checking ${host}:${uniquePorts[0]}...`;
      }
      console.log(`Checking ${host}:${uniquePorts[0]}...`);
      const result = await tryServerConnection(host, uniquePorts[0]);

      // Check for cancellation or success
      if (result === 'aborted' || !isDiscoveryInProgress.value) {
        console.log('Discovery process was cancelled');
        return false;
      } else if (result === true) {
        console.log('Server found in priority check');
        if (quietMode) {
          connectionStatus.show = false;
        }
        return true;
      }

      // Then try default port if different
      if (uniquePorts.length > 1) {
        if (!isDiscoveryInProgress.value) {
          console.log('Discovery process was cancelled');
          return false;
        }

        totalChecked++;
        if (!quietMode) {
          connectionStatus.text = `Checking ${host}:${uniquePorts[1]}...`;
        }
        console.log(`Checking ${host}:${uniquePorts[1]}...`);
        const result = await tryServerConnection(host, uniquePorts[1]);

        if (result === 'aborted' || !isDiscoveryInProgress.value) {
          console.log('Discovery process was cancelled');
          return false;
        } else if (result === true) {
          console.log('Server found in priority check');
          if (quietMode) {
            connectionStatus.show = false;
          }
          return true;
        }
      }
    }

    // If we're in quiet mode and the quick checks failed, show the status now
    if (quietMode) {
      connectionStatus.show = true;
      connectionStatus.connected = false;
      connectionStatus.text = 'Searching for server...';
    }

    // Phase 2: Systematic scan of all combinations
    console.log(
      `Starting Phase 2: Full scan (${totalAttempts} total combinations)`,
    );
    connectionStatus.text = `Quick check failed. Starting full scan (${totalChecked}/${totalAttempts})...`;

    // Scan through all hosts and ports
    for (const host of hosts) {
      for (const port of uniquePorts) {
        // Check if discovery was cancelled
        if (!isDiscoveryInProgress.value) {
          console.log('Discovery process was cancelled during full scan');
          return false;
        }

        // Update progress
        totalChecked++;
        connectionStatus.text = `Scanning... (${totalChecked}/${totalAttempts}) - Trying ${host}:${port}`;
        console.log(`Checking ${host}:${port}...`);

        const result = await tryServerConnection(host, port);

        // Check for cancellation or success
        if (result === 'aborted' || !isDiscoveryInProgress.value) {
          console.log('Discovery process was cancelled');
          return false;
        } else if (result === true) {
          console.log(`Server found at ${host}:${port}`);
          return true;
        }
      }
    }

    console.log(
      `Discovery process completed, checked ${totalChecked} combinations, no server found`,
    );
    // If we get here, no server was found
    connectionStatus.connected = false;
    connectionStatus.text =
      'No server found. Please check server is running and try again.';

    serverConnected.value = false;

    // End the discovery process
    isDiscoveryInProgress.value = false;

    // Schedule a reconnect attempt
    scheduleReconnectAttempt();

    return false;
  } catch (error: any) {
    console.error('Error during server discovery:', error);
    connectionStatus.connected = false;
    connectionStatus.text = `Error discovering server: ${error.message}`;

    serverConnected.value = false;

    // End the discovery process
    isDiscoveryInProgress.value = false;

    // Schedule a reconnect attempt
    scheduleReconnectAttempt();

    return false;
  } finally {
    console.log('Discovery process finished');
    // Always clean up
    if (discoveryController) {
      discoveryController = null;
    }
  }
};

// Expose connection status and methods to parent
defineExpose({
  connectionStatus,
  discoverServer,
  testConnection,
});

// Auto-discover server on component load
onMounted(() => {
  discoverServer(true);
});
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
