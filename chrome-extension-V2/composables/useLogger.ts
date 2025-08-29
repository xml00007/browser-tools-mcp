/* @source cursor @line_count 146 @branch main */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { logger, LogLevel, LogEntry, LogFilter, LogStats } from '../utils/logger'

export function useLogger(moduleName: string) {
  // 响应式数据
  const logs = ref<LogEntry[]>([])
  const isLoading = ref(false)
  const filter = ref<LogFilter>({})

  // 计算属性
  const filteredLogs = computed(() => {
    return logger.getLogs(filter.value)
  })

  const stats = computed(() => {
    return logger.getStats(filter.value)
  })

  const moduleStats = computed(() => {
    return logger.getStats({ ...filter.value, module: moduleName })
  })

  // 日志方法 - 自动绑定模块名
  const debug = (message: string, data?: any, tags?: string[]) => {
    logger.debug(moduleName, message, data, tags)
  }

  const info = (message: string, data?: any, tags?: string[]) => {
    logger.info(moduleName, message, data, tags)
  }

  const warn = (message: string, data?: any, tags?: string[]) => {
    logger.warn(moduleName, message, data, tags)
  }

  const error = (message: string, errorObj?: Error, data?: any, tags?: string[]) => {
    logger.error(moduleName, message, errorObj, data, tags)
  }

  const fatal = (message: string, errorObj?: Error, data?: any, tags?: string[]) => {
    logger.fatal(moduleName, message, errorObj, data, tags)
  }



  // 性能监控
  const logPerformance = (name: string, startTime: number, data?: any) => {
    const duration = Date.now() - startTime
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.INFO
    const message = `性能监控: ${name} (耗时: ${duration}ms)`
    
    logger.log(level, moduleName, message, { duration, ...data }, ['performance'])
  }

  // 用户行为跟踪
  const logUserAction = (action: string, details?: any) => {
    info(`用户操作: ${action}`, details, ['user-action'])
  }

  // API调用日志
  const logApiCall = (url: string, method: string, status?: number, data?: any) => {
    const level = status && status >= 400 ? LogLevel.ERROR : LogLevel.INFO
    const message = `API调用: ${method} ${url}${status ? ` (${status})` : ''}`
    
    logger.log(level, moduleName, message, data, ['api'])
  }

  // 错误边界日志
  const logErrorBoundary = (error: Error, errorInfo?: any) => {
    fatal('组件错误边界捕获异常', error, errorInfo, ['error-boundary'])
  }

  // 刷新日志列表
  const refreshLogs = () => {
    logs.value = logger.getLogs(filter.value)
  }

  // 更新过滤器
  const updateFilter = (newFilter: Partial<LogFilter>) => {
    filter.value = { ...filter.value, ...newFilter }
    refreshLogs()
  }

  // 清空过滤器
  const clearFilter = () => {
    filter.value = {}
    refreshLogs()
  }

  // 导出日志
  const exportLogs = () => {
    return logger.export()
  }

  // 清空日志
  const clearLogs = () => {
    logger.clear()
    refreshLogs()
  }

  // 获取配置
  const getConfig = () => {
    return logger.getConfig()
  }

  // 更新配置
  const updateConfig = (config: any) => {
    logger.updateConfig(config)
  }

  // 生命周期钩子
  onMounted(() => {
    refreshLogs()
    // info(`模块 ${moduleName} 已初始化`, null, ['lifecycle'])
  })

  onUnmounted(() => {
    // info(`模块 ${moduleName} 已卸载`, null, ['lifecycle'])
  })

  // 返回API
  return {
    // 响应式数据
    logs,
    filteredLogs,
    filter,
    isLoading,
    
    // 统计信息
    stats,
    moduleStats,
    
    // 基础日志方法
    debug,
    info,
    warn,
    error,
    fatal,
    
    // 高级日志方法
    logPerformance,
    logUserAction,
    logApiCall,
    logErrorBoundary,
    
    // 工具方法
    refreshLogs,
    updateFilter,
    clearFilter,
    exportLogs,
    clearLogs,
    getConfig,
    updateConfig,
    
    // 常量
    LogLevel
  }
}

// 创建全局实例，用于跨组件通信
export function useGlobalLogger() {
  return useLogger('Global')
}

export default useLogger
