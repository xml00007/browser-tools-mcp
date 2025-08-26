<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { useDataQuery } from '../composables/useDataQuery'

// Types
interface LogEntry {
  timestamp: string
  message: string
  type: string
}

interface FoundResult {
  listItem: any
  detail: any
  page: number
  itemId: any
}

// Use the data query composable to get shared state
const { settings, listUrl, detailUrl, extractBaseUrl } = useDataQuery()

// Form data
const formData = reactive({
  listUrl: '',
  detailUrl: '',
  searchKey: '',
  searchValue: ''
})

// Search state
const isSearching = ref(false)
const searchResults = ref<any[]>([])
const searchLog = ref<LogEntry[]>([])
const currentPage = ref(1)
const totalPages = ref(0)
const foundResult = ref<FoundResult | null>(null)

// Add log entry
const addLog = (message: string, type = 'info') => {
  searchLog.value.push({
    timestamp: new Date().toLocaleTimeString(),
    message,
    type
  })
}

// Watch for changes in useDataQuery settings and update form data
watch([listUrl, detailUrl], ([newListUrl, newDetailUrl]) => {
  if (newListUrl && newListUrl !== formData.listUrl) {
    formData.listUrl = extractBaseUrl(settings.list)
    addLog(`已自动填入列表接口: ${formData.listUrl}`, 'info')
  }
  if (newDetailUrl && newDetailUrl !== formData.detailUrl) {
    formData.detailUrl = extractBaseUrl(settings.detail)
    addLog(`已自动填入详情接口: ${formData.detailUrl}`, 'info')
  }
}, { immediate: true })

// Watch for settings changes to update URLs
watch(() => settings.list, (newList) => {
  if (newList) {
    formData.listUrl = extractBaseUrl(newList)
  }
}, { immediate: true })

watch(() => settings.detail, (newDetail) => {
  if (newDetail) {
    formData.detailUrl = extractBaseUrl(newDetail)
  }
}, { immediate: true })


// Clear logs
const clearLogs = () => {
  searchLog.value = []
  searchResults.value = []
  foundResult.value = null
  currentPage.value = 1
  totalPages.value = 0
}

// Fetch list data with pagination
const fetchListData = async (page: number) => {
  try {
    // Build URL with page parameter
    const url = new URL(formData.listUrl)
    url.searchParams.set('page', page.toString())
    
    addLog(`正在获取第${page}页列表数据: ${url.toString()}`)
    
    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    addLog(`第${page}页列表数据获取成功，包含${data.data?.length || 0}条记录`)
    
    // Update total pages if available
    if (data.totalPages) {
      totalPages.value = data.totalPages
    }
    
    return data.data || data.list || data.items || data
  } catch (error: any) {
    addLog(`获取列表数据失败: ${error.message}`, 'error')
    throw error
  }
}

// Fetch detail data
const fetchDetailData = async (id: string) => {
  try {
    // Build detail URL, assume it uses id parameter
    const url = new URL(formData.detailUrl)
    url.searchParams.set('id', id)
    
    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.data || data
  } catch (error: any) {
    addLog(`获取详情数据失败 (ID: ${id}): ${error.message}`, 'error')
    throw error
  }
}

// Check if detail has target field value
const checkDetailForTarget = (detail: any, key: string, value: string): boolean => {
  // Support nested key paths like "user.profile.name"
  const keys = key.split('.')
  let current = detail
  
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k]
    } else {
      return false
    }
  }
  
  return current === value
}

// Main search function
const startSearch = async () => {
  if (!formData.listUrl || !formData.detailUrl || !formData.searchKey || !formData.searchValue) {
    addLog('请填写所有必需字段', 'error')
    return
  }
  
  isSearching.value = true
  clearLogs()
  
  addLog('开始搜索...', 'info')
  
  try {
    let page = 1
    let found = false
    const maxPages = 50 // 安全限制，避免无限循环
    
    while (!found && page <= maxPages) {
      currentPage.value = page
      
      // Fetch list data
      const listData = await fetchListData(page)
      
      if (!listData || listData.length === 0) {
        addLog('没有更多数据，搜索结束', 'warning')
        break
      }
      
      // Check each item in the list
      for (const item of listData) {
        if (found) break
        
        // Extract ID from list item (support various ID field names)
        const itemId = item.id || item._id || item.uuid || item.key
        if (!itemId) {
          addLog(`列表项缺少ID字段，跳过`, 'warning')
          continue
        }
        
        try {
          // Fetch detail data
          const detail = await fetchDetailData(itemId)
          
          // Check if this detail has the target field value
          if (checkDetailForTarget(detail, formData.searchKey, formData.searchValue)) {
            addLog(`✅ 找到目标数据！ID: ${itemId}, ${formData.searchKey} = ${formData.searchValue}`, 'success')
            foundResult.value = {
              listItem: item,
              detail: detail,
              page: page,
              itemId: itemId
            }
            found = true
            break
          } else {
            // Get current value for logging
            const currentValue = formData.searchKey.split('.').reduce((obj, key) => obj?.[key], detail)
            addLog(`❌ ID: ${itemId}, ${formData.searchKey} = ${currentValue} (不匹配)`)
          }
          
          // Add small delay to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100))
          
        } catch (error: any) {
          addLog(`获取详情失败 (ID: ${itemId}): ${error.message}`, 'error')
          continue
        }
      }
      
      if (!found) {
        page++
        if (totalPages.value > 0 && page > totalPages.value) {
          addLog('已搜索所有页面，未找到目标数据', 'warning')
          break
        }
      }
    }
    
    if (!found) {
      addLog('搜索完成，未找到匹配的数据', 'warning')
    }
    
  } catch (error: any) {
    addLog(`搜索过程中发生错误: ${error.message}`, 'error')
  } finally {
    isSearching.value = false
  }
}

// Stop search
const stopSearch = () => {
  isSearching.value = false
  addLog('搜索已停止', 'warning')
}
</script>

<template>
  <div class="data-query-container">
    <h3>数据查询工具</h3>
    
    <!-- Current Settings Status -->
    <!-- <div v-if="settings.list || settings.detail" class="settings-status">
      <h4>当前接口设置</h4>
      <div v-if="settings.list" class="interface-info">
        <span class="interface-label">列表接口:</span>
        <span class="interface-url">{{ extractBaseUrl(settings.list) }}</span>
        <span class="interface-method">{{ settings.list.method }}</span>
      </div>
      <div v-if="settings.detail" class="interface-info">
        <span class="interface-label">详情接口:</span>
        <span class="interface-url">{{ extractBaseUrl(settings.detail) }}</span>
        <span class="interface-method">{{ settings.detail.method }}</span>
      </div>
    </div> -->
    
    <!-- Search Form -->
    <div class="form-section">
      <div class="form-group">
        <label>列表接口URL:</label>
        <input 
          v-model="formData.listUrl" 
          type="text" 
          placeholder="https://api.example.com/list"
          :disabled="isSearching"
        />
      </div>
      
      <div class="form-group">
        <label>详情接口URL:</label>
        <input 
          v-model="formData.detailUrl" 
          type="text" 
          placeholder="https://api.example.com/detail"
          :disabled="isSearching"
        />
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>搜索字段:</label>
          <input 
            v-model="formData.searchKey" 
            type="text" 
            placeholder="status 或 user.profile.type"
            :disabled="isSearching"
          />
        </div>
        
        <div class="form-group">
          <label>目标值:</label>
          <input 
            v-model="formData.searchValue" 
            type="text" 
            placeholder="active"
            :disabled="isSearching"
          />
        </div>
      </div>
      
      <div class="button-group">
        <button 
          @click="startSearch" 
          :disabled="isSearching"
          class="search-btn"
        >
          {{ isSearching ? '搜索中...' : '开始搜索' }}
        </button>
        
        <button 
          @click="stopSearch" 
          :disabled="!isSearching"
          class="stop-btn"
        >
          停止搜索
        </button>
        
        <button 
          @click="clearLogs"
          :disabled="isSearching"
          class="clear-btn"
        >
          清空日志
        </button>
      </div>
    </div>
    
    <!-- Search Status -->
    <div v-if="isSearching" class="status-section">
      <p>正在搜索第 {{ currentPage }} 页...</p>
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: totalPages > 0 ? `${(currentPage / totalPages) * 100}%` : '50%' }"
        ></div>
      </div>
    </div>
    
    <!-- Found Result -->
    <div v-if="foundResult" class="result-section">
      <h4>🎉 找到目标数据</h4>
      <div class="result-details">
        <p><strong>页码:</strong> {{ foundResult.page }}</p>
        <p><strong>项目ID:</strong> {{ foundResult.itemId }}</p>
        <p><strong>匹配字段:</strong> {{ formData.searchKey }} = {{ formData.searchValue }}</p>
        
        <details>
          <summary>详情数据</summary>
          <pre>{{ JSON.stringify(foundResult.detail, null, 2) }}</pre>
        </details>
      </div>
    </div>
    
    <!-- Search Log -->
    <div class="log-section">
      <h4>搜索日志 ({{ searchLog.length }})</h4>
      <div class="log-container">
        <div 
          v-for="(log, index) in searchLog" 
          :key="index"
          :class="['log-entry', log.type]"
        >
          <span class="timestamp">{{ log.timestamp }}</span>
          <span class="message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.data-query-container {
  /* padding: 16px; */
  font-family: system-ui, -apple-system, sans-serif;
  border-radius: 8px;
  max-width: 800px;
}

.settings-status {
  /* background: #e3f2fd; */
  border: 1px solid #bbdefb;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.settings-status h4 {
  margin: 0 0 12px 0;
  color: #1976d2;
  font-size: 16px;
}

.interface-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  padding: 8px;
  background: white;
  border-radius: 4px;
}

.interface-label {
  font-weight: 600;
  color: #1976d2;
  min-width: 80px;
}

.interface-url {
  flex: 1;
  font-family: monospace;
  background-color: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
  word-break: break-all;
}

.interface-method {
  background-color: #4caf50;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.form-section {
  /* background: white; */
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  color: white;
}

.form-group {
  margin-bottom: 16px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: white;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
}

.form-group input:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
}

.button-group {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-btn {
  background-color: #007bff;
  color: white;
}

.search-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.search-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.stop-btn {
  background-color: #dc3545;
  color: white;
}

.stop-btn:hover:not(:disabled) {
  background-color: #c82333;
}

.stop-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.clear-btn {
  background-color: #6c757d;
  color: white;
}

.clear-btn:hover:not(:disabled) {
  background-color: #545b62;
}

.status-section {
  background: white;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 8px;
}

.progress-fill {
  height: 100%;
  background-color: #007bff;
  transition: width 0.3s ease;
}

.result-section {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.result-section h4 {
  margin: 0 0 12px 0;
  color: #155724;
}

.result-details p {
  margin: 4px 0;
  color: #155724;
}

.result-details details {
  margin-top: 12px;
}

.result-details summary {
  cursor: pointer;
  font-weight: 600;
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.log-section {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.log-section h4 {
  margin: 0;
  padding: 16px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.log-container {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
}

.log-entry {
  display: flex;
  gap: 12px;
  padding: 6px 8px;
  border-radius: 4px;
  margin-bottom: 4px;
  font-size: 13px;
  line-height: 1.4;
}

.log-entry.info {
  background-color: #f8f9fa;
  color: #495057;
}

.log-entry.success {
  background-color: #d4edda;
  color: #155724;
}

.log-entry.warning {
  background-color: #fff3cd;
  color: #856404;
}

.log-entry.error {
  background-color: #f8d7da;
  color: #721c24;
}

.timestamp {
  color: #6c757d;
  font-family: monospace;
  flex-shrink: 0;
  min-width: 80px;
}

.message {
  flex: 1;
  word-break: break-word;
}

pre {
  white-space: pre-wrap;
  word-break: break-all;
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
  border: 1px solid #dee2e6;
  margin: 8px 0;
}
</style>
