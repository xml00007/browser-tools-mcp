/* @source cursor @line_count 216 @branch main */
# 工具函数使用指南

本项目已集成 lodash-es，实现按需引入以优化打包体积。所有工具函数都在 `utils/common.ts` 中统一管理。

## 🎯 按需引入的优势

- **更小的打包体积**: 只引入实际使用的函数
- **更好的树摇优化**: webpack/vite 可以移除未使用的代码
- **统一的接口**: 所有lodash功能通过工具函数统一暴露

## 📚 可用的工具函数

### 1. 对象操作

#### `getNestedValue(obj, fieldPath, defaultValue?)`
递归获取对象中的嵌套值，支持数组索引。

```typescript
import { getNestedValue } from '../utils/common'

const data = {
  user: {
    profile: { name: 'John' },
    items: [{ id: 1, title: 'Item 1' }]
  }
}

// 获取嵌套属性
const name = getNestedValue(data, 'user.profile.name') // 'John'

// 获取数组元素
const firstItem = getNestedValue(data, 'user.items[0].title') // 'Item 1'

// 使用默认值
const age = getNestedValue(data, 'user.profile.age', 18) // 18
```

#### `setNestedValue(obj, fieldPath, value)`
设置对象中的嵌套值。

```typescript
import { setNestedValue } from '../utils/common'

const obj = {}
setNestedValue(obj, 'user.profile.name', 'Jane')
// obj 现在是 { user: { profile: { name: 'Jane' } } }
```

#### `deepMerge(target, ...sources)`
深度合并多个对象。

```typescript
import { deepMerge } from '../utils/common'

const obj1 = { a: { b: 1 } }
const obj2 = { a: { c: 2 } }
const merged = deepMerge(obj1, obj2) // { a: { b: 1, c: 2 } }
```

#### `deepClone(obj)`
深度克隆对象。

```typescript
import { deepClone } from '../utils/common'

const original = { a: { b: 1 } }
const cloned = deepClone(original)
// 修改 cloned 不会影响 original
```

### 2. 性能优化

#### `createDebounce(func, wait, options?)`
创建防抖函数，用于限制函数调用频率。

```typescript
import { createDebounce } from '../utils/common'

const searchAPI = async (query: string) => {
  // API 调用
}

// 创建防抖版本，延迟500ms执行
const debouncedSearch = createDebounce(searchAPI, 500)

// 在表单输入中使用
watch(() => searchQuery.value, (newQuery) => {
  debouncedSearch(newQuery)
})
```

#### `createThrottle(func, wait, options?)`
创建节流函数，用于限制函数执行频率。

```typescript
import { createThrottle } from '../utils/common'

const handleScroll = () => {
  // 滚动处理逻辑
}

// 每100ms最多执行一次
const throttledScroll = createThrottle(handleScroll, 100)

window.addEventListener('scroll', throttledScroll)
```

### 3. 数据验证

#### `isEmptyValue(value)`
检查值是否为空（null、undefined、空字符串、空数组、空对象等）。

```typescript
import { isEmptyValue } from '../utils/common'

isEmptyValue(null)        // true
isEmptyValue('')          // true
isEmptyValue([])          // true
isEmptyValue({})          // true
isEmptyValue('hello')     // false
```

#### `isDeepEqual(value, other)`
深度比较两个值是否相等。

```typescript
import { isDeepEqual } from '../utils/common'

const obj1 = { a: { b: 1 } }
const obj2 = { a: { b: 1 } }
isDeepEqual(obj1, obj2) // true
```

### 4. 对象过滤

#### `filterObject(obj, predicate)`
根据条件过滤对象属性。

```typescript
import { filterObject } from '../utils/common'

const data = { a: 1, b: 2, c: 3 }
const filtered = filterObject(data, (value) => value > 1)
// { b: 2, c: 3 }
```

#### `omitProperties(obj, paths)`
移除对象中的指定属性。

```typescript
import { omitProperties } from '../utils/common'

const data = { a: 1, b: 2, c: 3 }
const result = omitProperties(data, ['b', 'c'])
// { a: 1 }
```

## 🔧 在项目中的实际应用

### 数据分析组件中的使用

```typescript
// useDataAnalysis.ts 中的优化
import { getNestedValue, deepMerge, isEmptyValue } from '../utils/common'

// 替换手动递归搜索
const recursiveFieldSearch = (obj: any, fieldPath: string): any => {
  return getNestedValue(obj, fieldPath)
}

// 优化参数合并
if (detailRequest.requestBody && !isEmptyValue(detailRequest.requestBody)) {
  const bodyParams = JSON.parse(detailRequest.requestBody)
  detailParams = deepMerge(detailParams, bodyParams)
}
```

### 搜索组件中的使用

```typescript
// DataQuery.vue 中的优化
import { getNestedValue, createDebounce } from '../utils/common'

// 简化嵌套值检查
const checkDetailForTarget = (detail: any, key: string, value: string): boolean => {
  const currentValue = getNestedValue(detail, key)
  return currentValue === value
}

// 防抖配置更新
const debouncedUpdateConfig = createDebounce((config) => {
  updateConfig(config)
}, 500)
```

## 📦 打包优化

由于使用了按需引入，最终打包时只会包含实际使用的lodash函数，大大减少了包体积：

```typescript
// ✅ 推荐：按需引入
import { get, set, merge } from 'lodash-es'

// ❌ 避免：全量引入
import _ from 'lodash'
```

## 🚀 性能提升

1. **递归搜索优化**: 使用lodash的`get`方法替代手动递归，支持更复杂的路径解析
2. **防抖优化**: 避免频繁的配置更新和API调用
3. **深度操作**: 更安全可靠的深度克隆和合并操作
4. **类型安全**: 完整的TypeScript类型支持

通过这些优化，项目的性能和可维护性都得到了显著提升。
