/* @source cursor @line_count 31 @branch main */
import { onMounted, reactive, watch } from 'vue'

// Define the settings object with default values
const settings = reactive({
  list: null,
  detail: null,
})

interface Settings {
  list: RequestData | null
  detail: RequestData | null
}


// The composable function
export function useDataQuery() {
  // Load settings when the composable is first used
  onMounted(() => {
  })

  const updateDataQuery = (newSettings: Partial<Settings>) => {
    Object.assign(settings, newSettings)
  }

  return {
    settings,
    updateDataQuery,
  }
}
