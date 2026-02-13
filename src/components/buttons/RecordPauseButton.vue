<template>
  <button
    class="record-action-btn"
    type="button"
    @click="$emit('click')"
  >
    <svg :width="iconSize" :height="iconSize" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="14" fill="#f59e42" />
      <rect x="9" y="8" width="3" height="12" rx="1" fill="#fff" />
      <rect x="16" y="8" width="3" height="12" rx="1" fill="#fff" />
    </svg>
  </button>
</template>

<script setup>
defineProps({
  iconSize: {
    type: Number,
    default: 48
  }
})

defineEmits(['click'])
</script>

<style scoped>
.record-action-btn {
  background: transparent;
  border: none;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.record-action-btn:disabled {
  cursor: not-allowed;
}
</style>
