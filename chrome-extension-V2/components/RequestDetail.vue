<template>
  <div class="request-detail">
    <div v-if="!request" class="no-request">
      <p>请选择一个请求来查看详细信息</p>
    </div>
    
    <div v-else class="request-content">

      <!-- Request Headers -->
      <!-- <div class="section" v-if="hasRequestHeaders">
        <details>
          <summary class="section-header-inline">
            <h4>请求头 ({{ Object.keys(request.requestHeaders).length }})</h4>
          </summary>
          <div class="headers-content">
            <div v-for="(value, key) in request.requestHeaders" :key="key" class="header-item">
              <span class="header-key">{{ key }}:</span>
              <span class="header-value">{{ value }}</span>
            </div>
          </div>
        </details>
      </div> -->

      <!-- Request Cookies -->
      <div class="section" v-if="hasRequestCookies">
        <details>
          <summary class="section-header-inline">
            <h4>请求 Cookies ({{ request.requestCookies.length }})</h4>
          </summary>
          <div class="cookies-content">
            <div v-for="(cookie, index) in request.requestCookies" :key="index" class="cookie-item">
              <pre>{{ formatCookie(cookie) }}</pre>
            </div>
          </div>
        </details>
      </div>

      <!-- Request Body -->
      <div class="section" v-if="request.requestBody">
        <details open>
          <summary class="section-header-inline">
            <h4>请求体</h4>
            <div class="header-actions" >
              <button @click.prevent="formatRequestBody" class="format-btn">格式化</button>
              <button @click.prevent="copyToClipboard(request.requestBody)" class="copy-btn">复制</button>
            </div>
          </summary>
          <div class="body-content">
            <div class="body-data">
              <pre class="body-pre">{{ formattedRequestBody }}</pre>
            </div>
          </div>
        </details>
      </div>

      <!-- Response Headers -->
      <!-- <div class="section" v-if="hasResponseHeaders">
        <details>
          <summary class="section-header-inline">
            <h4>响应头 ({{ Object.keys(request.responseHeaders).length }})</h4>
          </summary>
          <div class="headers-content">
            <div v-for="(value, key) in request.responseHeaders" :key="key" class="header-item">
              <span class="header-key">{{ key }}:</span>
              <span class="header-value">{{ value }}</span>
            </div>
          </div>
        </details>
      </div> -->

      <!-- Response Body -->
      <div class="section" v-if="request.responseBody">
        <details open>
          <summary class="section-header-inline">
            <h4>响应体</h4>
            <div class="header-actions" >
              <button @click.prevent="formatResponseBody" class="format-btn">格式化</button>
              <button @click.prevent="copyToClipboard(request.responseBody)" class="copy-btn">复制</button>
            </div>
          </summary>
          <div class="body-content">
            <div class="body-data">
              <pre class="body-pre">{{ formattedResponseBody }}</pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

// Props
interface Props {
  request?: RequestData | null
}

const props = withDefaults(defineProps<Props>(), {
  request: null
})

// Reactive data
const formattedRequestBody = ref('')
const formattedResponseBody = ref('')

// Computed properties
const hasRequestHeaders = computed(() => {
  return props.request?.requestHeaders && Object.keys(props.request.requestHeaders).length > 0
})

const hasResponseHeaders = computed(() => {
  return props.request?.responseHeaders && Object.keys(props.request.responseHeaders).length > 0
})

const hasRequestCookies = computed(() => {
  return props.request?.requestCookies && props.request.requestCookies.length > 0
})

// Methods
const getStatusClass = (status: number): string => {
  if (status >= 200 && status < 300) return 'success'
  if (status >= 300 && status < 400) return 'warning'
  if (status >= 400) return 'error'
  return 'default'
}

const formatJSON = (text: string): string => {
  try {
    const parsed = JSON.parse(text)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return text
  }
}

const formatRequestBody = () => {
  if (props.request?.requestBody) {
    formattedRequestBody.value = formatJSON(props.request.requestBody)
  }
}

const formatResponseBody = () => {
  if (props.request?.responseBody) {
    formattedResponseBody.value = formatJSON(props.request.responseBody)
  }
}

const formatCookie = (cookie: unknown): string => {
  if (typeof cookie === 'object' && cookie !== null) {
    return JSON.stringify(cookie, null, 2)
  }
  return String(cookie)
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    console.log('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
  }
}

// Initialize formatted content when request changes
const initializeFormattedContent = () => {
  if (props.request) {
    formattedRequestBody.value = props.request.requestBody || ''
    formattedResponseBody.value = props.request.responseBody || ''
  }
}

// Watch for request changes
import { watch } from 'vue'
watch(() => props.request, () => {
  initializeFormattedContent()
}, { immediate: true })
</script>

<style scoped>
.request-detail {
  height: 100%;
  overflow-y: auto;
  font-family: system-ui, -apple-system, sans-serif;
}

.no-request {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #888888;
  font-style: italic;
}

.request-content {
  padding: 8px;
}

.summary-section {
  margin-bottom: 12px;
  padding: 10px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  border: 1px solid #555;
}

.summary-section h3 {
  margin: 0 0 8px 0;
  color: #ffffff;
  font-size: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.summary-item {
  display: flex;
  align-items: center;
  flex:1;
  gap: 6px;
}

.summary-item label {
  font-weight: 600;
  color: #cccccc;
  min-width: 70px;
  font-size: 12px;
}

.method-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.method-badge.get { background-color: #d4edda; color: #155724; }
.method-badge.post { background-color: #cce5ff; color: #004085; }
.method-badge.put { background-color: #fff3cd; color: #856404; }
.method-badge.delete { background-color: #f8d7da; color: #721c24; }
.method-badge.patch { background-color: #e2e3e5; color: #383d41; }

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.success { background-color: #d4edda; color: #155724; }
.status-badge.warning { background-color: #fff3cd; color: #856404; }
.status-badge.error { background-color: #f8d7da; color: #721c24; }
.status-badge.default { background-color: #e2e3e5; color: #383d41; }

.type-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background-color: #e7f3ff;
  color: #0066cc;
}

.url-text {
  font-family: monospace;
  font-size: 13px;
  word-break: break-all;
  color: #66b3ff;
}

.section {
  margin-bottom: 10px;
}

.section-header {
  background-color: #f8f9fa;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #dee2e6;
  user-select: none;
  border: 1px solid #dee2e6;
  border-radius: 6px;
}

.section-header:hover {
  background-color: #e9ecef;
}

.section-header h4 {
  margin: 0;
  color: #495057;
  font-size: 14px;
}

.section-header-inline {
  padding: 6px 0;
  cursor: pointer;
  user-select: none;
  background: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.section-header-inline:hover {
  color: #007bff;
}

.section-header-inline h4 {
  margin: 0;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  flex: 1;
}

.section-header-inline:hover h4 {
  color: #66b3ff;
}

.header-actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.headers-content {
  padding: 10px;
  padding-left: 20px;
  max-height: 200px;
  overflow-y: auto;
}

.header-item {
  display: flex;
  margin-bottom: 6px;
  padding: 6px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.header-key {
  font-weight: 600;
  color: #ffffff;
  min-width: 150px;
  word-break: break-word;
  font-size: 12px;
}

.header-value {
  color: #cccccc;
  word-break: break-all;
  font-family: monospace;
  font-size: 12px;
}

.cookies-content {
  padding: 10px;
  padding-left: 20px;
  max-height: 200px;
  overflow-y: auto;
}

.cookie-item {
  margin-bottom: 8px;
}

.cookie-item pre {
  background-color: rgba(255, 255, 255, 0.05);
  color: #cccccc;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  margin: 0;
  overflow-x: auto;
}

.body-content {
  /* padding: 10px;
  padding-left: 20px; */
}

.empty-body {
  text-align: center;
  color: #888888;
  font-style: italic;
  padding: 0;
}

.body-data {
  position: relative;
}

/* 按钮已移至标题行，不再需要此样式 */

.format-btn,
.copy-btn {
  padding: 2px 6px;
  border: 1px solid #666;
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}

.format-btn:hover,
.copy-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
  border-color: #888;
}

.body-pre {
  background-color: rgba(255, 255, 255, 0.05);
  color: #cccccc;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.3;
  margin: 0;
  max-height: 250px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid #555;
}

/* Scrollbar styling */
.request-detail::-webkit-scrollbar,
.headers-content::-webkit-scrollbar,
.cookies-content::-webkit-scrollbar,
.body-pre::-webkit-scrollbar {
  width: 6px;
}

.request-detail::-webkit-scrollbar-track,
.headers-content::-webkit-scrollbar-track,
.cookies-content::-webkit-scrollbar-track,
.body-pre::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.request-detail::-webkit-scrollbar-thumb,
.headers-content::-webkit-scrollbar-thumb,
.cookies-content::-webkit-scrollbar-thumb,
.body-pre::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.request-detail::-webkit-scrollbar-thumb:hover,
.headers-content::-webkit-scrollbar-thumb:hover,
.cookies-content::-webkit-scrollbar-thumb:hover,
.body-pre::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Dark theme adjustments for integration */
@media (prefers-color-scheme: dark) {
  .summary-section {
    background-color: #2d3748;
    border-color: #4a5568;
  }
  
  .section {
    border-color: #4a5568;
  }
  
  .section-header {
    background-color: #2d3748;
    border-color: #4a5568;
  }
  
  .section-header:hover {
    background-color: #4a5568;
  }
  
  .header-item,
  .cookie-item pre,
  .body-pre {
    background-color: #2d3748;
    border-color: #4a5568;
  }
  
  .format-btn,
  .copy-btn {
    background-color: #2d3748;
    border-color: #4a5568;
    color: #e2e8f0;
  }
  
  .format-btn:hover,
  .copy-btn:hover {
    background-color: #4a5568;
  }
}
</style>