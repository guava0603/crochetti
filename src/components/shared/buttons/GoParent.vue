<template>
  <button
    type="button"
    class="go-parent"
    @click.stop="$emit('go-parent', $event)"
  >
    <svg width="20px" height="20px" stroke-width="2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M4.5 10.5L8 7L11.5 10.5" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M8 7V13C8 15.2091 9.79086 17 12 17H19" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
  </button>
</template>

<script setup>
defineEmits(['go-parent'])
</script>

<style scoped>
.go-parent {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border-radius: 0.375rem;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
}

.go-parent:hover {
  background: #f3f4f6;
}

.go-parent:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.go-parent__icon {
  width: 1rem;
  height: 1rem;
}
</style>
