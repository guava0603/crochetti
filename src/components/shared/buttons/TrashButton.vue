<template>
  <button
    type="button"
    @click="$emit('click')"
    class="trash-button"
  >
    🗑️
  </button>
</template>

<script setup>
defineEmits(['click'])
</script>

<style scoped>
.trash-button {
  width: 36px;
  height: 36px;
  background: #fee2e2;
  border: 2px solid #ef4444;
  border-radius: 6px;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.trash-button:hover {
  background: #ef4444;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
</style>
