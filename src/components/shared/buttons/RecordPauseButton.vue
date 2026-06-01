<template>
  <button
    class="record-action-btn"
    type="button"
    @click="$emit('click', $event)"
  >
    <svg :width="iconSize" :height="iconSize" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="14" />
      <rect x="9" y="8" width="3" height="12" rx="1" fill="#5A524B" />
      <rect x="16" y="8" width="3" height="12" rx="1" fill="#5A524B" />
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
  background: var(--color-play-and-pause);
  color: brown;
  border-radius: 50%;
  border: none;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
</style>
