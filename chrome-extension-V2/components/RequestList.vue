<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useDataQuery } from '../composables/useDataQuery'
import RequestDetail from './RequestDetail.vue'

// Chrome API types
declare const chrome: any

// Types for Chrome API callbacks
type ChromeResponse = any
type ChromeStorageData = any
type ChromeStorageChanges = any

// Use the data query composable
const { settings, setListInterface, setDetailInterface, extractBaseUrl } = useDataQuery()

// Helper function to check if a request is currently set as list or detail interface
const isCurrentListInterface = (request: RequestData): boolean => {
  return settings.list !== null && 
         extractBaseUrl(settings.list) === extractBaseUrl(request)
}

const isCurrentDetailInterface = (request: RequestData): boolean => {
  return settings.detail !== null && 
         extractBaseUrl(settings.detail) === extractBaseUrl(request)
}

const requests = ref<RequestData[]>([])
const selectedIndex = ref<number | null>(null)
const isDebugging = ref(false)

// Get the currently selected request
const selectedRequest = computed(() => {
  if (selectedIndex.value !== null && requests.value[selectedIndex.value]) {
    return requests.value[selectedIndex.value]
  }
  return null
})

async function getCurrentTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab?.id
}

async function startDebugger() {
  const tabId = await getCurrentTabId()
  if (tabId) {
    chrome.runtime.sendMessage({ type: 'START_DEBUGGER', tabId }, (response: ChromeResponse) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message)
        return
      }
      if (response.success) {
        isDebugging.value = true
        console.log('Debugger started')
      }
    })
  }
}

async function stopDebugger() {
  const tabId = await getCurrentTabId()
  if (tabId) {
    chrome.runtime.sendMessage({ type: 'STOP_DEBUGGER', tabId }, (response: ChromeResponse) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message)
        return
      }
      if (response.success) {
        isDebugging.value = false
        console.log('Debugger stopped')
      }
    })
  }
}

// Interface setting functions are now provided by useDataQuery composable

function loadRequests() {
  chrome.storage.local.get('requests', (data: ChromeStorageData) => {
    requests.value = data.requests || []
  })
}

function toggleDetails(index: number) {
  if (selectedIndex.value === index) {
    selectedIndex.value = null
  }
  else {
    selectedIndex.value = index
  }
}

function cleanRequests() {
  chrome.storage.local.set({ requests: [] })
  requests.value = []
}

// Helper function to get status class for styling
const getStatusClass = (status: number): string => {
  if (status >= 200 && status < 300) return 'success'
  if (status >= 300 && status < 400) return 'warning'
  if (status >= 400) return 'error'
  return 'default'
}

onMounted(() => {
  loadRequests()
  chrome.storage.onChanged.addListener((changes: ChromeStorageChanges, namespace: string) => {
    if (namespace === 'local' && changes.requests) {
      loadRequests()
    }
  })
})
</script>

<template>
  <div class="request-list">
    <h3>HTTP Requests</h3>
    <button :disabled="isDebugging" style="margin-right: 10px;" @click="startDebugger">
      Start Listening
    </button>
    <button :disabled="!isDebugging" style="margin-right: 10px;" @click="stopDebugger">
      Stop Listening
    </button>
    <button style="margin-right: 10px;" @click="loadRequests">
      Refresh
    </button>
    <button @click="cleanRequests">
      Clean
    </button>
    <ul>
      <li v-for="(request, index) in requests" :key="index" :class="{ 'selected': selectedIndex === index }">
        <div class="request-summary" @click="toggleDetails(index)">
          <span class="method-badge" :class="request.method.toLowerCase()">{{ request.method }}</span>
          <span class="status-badge" :class="getStatusClass(request.responseStatus)">{{ request.responseStatus }}</span>
          <span class="url">{{ request.path }}</span>
          <span class="expand-icon" :class="{ 'expanded': selectedIndex === index }">▼</span>
        </div>
        <div v-if="selectedIndex === index" class="request-details">
          <div class="request-actions">
            <button 
              class="action-btn" 
              :class="{ 'active': isCurrentListInterface(request) }"
              @click.stop="setListInterface(request)"
            >
              {{ isCurrentListInterface(request) ? '✓ 列表' : '列表' }}
            </button>
            <button 
              class="action-btn" 
              :class="{ 'active': isCurrentDetailInterface(request) }"
              @click.stop="setDetailInterface(request)"
            >
              {{ isCurrentDetailInterface(request) ? '✓ 详情' : '详情' }}
            </button>
          </div>
          
          <!-- Use the RequestDetail component -->
          <div class="request-detail-container">
            <RequestDetail :request="request" />
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.request-list {
  margin-bottom: 14px;
  color: white;
}

.request-list h3 {
  color: white;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
  /* max-height: 100%; */
  /* overflow-y: auto; */
}

li {
  padding: 0;
  border-bottom: 1px solid #555;
  transition: background-color 0.2s;
}

li:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

li.selected {
  background-color: rgba(255, 255, 255, 0.15);
}

.request-summary {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 12px;
  gap: 12px;
}

.method-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  min-width: 50px;
  text-align: center;
}

.method-badge.get { background-color: #d4edda; color: #155724; }
.method-badge.post { background-color: #cce5ff; color: #004085; }
.method-badge.put { background-color: #fff3cd; color: #856404; }
.method-badge.delete { background-color: #f8d7da; color: #721c24; }
.method-badge.patch { background-color: #e2e3e5; color: #383d41; }

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  min-width: 40px;
  text-align: center;
}

.status-badge.success { background-color: #d4edda; color: #155724; }
.status-badge.warning { background-color: #fff3cd; color: #856404; }
.status-badge.error { background-color: #f8d7da; color: #721c24; }
.status-badge.default { background-color: #e2e3e5; color: #383d41; }

.url {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: monospace;
  font-size: 11px;
  color: #ccc;
}

.expand-icon {
  font-size: 10px;
  color: #ccc;
  transition: transform 0.2s;
  width: 16px;
  text-align: center;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.request-details {
  margin-top: 4px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #555;
}

.request-actions {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  background-color: rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid #555;
}

.request-detail-container {
  max-height: 400px;
  overflow-y: auto;
}

.action-btn {
  padding: 4px 10px;
  border: 1px solid #666;
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 11px;
  font-weight: 500;
}

.action-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
  border-color: #888;
}

.action-btn.active {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

.action-btn.active:hover {
  background-color: #0056b3;
  border-color: #004085;
}
</style>
