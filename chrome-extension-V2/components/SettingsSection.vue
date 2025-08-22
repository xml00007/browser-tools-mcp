<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  collapsible: {
    type: Boolean,
    default: false,
  },
  startOpen: {
    type: Boolean,
    default: true,
  },
})

const isContentVisible = ref(props.startOpen)

function toggleVisibility() {
  if (props.collapsible) {
    isContentVisible.value = !isContentVisible.value
  }
}
</script>

<template>
  <div class="settings-section">
    <div
      v-if="title"
      class="settings-header" @click="toggleVisibility"
    >
      <h3>{{ title }}</h3>
      <svg
        v-if="collapsible"
        class="chevron" :class="[{ open: isContentVisible }]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
    <div
      v-show="isContentVisible"
      class="settings-content" :class="[{ visible: isContentVisible }]"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.settings-section {
  border: 1px solid #ccc;
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 4px;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.settings-header h3 {
  margin: 0;
}

.settings-content {
  margin-top: 16px;
}

.chevron {
  width: 20px;
  height: 20px;
  transition: transform 0.3s ease;
}

.chevron.open {
  transform: rotate(180deg);
}
</style>
