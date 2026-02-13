<template>
  <button @click="$emit('click')" class="btn-play" type="button" title="Start Recording">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  </button>
</template>

<script setup>
defineEmits(['click'])
</script>

<style scoped>
.btn-play {
  background: #42b983;
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.btn-play:hover {
  background: #3aa876;
  transform: scale(1.1);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.btn-play svg {
  display: block;
  margin-left: 2px; /* Visual centering for play icon */
}
</style>
