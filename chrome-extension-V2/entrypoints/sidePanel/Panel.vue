<script setup lang="ts">
import RequestList from '../../components/RequestList.vue'
import DataQuery from '../../components/DataQuery.vue'
import { useConnection } from '../../composables/useConnection'
import Connect from './Connect.vue'
import Setting from './Setting.vue'


// Initialize the connection composable to activate the listeners
useConnection()
</script>

<template>
  <div class="panel-container">
    <!-- Connect Component -->
    <!-- <Connect /> -->

    <!-- Settings Component -->
    <!-- <Setting /> -->

    <!-- Request List Component -->
    <RequestList />
    
    <DataQuery />
  </div>
</template>

<style scoped>
.panel-container {
  padding: 16px;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  background-color: #282828;
  color: #fff;
}
</style>
