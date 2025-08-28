<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { useDataQuery } from '../composables/useDataQuery'
import { useDataAnalysis, type AnalysisConfig } from '../composables/useDataAnalysis'
import { useLogger } from '../composables/useLogger'
import { getNestedValue, createDebounce } from '../utils/common'

interface FoundResult {
  listItem: any
  detail: any
  page: number
  itemId: any
}

// Use composables
const { settings, listUrl, detailUrl, extractBaseUrl } = useDataQuery()
const { 
  analysisState, 
  startAnalysis, 
  stopAnalysis, 
  updateConfig, 
} = useDataAnalysis()
const { info, warn, error, logUserAction, logPerformance, logApiCall } = useLogger('DataQuery')

// Form data
const formData = reactive({
  listUrl: '',
  detailUrl: '',
  searchKey: '',
  searchValue: '',
  maxConcurrency: 5
})

// Analysis mode toggle
const useAnalysisMode = ref(true)

// Search state (legacy mode)
const isSearching = ref(false)
const searchResults = ref<any[]>([])
const currentPage = ref(1)
const totalPages = ref(0)
const foundResult = ref<FoundResult | null>(null)

// Computed properties for unified state
const isRunning = computed(() => useAnalysisMode.value ? analysisState.isRunning : isSearching.value)

const progress = computed(() => {
  if (useAnalysisMode.value && analysisState.total > 0) {
    return {
      current: analysisState.progress,
      total: analysisState.total,
      percentage: Math.round((analysisState.progress / analysisState.total) * 100)
    }
  }
  return null
})



// Watch for changes in useDataQuery settings and update form data
watch([listUrl, detailUrl], ([newListUrl, newDetailUrl]) => {
  if (newListUrl && newListUrl !== formData.listUrl) {
    formData.listUrl = extractBaseUrl(settings.list)
    info('自动填入列表接口', { url: formData.listUrl }, ['auto-fill', 'list-interface'])
  }
  if (newDetailUrl && newDetailUrl !== formData.detailUrl) {
    formData.detailUrl = extractBaseUrl(settings.detail)
    info('自动填入详情接口', { url: formData.detailUrl }, ['auto-fill', 'detail-interface'])
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

// 防抖的配置更新函数
const debouncedUpdateConfig = createDebounce((config: Partial<AnalysisConfig>) => {
  updateConfig(config)
}, 500)

// Watch form data changes and update analysis config
watch(() => [formData.searchKey, formData.searchValue, formData.maxConcurrency], 
  ([searchKey, searchValue, maxConcurrency]) => {
    if (useAnalysisMode.value) {
      // 使用防抖函数，避免频繁更新配置
      debouncedUpdateConfig({
        searchField: String(searchKey),
        targetValue: String(searchValue),
        maxConcurrency: Number(maxConcurrency)
      })
    }
  }
)

// Clear state
const clearState = () => {
  logUserAction(`清空${useAnalysisMode.value ? '分析' : '搜索'}状态`)
  
  // 清空搜索相关状态
  searchResults.value = []
  foundResult.value = null
  currentPage.value = 1
  totalPages.value = 0
  
  info('用户界面状态已清空', { 
    mode: useAnalysisMode.value ? 'analysis' : 'legacy-search' 
  }, ['state-clear', 'user-action'])
}

// Fetch list data with pagination
const fetchListData = async (page: number) => {
  const startTime = Date.now()
  try {
    // Build URL with page parameter
    const url = new URL(formData.listUrl)
    url.searchParams.set('page', page.toString())
    
    info(`开始获取第${page}页列表数据`, { 
      page, 
      url: url.toString() 
    }, ['fetch-list', 'pagination'])
    
    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    const recordCount = data.data?.length || data.list?.length || data.items?.length || 0
    
    logApiCall(url.toString(), 'GET', response.status, {
      page,
      recordCount,
      totalPages: data.totalPages
    })
    
    info(`第${page}页列表数据获取成功`, { 
      page, 
      recordCount,
      totalPages: data.totalPages 
    }, ['fetch-list', 'success'])
    
    // Update total pages if available
    if (data.totalPages) {
      totalPages.value = data.totalPages
    }
    
    logPerformance(`获取第${page}页列表数据`, startTime)
    return data.data || data.list || data.items || data
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error))
    error(`获取列表数据失败`, err, { 
      page, 
      url: formData.listUrl 
    }, ['fetch-list', 'api-error'])
    logPerformance(`获取第${page}页列表数据（失败）`, startTime)
    throw error
  }
}

// Fetch detail data
const fetchDetailData = async (id: string) => {
  const startTime = Date.now()
  try {
    // Build detail URL, assume it uses id parameter
    const url = new URL(formData.detailUrl)
    url.searchParams.set('id', id)
    
    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    logApiCall(url.toString(), 'GET', response.status, { id })
    logPerformance(`获取详情数据 (ID: ${id})`, startTime)
    
    return data.data || data
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error))
    error(`获取详情数据失败`, err, { 
      id, 
      url: formData.detailUrl 
    }, ['fetch-detail', 'api-error'])
    logPerformance(`获取详情数据失败 (ID: ${id})`, startTime)
    throw error
  }
}

// Check if detail has target field value (使用lodash优化)
const checkDetailForTarget = (detail: any, key: string, value: string): boolean => {
  // 使用lodash的get方法，支持嵌套路径和数组索引
  const currentValue = getNestedValue(detail, key)
  return currentValue === value
}

// Main search function
const startSearch = async () => {
  if (!formData.listUrl || !formData.detailUrl || !formData.searchKey || !formData.searchValue) {
    const missingFields = []
    if (!formData.listUrl) missingFields.push('列表URL')
    if (!formData.detailUrl) missingFields.push('详情URL') 
    if (!formData.searchKey) missingFields.push('搜索字段')
    if (!formData.searchValue) missingFields.push('目标值')
    
    warn('启动搜索失败：缺少必需字段', { 
      missingFields,
      mode: useAnalysisMode.value ? 'analysis' : 'legacy-search'
    }, ['validation-error', 'user-input'])
    return
  }
  
  if (useAnalysisMode.value) {
    // Use the new analysis logic
    logUserAction('启动智能分析模式', { 
      searchKey: formData.searchKey,
      searchValue: formData.searchValue,
      maxConcurrency: formData.maxConcurrency
    })
    await startAnalysis()
  } else {
    // Use legacy search logic
    const searchStartTime = Date.now()
    isSearching.value = true
    
    logUserAction('启动传统搜索模式', {
      listUrl: formData.listUrl,
      detailUrl: formData.detailUrl,
      searchKey: formData.searchKey,
      searchValue: formData.searchValue
    })
    
    info('开始传统搜索流程', {
      searchKey: formData.searchKey,
      targetValue: formData.searchValue
    }, ['legacy-search', 'start'])
    
    try {
      let page = 1
      let found = false
      const maxPages = 50 // 安全限制，避免无限循环
      
      while (!found && page <= maxPages) {
        currentPage.value = page
        
        // Fetch list data
        const listData = await fetchListData(page)
        
        if (!listData || listData.length === 0) {
          warn('没有更多数据，搜索结束', { 
            page, 
            maxPages 
          }, ['legacy-search', 'no-more-data'])
          break
        }
        
        // Check each item in the list
        for (const item of listData) {
          if (found) break
          
          // Extract ID from list item (support various ID field names)
          const itemId = item.id || item._id || item.uuid || item.key
          if (!itemId) {
            warn('列表项缺少ID字段，跳过', { 
              item: Object.keys(item),
              page 
            }, ['legacy-search', 'missing-id'])
            continue
          }
          
          try {
            // Fetch detail data
            const detail = await fetchDetailData(itemId)
            
            // Check if this detail has the target field value
            if (checkDetailForTarget(detail, formData.searchKey, formData.searchValue)) {
              info(`找到目标数据！`, {
                itemId,
                searchKey: formData.searchKey,
                searchValue: formData.searchValue,
                page,
                detail
              }, ['legacy-search', 'match-found', 'success'])
              
              foundResult.value = {
                listItem: item,
                detail: detail,
                page: page,
                itemId: itemId
              }
              found = true
              break
            } else {
              // Get current value for logging (使用lodash优化)
              const currentValue = getNestedValue(detail, formData.searchKey)
              info(`数据不匹配`, {
                itemId,
                searchKey: formData.searchKey,
                expectedValue: formData.searchValue,
                actualValue: currentValue,
                page
              }, ['legacy-search', 'no-match'])
            }
            
            // Add small delay to prevent overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 100))
            
          } catch (error: any) {
            warn(`获取详情失败，跳过该项`, {
              itemId,
              page,
              error: error.message
            }, ['legacy-search', 'fetch-error'])
            continue
          }
        }
        
        if (!found) {
          page++
          if (totalPages.value > 0 && page > totalPages.value) {
            warn('已搜索所有页面，未找到目标数据', {
              totalPages: totalPages.value,
              searchedPages: page - 1,
              searchKey: formData.searchKey,
              targetValue: formData.searchValue
            }, ['legacy-search', 'all-pages-searched'])
            break
          }
        }
      }
      
      const searchEndTime = Date.now()
      if (!found) {
        warn('搜索完成，未找到匹配的数据', {
          totalPages: totalPages.value || page - 1,
          searchedPages: page - 1,
          searchKey: formData.searchKey,
          targetValue: formData.searchValue,
          searchDuration: searchEndTime - searchStartTime
        }, ['legacy-search', 'no-match-final'])
      }
      
      logPerformance('传统搜索流程', searchStartTime)
      
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error))
      error('搜索过程中发生错误', err, {
        searchKey: formData.searchKey,
        targetValue: formData.searchValue,
        currentPage: currentPage.value
      }, ['legacy-search', 'fatal-error'])
    } finally {
      isSearching.value = false
    }
  }
}

// Stop search
const stopSearch = () => {
  logUserAction(`手动停止${useAnalysisMode.value ? '分析' : '搜索'}`)
  
  if (useAnalysisMode.value) {
    stopAnalysis()
  } else {
    isSearching.value = false
    warn('传统搜索已手动停止', {
      currentPage: currentPage.value,
      totalPages: totalPages.value
    }, ['legacy-search', 'manual-stop'])
  }
}
</script>

<template>
  <div class="data-query-container">
    <h3>数据查询工具</h3>
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
            :disabled="isRunning"
          />
        </div>
      </div>
      
      <!-- Analysis Mode Settings -->
      <div v-if="useAnalysisMode" class="form-group">
        <label>最大并发数:</label>
        <input 
          v-model.number="formData.maxConcurrency" 
          type="number" 
          min="1" 
          max="20"
          placeholder="5"
          :disabled="isRunning"
        />
        <small class="form-help">控制同时发起的详情请求数量（1-20）</small>
      </div>
      
      <div class="button-group">
        <button 
          @click="startSearch" 
          :disabled="isRunning"
          class="search-btn"
        >
          {{ isRunning ? (useAnalysisMode ? '分析中...' : '搜索中...') : (useAnalysisMode ? '开始分析' : '开始搜索') }}
        </button>
        
        <button 
          @click="stopSearch" 
          :disabled="!isRunning"
          class="stop-btn"
        >
          {{ useAnalysisMode ? '停止分析' : '停止搜索' }}
        </button>
      </div>
    </div>
    
    <!-- Analysis Status -->
    <div v-if="isRunning" class="status-section">
      <div v-if="useAnalysisMode">
        <p v-if="progress">
          正在分析数据：{{ progress.current }} / {{ progress.total }} ({{ progress.percentage }}%)
        </p>
        <p v-else>正在准备分析...</p>
        <div class="progress-bar" v-if="progress">
          <div 
            class="progress-fill" 
            :style="{ width: `${progress.percentage}%` }"
          ></div>
        </div>
        
        <!-- Field Mappings Display -->
        <div v-if="analysisState.fieldMappings.length > 0" class="mappings-info">
          <h5>字段映射关系 ({{ analysisState.fieldMappings.length }})</h5>
          <div class="mapping-list">
            <div 
              v-for="mapping in analysisState.fieldMappings.slice(0, 5)" 
              :key="`${mapping.listField}-${mapping.detailParam}`"
              class="mapping-item"
            >
              <span class="list-field">{{ mapping.listField }}</span>
              <span class="arrow">→</span>
              <span class="detail-param">{{ mapping.detailParam }}</span>
              <span class="confidence" :class="{ 'high': mapping.confidence >= 0.8, 'medium': mapping.confidence >= 0.6 }">
                {{ Math.round(mapping.confidence * 100) }}%
              </span>
            </div>
            <div v-if="analysisState.fieldMappings.length > 5" class="more-mappings">
              ... 还有 {{ analysisState.fieldMappings.length - 5 }} 个映射
            </div>
          </div>
        </div>
      </div>
      <div v-else>
        <p>正在搜索第 {{ currentPage }} 页...</p>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: totalPages > 0 ? `${(currentPage / totalPages) * 100}%` : '50%' }"
          ></div>
        </div>
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
  </div>
</template>

<style scoped>
.data-query-container {
  /* padding: 16px; */
  font-family: system-ui, -apple-system, sans-serif;
  border-radius: 8px;
  max-width: 800px;
}

/* Mode Toggle Styles */
.mode-toggle {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #dee2e6;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-weight: 600;
}

.toggle-label input[type="checkbox"] {
  position: relative;
  width: 50px;
  height: 24px;
  appearance: none;
  background: #ccc;
  border-radius: 12px;
  outline: none;
  transition: background 0.3s;
}

.toggle-label input[type="checkbox"]:checked {
  background: #007bff;
}

.toggle-label input[type="checkbox"]:before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s;
}

.toggle-label input[type="checkbox"]:checked:before {
  transform: translateX(26px);
}

.toggle-label input[type="checkbox"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-text {
  color: #495057;
  font-size: 16px;
}

.mode-description {
  margin-top: 8px;
  font-size: 14px;
  color: #6c757d;
  font-style: italic;
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

.form-help {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #6c757d;
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

/* Field Mappings Styles */
.mappings-info {
  margin-top: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.mappings-info h5 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #495057;
}

.mapping-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mapping-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: white;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid #e9ecef;
}

.list-field {
  font-family: monospace;
  background: #e3f2fd;
  color: #1976d2;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
}

.arrow {
  color: #6c757d;
  font-weight: bold;
}

.detail-param {
  font-family: monospace;
  background: #e8f5e8;
  color: #2e7d32;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
}

.confidence {
  margin-left: auto;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
}

.confidence.high {
  background: #d4edda;
  color: #155724;
}

.confidence.medium {
  background: #fff3cd;
  color: #856404;
}

.confidence:not(.high):not(.medium) {
  background: #f8d7da;
  color: #721c24;
}

.more-mappings {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  font-size: 12px;
  padding: 4px;
}

/* Log Styles */
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

.log-index {
  background: #007bff;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  margin-left: auto;
}

.no-logs {
  text-align: center;
  padding: 40px;
  color: #6c757d;
  font-style: italic;
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
