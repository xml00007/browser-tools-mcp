/* @source cursor @line_count 737 @branch main */
<template>
  <div class="log-viewer">
    <!-- 工具栏 -->
    <div class="toolbar">   
      <div class="toolbar-section">
        <button @click="refreshLogs" class="btn btn-primary">
          刷新
        </button>
        <button @click="clearLogs" class="btn btn-danger">
          清空
        </button>
      </div>
    </div>

    <!-- 过滤器 -->
    <div class="filters" v-if="showFilters">
      <div class="filter-row">
        <div class="filter-group">
          <label>日志级别:</label>
          <select v-model="filter.level">
            <option :value="undefined">全部</option>
            <option :value="LogLevel.DEBUG">调试</option>
            <option :value="LogLevel.INFO">信息</option>
            <option :value="LogLevel.WARN">警告</option>
            <option :value="LogLevel.ERROR">错误</option>
            <option :value="LogLevel.FATAL">致命</option>
          </select>
        </div>

        <div class="filter-group">
          <label>模块:</label>
          <select v-model="filter.module">
            <option :value="undefined">全部模块</option>
            <option v-for="module in availableModules" :key="module" :value="module">
              {{ module }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label>搜索:</label>
          <input 
            v-model="filter.search" 
            type="text" 
            placeholder="搜索消息内容..."
            class="search-input"
          />
        </div>
      </div>
    </div>

    <!-- 日志列表 -->
    <div class="log-list">
      <div class="log-header">
        <div class="log-controls">
          <label>
            <input 
              type="checkbox" 
              v-model="autoScroll"
            />
            自动滚动
          </label>
          <label>
            <input 
              type="checkbox" 
              v-model="showDetails"
            />
            显示详情
          </label>
          <span class="log-count">显示 {{ filteredLogs.length }} 条日志</span>
        </div>
      </div>

      <div 
        ref="logContainer" 
        class="log-container"
        :class="{ 'auto-scroll': autoScroll }"
      >
        <div 
          v-for="log in displayedLogs" 
          :key="log.id"
          class="log-entry"
          :class="[
            getLevelClass(log.level),
            { 'expanded': expandedLogs.has(log.id) }
          ]"
          @click="toggleLogExpansion(log.id)"
        >
          <div class="log-main">
            <div class="log-level">
              {{ getLevelName(log.level) }}
            </div>
            <div class="log-time">
              {{ formatTime(log.timestamp) }}
            </div>
            <div class="log-module">
              {{ log.module }}
            </div>
            <div class="log-message">
              {{ log.message }}
            </div>
            <div class="log-tags" v-if="log.tags && log.tags.length > 0">
              <span 
                v-for="tag in log.tags" 
                :key="tag" 
                class="tag"
              >
                {{ tag }}
              </span>
            </div>
          </div>

          <div v-if="showDetails && (log.data || log.error)" class="log-details">
            <div v-if="log.error" class="log-error">
              <h5>错误信息:</h5>
              <pre>{{ log.error.message }}</pre>
              <pre v-if="log.error.stack">{{ log.error.stack }}</pre>
            </div>
            <div v-if="log.data" class="log-data">
              <h5>数据:</h5>
              <pre>{{ JSON.stringify(log.data, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useLogger } from '../composables/useLogger'
import { LogLevel } from '../utils/logger'

// Props
interface Props {
  module?: string
  maxDisplayLogs?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  module: 'LogViewer',
  maxDisplayLogs: 1000,
  autoRefresh: false,
  refreshInterval: 5000
})

// Composables
const {
  filteredLogs,
  filter,
  stats,
  refreshLogs,
  clearLogs,
  clearFilter,
  exportLogs,
  updateFilter,
  getConfig,
  updateConfig: updateLoggerConfig
} = useLogger(props.module)

// 响应式数据
const showFilters = ref(true)
const showStats = ref(true)
const showSettings = ref(false)
const showDetails = ref(false)
const autoScroll = ref(true)
const expandedLogs = ref(new Set<string>())
const logContainer = ref<HTMLElement>()

// 配置
const config = ref(getConfig())

// 过滤器相关
const startTimeStr = ref('')
const endTimeStr = ref('')
const tagsStr = ref('')

// 计算属性
const displayedLogs = computed(() => {
  return filteredLogs.value.slice(-props.maxDisplayLogs)
})

const availableModules = computed(() => {
  const modules = new Set<string>()
  filteredLogs.value.forEach(log => modules.add(log.module))
  return Array.from(modules).sort()
})

// 方法
const formatTime = (timestamp: Date) => {
  // 仅展示时分秒
  return timestamp instanceof Date
    ? timestamp.toTimeString().slice(0, 8)
    : ''
}

const getLevelName = (level: LogLevel) => {
  const names: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.ERROR]: 'ERROR',
    [LogLevel.FATAL]: 'FATAL'
  }
  return names[level] || 'UNKNOWN'
}

const getLevelClass = (level: LogLevel) => {
  const classes: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: 'level-debug',
    [LogLevel.INFO]: 'level-info',
    [LogLevel.WARN]: 'level-warn',
    [LogLevel.ERROR]: 'level-error',
    [LogLevel.FATAL]: 'level-fatal'
  }
  return classes[level] || 'level-unknown'
}

const getBarWidth = (count: number, total: number) => {
  return total > 0 ? `${(count / total) * 100}%` : '0%'
}

const toggleLogExpansion = (logId: string) => {
  if (expandedLogs.value.has(logId)) {
    expandedLogs.value.delete(logId)
  } else {
    expandedLogs.value.add(logId)
  }
}


// 监听过滤器变化
watch([startTimeStr, endTimeStr, tagsStr], () => {
  const newFilter: any = {}
  
  if (startTimeStr.value) {
    newFilter.startTime = new Date(startTimeStr.value)
  }
  if (endTimeStr.value) {
    newFilter.endTime = new Date(endTimeStr.value)
  }
  if (tagsStr.value) {
    newFilter.tags = tagsStr.value.split(',').map(tag => tag.trim()).filter(Boolean)
  }
  
  updateFilter(newFilter)
})

// 监听过滤器对象变化
watch(filter, () => {
  updateFilter(filter.value)
}, { deep: true })

// 自动滚动
watch(filteredLogs, async () => {
  if (autoScroll.value) {
    await nextTick()
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  }
})

// 自动刷新
let refreshTimer: number | null = null
watch(() => props.autoRefresh, (enabled) => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  
  if (enabled) {
    refreshTimer = window.setInterval(refreshLogs, props.refreshInterval)
  }
})

onMounted(() => {
  if (props.autoRefresh) {
    refreshTimer = window.setInterval(refreshLogs, props.refreshInterval)
  }
})
</script>

<style scoped>
.log-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ffffff;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #555;
  color: #ffffff;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar h3 {
  margin: 0;
  font-size: 16px;
}

.stats {
  font-size: 12px;
  color: #666;
}

.btn {
  padding: 4px 12px;
  border: 1px solid #555;
  border-radius: 4px;
  background: #3c3c3c;
  cursor: pointer;
  font-size: 12px;
  color: #ffffff;
}

.btn:hover {
  background: #4a4a4a;
}

.btn-primary {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.btn-danger {
  background: #dc3545;
  color: white;
  border-color: #dc3545;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border-color: #6c757d;
}

.filters {
  padding: 12px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #555;
  color: #ffffff;
}

.filter-row {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.filter-group label {
  font-size: 12px;
  color: #cccccc;
  white-space: nowrap;
}

.filter-group select,
.filter-group input {
  padding: 2px 6px;
  border: 1px solid #555;
  border-radius: 2px;
  font-size: 12px;
  background: #3c3c3c;
  color: #ffffff;
}

.filter-group select:focus,
.filter-group input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.log-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.log-header {
  padding: 8px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #555;
  color: #ffffff;
}

.log-controls {
  display: flex;
  gap: 16px;
  align-items: center;
  font-size: 12px;
}

.log-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  background: #1e1e1e;
}

.log-entry {
  margin-bottom: 4px;
  padding: 8px;
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  cursor: pointer;
  font-family: monospace;
  font-size: 12px;
  color: #ffffff;
}

.log-entry:hover {
  background: #3c3c3c;
}

.log-main {
  display: grid;
  grid-template-columns: 60px 120px 100px 1fr auto;
  gap: 8px;
  align-items: center;
}

.log-level {
  font-weight: bold;
  text-align: center;
  padding: 2px 4px;
  border-radius: 2px;
  color: white;
}

.level-debug .log-level { background: #6c757d; }
.level-info .log-level { background: #17a2b8; }
.level-warn .log-level { background: #ffc107; color: black; }
.level-error .log-level { background: #dc3545; }
.level-fatal .log-level { background: #6f42c1; }

.log-time {
  color: #aaaaaa;
}

.log-module {
  color: #4fc3f7;
  font-weight: 500;
}

.log-message {
  color: #ffffff;
}

.log-tags {
  display: flex;
  gap: 4px;
}

.tag {
  background: #555555;
  color: #ffffff;
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 10px;
}

.log-details {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #555;
}

.log-details h5 {
  margin: 0 0 4px 0;
  font-size: 11px;
  color: #cccccc;
}

.log-details pre {
  margin: 0;
  padding: 4px;
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 2px;
  font-size: 10px;
  overflow-x: auto;
  color: #ffffff;
}

.stats-panel {
  padding: 12px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #555;
  color: #ffffff;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #cccccc;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #ffffff;
}

.stat-value.error {
  color: #dc3545;
}

.level-distribution h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.level-bars {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.level-bar {
  display: grid;
  grid-template-columns: 60px 1fr 40px;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}

.level-name {
  font-weight: 500;
}

.bar {
  height: 16px;
  background: #444444;
  border-radius: 8px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.level-debug .bar-fill { background: #6c757d; }
.level-info .bar-fill { background: #17a2b8; }
.level-warn .bar-fill { background: #ffc107; }
.level-error .bar-fill { background: #dc3545; }
.level-fatal .bar-fill { background: #6f42c1; }

.level-count {
  text-align: right;
  font-weight: 500;
}

.settings-panel {
  padding: 12px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #555;
  color: #ffffff;
}

.settings-panel h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
}

.setting-group {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.setting-group input[type="number"],
.setting-group select {
  padding: 2px 6px;
  border: 1px solid #555;
  border-radius: 2px;
  background: #3c3c3c;
  color: #ffffff;
}

.setting-group input[type="number"]:focus,
.setting-group select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}
</style>
