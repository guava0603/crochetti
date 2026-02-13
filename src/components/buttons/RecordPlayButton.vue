<template>
  <button
    class="record-action-btn"
    type="button"
    @click="$emit('click')"
  >
    <svg :width="iconSize" :height="iconSize" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="14" fill="#42b983" />
      <polygon points="12,9 21,14 12,19" fill="#fff" />
    </svg>
  </button>
</template>

<script setup>
defineProps({
  iconSize: {
    type: Number,
    default: 28
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
