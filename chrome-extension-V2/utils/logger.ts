/* @source cursor @line_count 234 @branch main */
import { reactive, ref, computed } from 'vue'

// 日志级别枚举
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

// 日志接口
export interface LogEntry {
  id: string
  timestamp: Date
  level: LogLevel
  module: string
  message: string
  data?: any
  error?: Error
  tags?: string[]
  userId?: string
  sessionId?: string
}

// 日志配置接口
export interface LoggerConfig {
  level: LogLevel
  maxEntries: number
  enableConsole: boolean
  enableStorage: boolean
  storageKey: string
  enableRemote: boolean
  remoteEndpoint?: string
  modules: Record<string, LogLevel>
}

// 日志过滤器接口
export interface LogFilter {
  level?: LogLevel
  module?: string
  startTime?: Date
  endTime?: Date
  tags?: string[]
  search?: string
}

// 日志统计接口
export interface LogStats {
  total: number
  byLevel: Record<LogLevel, number>
  byModule: Record<string, number>
  errorRate: number
  averagePerHour: number
}

class LoggerService {
  private config: LoggerConfig
  private logs = reactive<LogEntry[]>([])
  private sessionId: string
  private isInitialized = false

  constructor() {
    this.sessionId = this.generateSessionId()
    this.config = this.getDefaultConfig()
    this.init()
  }

  private getDefaultConfig(): LoggerConfig {
    return {
      level: LogLevel.INFO,
      maxEntries: 1000,
      enableConsole: true,
      enableStorage: true,
      storageKey: 'browser-tools-logs',
      enableRemote: false,
      modules: {}
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async init(): Promise<void> {
    if (this.isInitialized) return

    try {
      // 从存储中加载配置
      await this.loadConfig()
      // 从存储中加载历史日志
      await this.loadLogs()
      this.isInitialized = true
    } catch (error) {
      console.error('Logger initialization failed:', error)
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const stored = localStorage.getItem('browser-tools-logger-config')
      if (stored) {
        const config = JSON.parse(stored)
        this.config = { ...this.config, ...config }
      }
    } catch (error) {
      console.warn('Failed to load logger config:', error)
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      localStorage.setItem('browser-tools-logger-config', JSON.stringify(this.config))
    } catch (error) {
      console.warn('Failed to save logger config:', error)
    }
  }

  private async loadLogs(): Promise<void> {
    if (!this.config.enableStorage) return

    try {
      const stored = localStorage.getItem(this.config.storageKey)
      if (stored) {
        const logs = JSON.parse(stored)
        // 转换日期字符串回Date对象
        logs.forEach((log: any) => {
          log.timestamp = new Date(log.timestamp)
        })
        this.logs.splice(0, this.logs.length, ...logs)
      }
    } catch (error) {
      console.warn('Failed to load logs from storage:', error)
    }
  }

  private async saveLogs(): Promise<void> {
    if (!this.config.enableStorage) return

    try {
      // 只保存最近的日志
      const logsToSave = this.logs.slice(-this.config.maxEntries)
      localStorage.setItem(this.config.storageKey, JSON.stringify(logsToSave))
    } catch (error) {
      console.warn('Failed to save logs to storage:', error)
    }
  }

  private shouldLog(level: LogLevel, module: string): boolean {
    // 检查全局级别
    if (level < this.config.level) return false
    
    // 检查模块特定级别
    const moduleLevel = this.config.modules[module]
    if (moduleLevel !== undefined && level < moduleLevel) return false

    return true
  }

  private addLog(entry: LogEntry): void {
    // 添加到内存
    this.logs.push(entry)

    // 维护最大条数
    if (this.logs.length > this.config.maxEntries) {
      this.logs.splice(0, this.logs.length - this.config.maxEntries)
    }

    // 输出到控制台
    if (this.config.enableConsole) {
      this.logToConsole(entry)
    }

    // 异步保存到存储
    this.saveLogs()

    // 异步发送到远程
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.sendToRemote(entry)
    }
  }

  private logToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level]
    const timestamp = entry.timestamp.toISOString()
    const prefix = `[${timestamp}] [${levelName}] [${entry.module}]`

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data)
        break
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data)
        break
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data)
        break
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(prefix, entry.message, entry.error || entry.data)
        break
    }
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    try {
      await fetch(this.config.remoteEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      })
    } catch (error) {
      console.warn('Failed to send log to remote:', error)
    }
  }

  // 公共日志方法
  log(level: LogLevel, module: string, message: string, data?: any, tags?: string[]): void {
    if (!this.shouldLog(level, module)) return

    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      module,
      message,
      data,
      tags,
      sessionId: this.sessionId
    }

    this.addLog(entry)
  }

  debug(module: string, message: string, data?: any, tags?: string[]): void {
    this.log(LogLevel.DEBUG, module, message, data, tags)
  }

  info(module: string, message: string, data?: any, tags?: string[]): void {
    this.log(LogLevel.INFO, module, message, data, tags)
  }

  warn(module: string, message: string, data?: any, tags?: string[]): void {
    this.log(LogLevel.WARN, module, message, data, tags)
  }

  error(module: string, message: string, error?: Error, data?: any, tags?: string[]): void {
    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level: LogLevel.ERROR,
      module,
      message,
      error,
      data,
      tags,
      sessionId: this.sessionId
    }

    if (this.shouldLog(LogLevel.ERROR, module)) {
      this.addLog(entry)
    }
  }

  fatal(module: string, message: string, error?: Error, data?: any, tags?: string[]): void {
    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level: LogLevel.FATAL,
      module,
      message,
      error,
      data,
      tags,
      sessionId: this.sessionId
    }

    if (this.shouldLog(LogLevel.FATAL, module)) {
      this.addLog(entry)
    }
  }

  // 配置方法
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.saveConfig()
  }

  getConfig(): LoggerConfig {
    return { ...this.config }
  }

  // 查询方法
  getLogs(filter?: LogFilter): LogEntry[] {
    let filteredLogs = [...this.logs]

    if (filter) {
      if (filter.level !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.level >= filter.level!)
      }
      if (filter.module) {
        filteredLogs = filteredLogs.filter(log => log.module === filter.module)
      }
      if (filter.startTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startTime!)
      }
      if (filter.endTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endTime!)
      }
      if (filter.tags && filter.tags.length > 0) {
        filteredLogs = filteredLogs.filter(log => 
          log.tags && filter.tags!.some(tag => log.tags!.includes(tag))
        )
      }
      if (filter.search) {
        const search = filter.search.toLowerCase()
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(search) ||
          log.module.toLowerCase().includes(search)
        )
      }
    }

    return filteredLogs
  }

  getStats(filter?: LogFilter): LogStats {
    const logs = this.getLogs(filter)
    
    const byLevel: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
      [LogLevel.FATAL]: 0
    }

    const byModule: Record<string, number> = {}

    logs.forEach(log => {
      byLevel[log.level]++
      byModule[log.module] = (byModule[log.module] || 0) + 1
    })

    const errorCount = byLevel[LogLevel.ERROR] + byLevel[LogLevel.FATAL]
    const errorRate = logs.length > 0 ? (errorCount / logs.length) * 100 : 0

    // 计算每小时平均日志数
    const timeSpan = logs.length > 0 ? 
      (Math.max(...logs.map(log => log.timestamp.getTime())) - 
       Math.min(...logs.map(log => log.timestamp.getTime()))) / (1000 * 60 * 60) : 1
    const averagePerHour = timeSpan > 0 ? logs.length / timeSpan : 0

    return {
      total: logs.length,
      byLevel,
      byModule,
      errorRate,
      averagePerHour
    }
  }

  // 清理方法
  clear(): void {
    this.logs.splice(0, this.logs.length)
    this.saveLogs()
  }

  export(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  import(jsonData: string): void {
    try {
      const logs = JSON.parse(jsonData)
      logs.forEach((log: any) => {
        log.timestamp = new Date(log.timestamp)
      })
      this.logs.splice(0, this.logs.length, ...logs)
      this.saveLogs()
    } catch (error) {
      this.error('Logger', 'Failed to import logs', error as Error)
    }
  }
}

// 单例实例
export const logger = new LoggerService()

// 默认导出
export default logger
