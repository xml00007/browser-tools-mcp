# 日志系统使用示例

## 基础用法

### 1. 在 Composable 中使用

```typescript
import { useLogger } from '../composables/useLogger'

export function useMyModule() {
  const { info, warn, error, logAsync, logUserAction } = useLogger('MyModule')
  
  // 基础日志
  info('模块初始化完成')
  warn('检测到警告情况', { reason: 'timeout' })
  error('操作失败', new Error('Network error'))
  
  // 异步操作日志
  const fetchData = async () => {
    return await logAsync(async () => {
      const response = await fetch('/api/data')
      return response.json()
    }, '获取数据')
  }
  
  // 用户行为日志
  const handleClick = () => {
    logUserAction('点击按钮', { buttonId: 'submit' })
  }
}
```

### 2. 在 Vue 组件中使用

```vue
<script setup lang="ts">
import { useLogger } from '../composables/useLogger'
import { onMounted } from 'vue'

const { info, error, logUserAction, logPerformance } = useLogger('MyComponent')

onMounted(() => {
  info('组件已挂载')
})

const handleSubmit = async () => {
  const startTime = Date.now()
  try {
    logUserAction('提交表单')
    // 处理提交逻辑
    await submitForm()
    info('表单提交成功')
  } catch (err) {
    error('表单提交失败', err as Error)
  } finally {
    logPerformance('表单提交', startTime)
  }
}
</script>
```

### 3. 错误边界处理

```typescript
// 全局错误处理
window.addEventListener('error', (event) => {
  const { error: logError } = useLogger('GlobalError')
  logError('全局错误', event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  })
})

// Vue 错误处理
app.config.errorHandler = (err, vm, info) => {
  const { error } = useLogger('VueError')
  error('Vue组件错误', err as Error, { info })
}
```

## 高级用法

### 1. 性能监控

```typescript
export function usePerformanceMonitoring() {
  const { logPerformance, warn } = useLogger('Performance')
  
  // 监控函数执行时间
  const monitorFunction = <T extends (...args: any[]) => any>(
    fn: T,
    name: string
  ): T => {
    return ((...args: any[]) => {
      const startTime = Date.now()
      try {
        const result = fn(...args)
        if (result instanceof Promise) {
          return result.finally(() => {
            logPerformance(name, startTime)
          })
        } else {
          logPerformance(name, startTime)
          return result
        }
      } catch (error) {
        logPerformance(name, startTime)
        throw error
      }
    }) as T
  }
  
  // 监控组件渲染时间
  const useRenderMonitor = (componentName: string) => {
    const renderStart = Date.now()
    
    onMounted(() => {
      const renderTime = Date.now() - renderStart
      if (renderTime > 100) {
        warn(`组件 ${componentName} 渲染时间过长`, { renderTime })
      }
      logPerformance(`${componentName} 渲染`, renderStart)
    })
  }
  
  return { monitorFunction, useRenderMonitor }
}
```

### 2. API 调用监控

```typescript
export function useApiMonitoring() {
  const { logApiCall } = useLogger('API')
  
  const monitoredFetch = async (url: string, options?: RequestInit) => {
    const startTime = Date.now()
    try {
      const response = await fetch(url, options)
      logApiCall(url, options?.method || 'GET', response.status, {
        duration: Date.now() - startTime,
        responseSize: response.headers.get('content-length')
      })
      return response
    } catch (error) {
      logApiCall(url, options?.method || 'GET', undefined, {
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }
  
  return { monitoredFetch }
}
```

### 3. 条件日志

```typescript
export function useConditionalLogging() {
  const { debug, info, warn } = useLogger('Conditional')
  
  // 开发环境详细日志
  const devLog = (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      debug(message, data, ['dev-only'])
    }
  }
  
  // 基于条件的日志级别
  const conditionalLog = (condition: boolean, message: string, data?: any) => {
    if (condition) {
      warn(message, data, ['conditional'])
    } else {
      info(message, data, ['conditional'])
    }
  }
  
  return { devLog, conditionalLog }
}
```

## 配置示例

### 1. 模块级别日志配置

```typescript
import { logger } from '../utils/logger'

// 设置特定模块的日志级别
logger.updateConfig({
  modules: {
    'DataAnalysis': LogLevel.DEBUG,  // 数据分析模块显示所有日志
    'UI': LogLevel.WARN,             // UI模块只显示警告和错误
    'Network': LogLevel.INFO         // 网络模块显示信息级别以上
  }
})
```

### 2. 环境配置

```typescript
// 生产环境配置
if (process.env.NODE_ENV === 'production') {
  logger.updateConfig({
    level: LogLevel.WARN,
    enableConsole: false,
    enableRemote: true,
    remoteEndpoint: 'https://api.example.com/logs'
  })
}

// 开发环境配置
if (process.env.NODE_ENV === 'development') {
  logger.updateConfig({
    level: LogLevel.DEBUG,
    enableConsole: true,
    maxEntries: 5000
  })
}
```

## 日志查看器集成

### 1. 在页面中添加日志查看器

```vue
<template>
  <div class="app">
    <!-- 其他内容 -->
    
    <!-- 日志查看器 -->
    <LogViewer 
      module="MyApp"
      :auto-refresh="true"
      :refresh-interval="5000"
      :max-display-logs="500"
    />
  </div>
</template>

<script setup lang="ts">
import LogViewer from './components/LogViewer.vue'
</script>
```

### 2. 浮动日志面板

```vue
<template>
  <div class="app">
    <!-- 日志切换按钮 -->
    <button @click="toggleLogs" class="log-toggle">
      {{ showLogs ? '隐藏日志' : '显示日志' }}
    </button>
    
    <!-- 浮动日志面板 -->
    <div v-if="showLogs" class="floating-log-panel">
      <LogViewer />
    </div>
  </div>
</template>

<style scoped>
.floating-log-panel {
  position: fixed;
  top: 50px;
  right: 20px;
  width: 600px;
  height: 400px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 1000;
}
</style>
```

## 最佳实践

### 1. 日志消息规范

```typescript
// ✅ 好的日志消息
info('用户登录成功', { userId: 123, loginTime: new Date() })
warn('API响应时间过长', { url: '/api/data', duration: 2500 })
error('数据库连接失败', dbError, { retryAttempt: 3 })

// ❌ 避免的日志消息
info('success')  // 不够具体
error('error')   // 没有上下文
debug(JSON.stringify(largeObject))  // 日志过大
```

### 2. 性能考虑

```typescript
// ✅ 延迟计算昂贵的日志数据
debug('用户数据', () => ({
  userData: expensiveUserDataSerialization(),
  timestamp: Date.now()
}))

// ✅ 使用标签进行分类
info('操作完成', data, ['user-action', 'success'])

// ✅ 避免在循环中频繁记录日志
for (let i = 0; i < 1000; i++) {
  // ❌ 避免
  // debug(`处理第 ${i} 项`)
  
  // ✅ 批量记录或采样记录
  if (i % 100 === 0) {
    info(`处理进度`, { processed: i, total: 1000 })
  }
}
```

### 3. 错误处理

```typescript
// ✅ 完整的错误上下文
try {
  await processData(data)
} catch (error) {
  error('数据处理失败', error as Error, {
    dataSize: data.length,
    processingStep: 'validation',
    timestamp: Date.now()
  }, ['data-processing', 'error'])
  
  // 决定是否重新抛出错误
  throw error
}
```
