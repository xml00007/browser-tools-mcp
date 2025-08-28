/* @source cursor @line_count 353 @branch main */
// 按需引入lodash函数
import { get, set, merge, cloneDeep, debounce, throttle, isEmpty, isEqual, pickBy, omit } from 'lodash-es'

/**
 * 递归搜索对象中的字段值
 * 使用lodash的get方法替代手动递归
 * @param obj 要搜索的对象
 * @param fieldPath 字段路径，支持嵌套路径如 'user.profile.name' 或数组索引 'items[0].name'
 * @param defaultValue 默认值
 * @returns 字段值或默认值
 */
export const getNestedValue = (obj: any, fieldPath: string, defaultValue?: any): any => {
    return get(obj, fieldPath, defaultValue)
}

/**
 * 设置嵌套对象的值
 * @param obj 目标对象
 * @param fieldPath 字段路径
 * @param value 要设置的值
 * @returns 修改后的对象
 */
export const setNestedValue = (obj: any, fieldPath: string, value: any): any => {
    return set(obj, fieldPath, value)
}

/**
 * 深度合并对象
 * @param target 目标对象
 * @param sources 源对象
 * @returns 合并后的对象
 */
export const deepMerge = (target: any, ...sources: any[]): any => {
    return merge({}, target, ...sources)
}

/**
 * 深度克隆对象
 * @param obj 要克隆的对象
 * @returns 克隆后的对象
 */
export const deepClone = <T>(obj: T): T => {
    return cloneDeep(obj)
}

/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param wait 等待时间(毫秒)
 * @param options 选项
 * @returns 防抖后的函数
 */
export const createDebounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    options?: { leading?: boolean; trailing?: boolean; maxWait?: number }
) => {
    return debounce(func, wait, options)
}

/**
 * 节流函数
 * @param func 要节流的函数
 * @param wait 等待时间(毫秒)
 * @param options 选项
 * @returns 节流后的函数
 */
export const createThrottle = <T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    options?: { leading?: boolean; trailing?: boolean }
) => {
    return throttle(func, wait, options)
}

/**
 * 检查值是否为空
 * @param value 要检查的值
 * @returns 是否为空
 */
export const isEmptyValue = (value: any): boolean => {
    return isEmpty(value)
}

/**
 * 深度比较两个值是否相等
 * @param value 第一个值
 * @param other 第二个值
 * @returns 是否相等
 */
export const isDeepEqual = (value: any, other: any): boolean => {
    return isEqual(value, other)
}

/**
 * 过滤对象中的属性
 * @param obj 源对象
 * @param predicate 过滤条件
 * @returns 过滤后的对象
 */
export const filterObject = (obj: Record<string, any>, predicate: (value: any, key: string) => boolean): Record<string, any> => {
    return pickBy(obj, predicate)
}

/**
 * 移除对象中的指定属性
 * @param obj 源对象
 * @param paths 要移除的属性路径
 * @returns 移除属性后的新对象
 */
export const omitProperties = (obj: Record<string, any>, paths: string | string[]): Record<string, any> => {
    return omit(obj, paths)
}


// 并发控制器
export const createConcurrencyController = (maxConcurrency: number) => {
    let running = 0
    const queue: (() => Promise<void>)[] = []

    const execute = async (task: () => Promise<any>): Promise<any> => {
        return new Promise((resolve, reject) => {
            const wrappedTask = async () => {
                try {
                    running++
                    const result = await task()
                    resolve(result)
                } catch (error) {
                    reject(error)
                } finally {
                    running--
                    if (queue.length > 0) {
                        const nextTask = queue.shift()
                        if (nextTask) {
                            nextTask()
                        }
                    }
                }
            }

            if (running < maxConcurrency) {
                wrappedTask()
            } else {
                queue.push(wrappedTask)
            }
        })
    }

    return { execute }
}

 /**
  * 递归搜索对象中的字段值 - 优化版本（返回路径）
  * @param data 要搜索的对象
  * @param field 字段名称
  * @param options 搜索选项
  * @returns 包含值和路径的对象，如果未找到则返回null
  */
 export const recursiveFieldSearch = (
     data: any,
     field: string,
     options: {
         visited?: WeakSet<object>
         currentPath?: string[]
     } = {}
 ): { value: any; path: string } | null => {
     const { visited = new WeakSet(), currentPath = [] } = options
 
     // 基础条件检查
     if (!data || !field) {
         return null
     }
 
     // 防止循环引用
     if (typeof data === 'object' && data !== null) {
         if (visited.has(data)) {
             return null
         }
         visited.add(data)
     }
 
     // 首先检查当前层级是否有直接字段
     if (typeof data === 'object' && data !== null && field in data) {
         const path = currentPath.length > 0 ? `${currentPath.join('.')}.${field}` : field
         return {
             value: data[field],
             path: path
         }
     }
 
     // 使用lodash的get方法尝试嵌套路径（如果当前路径为空，表示在根级别搜索）
     if (currentPath.length === 0) {
         const directValue = getNestedValue(data, field)
         if (directValue !== undefined) {
             return {
                 value: directValue,
                 path: field
             }
         }
     }
 
     // 递归搜索子对象
     if (typeof data === 'object' && data !== null) {
         for (const key of Object.keys(data)) {
             const subValue = data[key]
             if (typeof subValue === 'object' && subValue !== null) {
                 const result = recursiveFieldSearch(subValue, field, {
                     visited,
                     currentPath: [...currentPath, key]
                 })
                 if (result !== null) {
                     return result
                 }
             }
         }
     }
 
     return null
 }

 /**
  * 递归搜索对象中所有匹配的字段值 - 返回所有匹配项及其路径
  * @param data 要搜索的对象
  * @param field 字段名称
  * @param options 搜索选项
  * @returns 所有找到的值和路径的数组
  */
 export const recursiveFieldSearchAll = (
     data: any,
     field: string,
     options: {
         visited?: WeakSet<object>
         currentPath?: string[]
     } = {}
 ): Array<{ value: any; path: string }> => {
     const { visited = new WeakSet(), currentPath = [] } = options
     const results: Array<{ value: any; path: string }> = []
 
     // 基础条件检查
     if (!data || !field) {
         return results
     }
 
     // 防止循环引用
     if (typeof data === 'object' && data !== null) {
         if (visited.has(data)) {
             return results
         }
         visited.add(data)
     }
 
     // 检查当前层级是否有直接字段
     if (typeof data === 'object' && data !== null && field in data) {
         const path = currentPath.length > 0 ? `${currentPath.join('.')}.${field}` : field
         results.push({
             value: data[field],
             path: path
         })
     }
 
     // 使用lodash的get方法尝试嵌套路径（仅在根级别）
     if (currentPath.length === 0) {
         const directValue = getNestedValue(data, field)
         if (directValue !== undefined) {
             // 避免重复添加已经通过直接字段访问找到的值
             const alreadyFound = results.some(r => r.value === directValue && r.path === field)
             if (!alreadyFound) {
                 results.push({
                     value: directValue,
                     path: field
                 })
             }
         }
     }
 
     // 递归搜索子对象
     if (typeof data === 'object' && data !== null) {
         for (const key of Object.keys(data)) {
             const subValue = data[key]
             if (typeof subValue === 'object' && subValue !== null) {
                 const subResults = recursiveFieldSearchAll(subValue, field, {
                     visited,
                     currentPath: [...currentPath, key]
                 })
                 results.push(...subResults)
             }
         }
     }
 
     return results
 }
