<script setup lang="ts">
import RequestList from '../../components/RequestList.vue'
import DataQuery from '../../components/DataQuery.vue'
import { useConnection } from '../../composables/useConnection'
import Connect from './Connect.vue'
import Setting from './Setting.vue'
import { useSettings } from '../../composables/useSettings'

const { settings } = useSettings()


// Initialize the connection composable to activate the listeners
useConnection()
</script>

<template>
  <div class="panel-container">
    <!-- Connect Component -->
    <!-- <Connect /> -->

    <!-- Settings Component -->
    <Setting />

    <!-- Request List Component -->
    <RequestList style="flex:0.3" />
    
    <DataQuery  style="flex:0.4" v-if="settings.showDataQuery" />
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
</style>
