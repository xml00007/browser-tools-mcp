/* @source cursor @line_count 350 @branch main */
import { reactive, ref, computed } from 'vue'
import { useDataQuery } from './useDataQuery'
import { useConnection } from './useConnection'
import { useLogger } from './useLogger'
import { getNestedValue, createConcurrencyController, recursiveFieldSearch, recursiveFieldSearchAll } from '../utils/common'



export interface FieldMapping {
  listField: string
  detailParam: string
  confidence: number
}

export interface AnalysisConfig {
  searchField: string
  targetValue: string
  maxConcurrency: number
}

export function useDataAnalysis() {
  const { settings: querySettings } = useDataQuery()
  const { settings: connectionSettings } = useConnection()
  const { info, warn, error, logUserAction, logPerformance } = useLogger('DataAnalysis')

  const analysisState = reactive({
    isRunning: false,
    progress: 0,
    total: 0,
    fieldMappings: {} as Record<string, any>,
    config: {
      searchField: '',
      targetValue: '',
      maxConcurrency: 5
    } as AnalysisConfig
  })

  const serverUrl = computed(() =>
    `http://${connectionSettings.serverHost}:${connectionSettings.serverPort}`
  )



  // 分析列表数据和详情参数的映射关系
  const analyzeFieldMappings = (listData: any[], detailRequest: RequestData): Record<string, any> => {
    if (!listData || !listData.length || !detailRequest || !detailRequest.requestBody) {
      warn('字段映射分析失败：缺少必要数据', {
        hasListData: !!listData?.length,
        hasDetailRequest: !!detailRequest,
        hasRequestBody: !!detailRequest?.requestBody
      }, ['mapping-analysis', 'validation-error'])
      return {}
    }

    try {
      const requestBody = JSON.parse(detailRequest.requestBody)
      const row = listData[0]
      const res: Record<string, any> = {}

      Object.keys(requestBody).forEach(key => {
        const value = recursiveFieldSearchAll(row, key)
        res[key] = value
      })
      return res
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      error('字段映射分析异常', errorObj, { detailRequest }, ['mapping-analysis', 'parse-error'])
      return {}
    }
  }

  // 构建详情请求URL
  const buildDetailUrl = (listItem: any, mappings: any): string => {
    if (!querySettings.detail) {
      warn('构建详情URL失败：未设置详情请求配置', {}, ['url-building', 'config-missing'])
      return ''
    }
    const {origin, path, requestBody, requestHeaders,method} = querySettings.detail
    let url = `${origin}${path}`
    if(method === 'POST') return url
    const queryParams = new URLSearchParams()
    // 替换URL参数
    Object.keys(mappings).forEach(key => {
      const data = recursiveFieldSearch(listItem, mappings[key].path)
      if (data) queryParams.set(key, data.value)
    })
    url += '?' + queryParams.toString()
    return url
  }

  // 发送HTTP请求
  const sendRequest = async (url: string, options: RequestInit = {}): Promise<any> => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      throw new Error(`请求失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // 获取列表数据
  const fetchListData = async (): Promise<any[]> => {
    info('开始执行: 获取列表数据', undefined, ['async-start'])
    const startTime = Date.now()

    try {
      if (!querySettings.list) {
        throw new Error('未设置列表接口')
      }

      const url = `${querySettings.list.origin}${querySettings.list.path}`
      const options: RequestInit = {
        method: querySettings.list.method || 'GET'
      }

      if (querySettings.list.requestBody) {
        options.body = querySettings.list.requestBody
      }

      if (querySettings.list.requestHeaders) {
        options.headers = {
          ...options.headers,
          ...(querySettings.list.requestHeaders as Record<string, string>)
        }
      }

      const response = await sendRequest(url, options)
      const list = getNestedValue(response, querySettings.listConfig.list)

      const duration = Date.now() - startTime


      return list
    } catch (err) {
      const duration = Date.now() - startTime
      const errorObj = err instanceof Error ? err : new Error(String(err))
      error(`执行失败: 获取列表数据 (耗时: ${duration}ms)`, errorObj, {
        duration
      }, ['async-error'])
      throw err
    }
  }


  // 开始分析
  const startAnalysis = async () => {
    if (analysisState.isRunning) {
      warn('分析已在进行中，跳过重复启动')
      return
    }

    logUserAction('开始数据分析')
    const startTime = Date.now()

    analysisState.isRunning = true
    analysisState.progress = 0
    analysisState.total = 0

    try {
      info('开始数据分析流程')

      // 1. 获取列表数据
      const listData = await fetchListData()

      if (!listData?.length) {
        warn('列表数据为空，无法继续分析')
        return
      }

      // 2. 分析字段映射关系

      if (!querySettings.detail) {
        error('未设置详情接口，无法进行字段映射分析')
        return
      }

      const mappings = analyzeFieldMappings(listData, querySettings.detail)
      analysisState.fieldMappings = mappings
      const relatedFields = Object.keys(mappings).filter(key => mappings[key].length > 0)
      info('字段映射关系', { mappings })

      if (!relatedFields.length) {
        warn('未找到有效的字段映射关系，请检查接口配置')
        return
      }

      // 3. 批量发送详情请求
      analysisState.total = listData.length


      const concurrencyController = createConcurrencyController(analysisState.config.maxConcurrency)

      const detailTasks = listData.map((item, index) => {
        return concurrencyController.execute(async () => {
          const itemStartTime = Date.now()
          try {
            const detailUrl = buildDetailUrl(item, mappings)
            if (!detailUrl) {
              error(`第${index + 1}条数据无法构建详情URL`, undefined, { item })
              return
            }

            const detailOptions: RequestInit = {
              method: querySettings.detail!.method || 'GET'
            }

            if (querySettings.detail!.requestBody) {
              detailOptions.body = querySettings.detail!.requestBody
            }

            const detailResponse = await sendRequest(detailUrl, detailOptions)

            // 4. 递归搜索目标字段
            const searchResult = recursiveFieldSearch(detailResponse, analysisState.config.searchField)
            const fieldValue = searchResult?.value

            // 5. 比较值
            if (fieldValue === analysisState.config.targetValue) {
              info(`找到匹配数据 #${index + 1}`, {
                url: detailUrl,
                body: detailOptions.body,
                fieldPath: searchResult?.path,
                fieldValue
              }, ['analysis-match'])
            }

            analysisState.progress++
            logPerformance(`处理第${index + 1}条数据`, itemStartTime)
          } catch (err) {
            const errorObj = err instanceof Error ? err : new Error(String(err))
            error(`第${index + 1}条数据处理失败`, errorObj, {
              index,
              item,
              processingTime: Date.now() - itemStartTime
            }, ['analysis-error', 'processing-failure'])
            analysisState.progress++
          }
        })
      })

      await Promise.all(detailTasks)

      const totalTime = Date.now() - startTime
      info(`分析完成: 处理 ${analysisState.progress} 项，耗时 ${totalTime}ms`, {}, ['analysis-complete'])

    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      error('数据分析流程失败', errorObj, undefined, ['analysis-fatal', 'workflow-failure'])
    } finally {
      logPerformance('完整数据分析流程', startTime)
      analysisState.isRunning = false
    }
  }

  // 停止分析
  const stopAnalysis = () => {
    logUserAction('手动停止数据分析')
    analysisState.isRunning = false
    warn('数据分析已手动停止', { progress: analysisState.progress, total: analysisState.total }, ['manual-stop', 'user-action'])
  }

  // 更新配置
  const updateConfig = (config: Partial<AnalysisConfig>) => {
    const oldConfig = { ...analysisState.config }
    Object.assign(analysisState.config, config)

  }

  return {
    analysisState,
    startAnalysis,
    stopAnalysis,
    updateConfig,
    recursiveFieldSearch
  }
}
