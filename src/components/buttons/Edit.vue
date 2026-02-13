<template>
  <button @click="$emit('click')" class="btn-edit" type="button" title="Edit">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  </button>
</template>

<script setup>
defineEmits(['click'])
</script>

<style scoped>
.btn-edit {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.625rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.btn-edit:hover {
  background: #2563eb;
  transform: scale(1.05);
}

.btn-edit svg {
  display: block;
}
</style>
