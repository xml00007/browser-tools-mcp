import { reactive, onMounted, onUnmounted } from 'vue';
import { useSettings } from './useSettings';

export function useConnection() {
  const { settings, updateSettings } = useSettings();

  const connectionStatus = reactive({
    show: false,
    connected: false,
    text: '',
  });

  let discoveryController: AbortController | null = null;

  const tryServerConnection = async (
    host: string,
    port: number,
  ): Promise<boolean> => {
    if (discoveryController?.signal.aborted) return false;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 500);

    try {
      const response = await fetch(`http://${host}:${port}/.identity`, {
        signal: AbortSignal.any(
          [controller.signal, discoveryController?.signal].filter(
            Boolean,
          ) as AbortSignal[],
        ),
      });
      if (response.ok) {
        const identity = await response.json();
        if (identity.signature === 'mcp-browser-connector-24x7') {
          updateSettings({
            ...settings,
            serverHost: host,
            serverPort: parseInt(identity.port, 10),
          });
          connectionStatus.show = true;
          connectionStatus.connected = true;
          connectionStatus.text = `Discovered ${identity.name} v${identity.version}`;
          return true;
        }
      }
    } catch {
      // Ignore errors during discovery
    } finally {
      clearTimeout(timeoutId);
    }
    return false;
  };

  const discoverServer = async (quietMode = false) => {
    if (discoveryController) {
      discoveryController.abort();
    }
    discoveryController = new AbortController();

    if (!quietMode) {
      connectionStatus.show = true;
      connectionStatus.connected = false;
      connectionStatus.text = 'Discovering server...';
    }

    const hosts = ['localhost', '127.0.0.1'];
    const ports = [
      settings.serverPort,
      3025,
      3026,
      3027,
      3028,
      3029,
      3030,
      3031,
      3032,
      3033,
      3034,
      3035,
    ];
    const uniquePorts = [...new Set(ports)];

    for (const host of hosts) {
      for (const port of uniquePorts) {
        if (await tryServerConnection(host, port)) {
          return;
        }
        if (discoveryController.signal.aborted) return;
      }
    }

    connectionStatus.connected = false;
    connectionStatus.text = 'No server found.';
  };

  const testConnection = async () => {
    if (discoveryController) {
      discoveryController.abort();
    }
    connectionStatus.show = true;
    connectionStatus.connected = false;
    connectionStatus.text = 'Testing connection...';

    if (
      await tryServerConnection(
        settings.serverHost,
        settings.serverPort,
      )
    ) {
      connectionStatus.text = `Connection to ${settings.serverHost}:${settings.serverPort} successful.`;
    } else {
      connectionStatus.text = `Connection to ${settings.serverHost}:${settings.serverPort} failed.`;
    }
  };

  const messageListener = (message: any) => {
    switch (message.type) {
      case 'CONNECTION_STATUS_UPDATE':
        connectionStatus.show = true;
        connectionStatus.connected = message.isConnected;
        connectionStatus.text = message.isConnected
          ? 'Reconnected to server'
          : 'Connection lost';
        break;
      case 'INITIATE_AUTO_DISCOVERY':
        discoverServer(true);
        break;
      case 'SERVER_VALIDATION_SUCCESS':
        connectionStatus.show = true;
        connectionStatus.connected = true;
        connectionStatus.text = `Connected to ${message.serverInfo.name} v${message.serverInfo.version}`;
        break;
      case 'SERVER_VALIDATION_FAILED':
        connectionStatus.show = true;
        connectionStatus.connected = false;
        connectionStatus.text = 'Server validation failed';
        if (
          message.reason === 'connection_error' ||
          message.reason === 'http_error'
        ) {
          discoverServer(true);
        }
        break;
      case 'WEBSOCKET_CONNECTED':
        connectionStatus.show = true;
        connectionStatus.connected = true;
        connectionStatus.text = `Connected via WebSocket`;
        break;
    }
  };

  onMounted(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(messageListener);
    }
    discoverServer(true);
  });

  onUnmounted(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.removeListener(messageListener);
    }
    if (discoveryController) {
      discoveryController.abort();
    }
  });

  return {
    settings,
    updateSettings,
    connectionStatus,
    discoverServer,
    testConnection,
  };
}
