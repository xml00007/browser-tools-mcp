import { reactive, watch, computed } from 'vue'

// Define the settings object with default values
const settings = reactive({
  list: null as RequestData | null,
  detail: null as RequestData | null,
  listConfig: {
    total: 'data.totalCount',
    pageNo: 'data.pageNo',
    pageSize: 'data.pageSize',
    list: 'data.list'
  } as ListConfig,
})

interface Settings {
  list: RequestData | null
  detail: RequestData | null
}

interface ListConfig {
  total: string
  pageNo: string
  pageSize: string
  list: string
}

// Derived computed properties for easy URL extraction
const listUrl = computed(() => {
  if (!settings.list) return ''
  return `${settings.list.origin}${settings.list.path}`
})

const detailUrl = computed(() => {
  if (!settings.detail) return ''
  return `${settings.detail.origin}${settings.detail.path}`
})

// Helper function to extract base URL from request data
const extractBaseUrl = (request: RequestData | null): string => {
  if (!request) return ''
  return `${request.origin}${request.path}`
}

// The composable function
export function useDataQuery() {
  // Save settings to localStorage when they change
  watch(settings, (newSettings) => {
    if (typeof localStorage !== 'undefined') {
      // localStorage.setItem('dataQuerySettings', JSON.stringify(newSettings))
    }
  }, { deep: true })

  // Load settings from localStorage
  const loadSettings = () => {
    if (typeof localStorage !== 'undefined') {
      try {
        // const stored = localStorage.getItem('dataQuerySettings')
        // if (stored) {
        //   const parsed = JSON.parse(stored)
        //   Object.assign(settings, parsed)
        // }
      } catch (error) {
        console.error('Failed to load data query settings:', error)
      }
    }
  }

  const updateDataQuery = (newSettings: Partial<Settings>) => {
    Object.assign(settings, newSettings)
  }

  const setListInterface = (request: RequestData) => {
    settings.list = request
    settings.listConfig = {
      total: 'data.totalCount',
      pageNo: 'data.pageNo',
      pageSize: 'data.pageSize',
      list: 'data.list'
    }
    // 分析出list 接口的 total pageNo pageSize list 分别对应的是哪几个字段
    console.log('列表接口已设置:', extractBaseUrl(request))
  }

  const setDetailInterface = (request: RequestData) => {
    settings.detail = request
    console.log('详情接口已设置:', extractBaseUrl(request))
  }

  // Load settings immediately
  loadSettings()

  return {
    settings,
    listUrl,
    detailUrl,
    updateDataQuery,
    setListInterface,
    setDetailInterface,
    extractBaseUrl,
  }
}
