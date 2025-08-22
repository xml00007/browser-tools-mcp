<template>
  <div class="panel-container">
    <!-- Connect Component -->
    <Connect />

    <!-- Settings Component -->
    <Setting />
  </div>
</template>

<script setup lang="ts">
import Connect from './Connect.vue';
import Setting from './Setting.vue';
import { useConnection } from '../../composables/useConnection';

// Initialize the connection composable to activate the listeners
useConnection();
</script>

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
