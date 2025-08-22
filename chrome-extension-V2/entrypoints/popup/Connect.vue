<template>
  <SettingsSection title="Server Connection Settings">
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
  </SettingsSection>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SettingsSection from '../../components/SettingsSection.vue';
import { useConnection } from '../../composables/useConnection';

const {
  settings,
  updateSettings,
  connectionStatus,
  discoverServer,
  testConnection,
} = useConnection();

const serverHost = computed({
  get: () => settings.serverHost,
  set: (value: string) =>
    updateSettings({ ...settings, serverHost: value }),
});

const serverPort = computed({
  get: () => settings.serverPort,
  set: (value: number) =>
    updateSettings({ ...settings, serverPort: value }),
});
</script>

<style scoped>
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

input[type='number'],
input[type='text'] {
  padding: 4px;
  width: 200px;
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
