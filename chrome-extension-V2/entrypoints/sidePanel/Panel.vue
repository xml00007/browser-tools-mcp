<script setup lang="ts">
import RequestList from '../../components/RequestList.vue'
import DataQuery from '../../components/DataQuery.vue'
import LogViewer from '../../components/LogViewer.vue'
import { useConnection } from '../../composables/useConnection'
import { useLogger } from '../../composables/useLogger'
import Connect from './Connect.vue'
import Setting from './Setting.vue'
import { useSettings } from '../../composables/useSettings'
import { ref } from 'vue'

const { settings } = useSettings()
const { info, logUserAction } = useLogger('Panel')

// 显示日志查看器
const showLogViewer = ref(false)

const toggleLogViewer = () => {
  showLogViewer.value = !showLogViewer.value
  logUserAction(`${showLogViewer.value ? '打开' : '关闭'}日志查看器`)
}

// Initialize the connection composable to activate the listeners
useConnection()

// 记录面板初始化
info('侧边栏面板已加载')
</script>

<template>
  <div class="panel-container">
    <!-- Connect Component -->
    <!-- <Connect /> -->

    <!-- 工具栏 -->
    <div class="toolbar">
      <button @click="toggleLogViewer" class="log-toggle-btn">
        {{ showLogViewer ? '隐藏日志' : '显示日志' }}
      </button>
    </div>

    <!-- Settings Component -->
    <Setting />

    <!-- Request List Component -->
    <RequestList style="flex:0.3" />
    
    <DataQuery style="flex:0.4" v-if="settings.showDataQuery" />
    
    <!-- Log Viewer Component -->
    <LogViewer 
      v-if="showLogViewer" 
      style="flex:0.3"
      module="Global"
      :auto-refresh="true"
      :refresh-interval="3000"
    />
  </div>
</template>

<style scoped>
.panel-container {
  padding: 12px;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  background-color: #282828;
  color: #fff;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
  padding: 4px 0;
}

.log-toggle-btn {
  padding: 6px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
}

.log-toggle-btn:hover {
  background: #0056b3;
}
</style>
