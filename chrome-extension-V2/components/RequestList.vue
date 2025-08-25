<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface RequestData {
  type: string
  origin: string
  path: string
  method: string
  requestBody: string
  requestCookies: unknown[]
  requestHeaders: Record<string, unknown>
  responseStatus: number
  responseHeaders: Record<string, unknown>
  responseBody: string
}

const requests = ref<RequestData[]>([])
const selectedIndex = ref<number | null>(null)
const isDebugging = ref(false)

async function getCurrentTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab?.id
}

async function startDebugger() {
  const tabId = await getCurrentTabId()
  if (tabId) {
    chrome.runtime.sendMessage({ type: 'START_DEBUGGER', tabId }, (response) => {
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
    chrome.runtime.sendMessage({ type: 'STOP_DEBUGGER', tabId }, (response) => {
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

function loadRequests() {
  chrome.storage.local.get('requests', (data) => {
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

onMounted(() => {
  loadRequests()
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.requests) {
      loadRequests()
    }
  })
})
</script>

<template>
  <div>
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
      <li v-for="(request, index) in requests" :key="index">
        <div class="request-summary" @click="toggleDetails(index)">
          <span>{{ request.method }}</span>
          <span>{{ request.responseStatus }}</span>
          <span class="url">{{ request.origin }}{{ request.path }}</span>
        </div>
        <div v-if="selectedIndex === index" class="request-details">
          <h4>Request Headers</h4>
          <pre>{{ request.requestHeaders }}</pre>
          <h4>Request Body</h4>
          <pre>{{ request.requestBody }}</pre>
          <h4>Response Headers</h4>
          <pre>{{ request.responseHeaders }}</pre>
          <h4>Response Body</h4>
          <pre>{{ request.responseBody }}</pre>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
ul {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 300px;
  overflow-y: auto;
}

li {
  padding: 4px 0;
  border-bottom: 1px solid #444;
}

.request-summary {
  display: flex;
  justify-content: space-between;
  cursor: pointer;
}

.url {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

span {
  font-size: 12px;
}

.request-details {
  margin-top: 8px;
}

pre {
  white-space: pre-wrap;
  word-break: break-all;
  background-color: #333;
  padding: 8px;
  border-radius: 4px;
  font-size: 11px;
}
</style>
