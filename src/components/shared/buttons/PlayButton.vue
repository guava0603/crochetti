<template>
  <button @click="$emit('click', $event)" class="btn-play" type="button" title="Start Recording">
    <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#5A524B" stroke-width="2"><path d="M6.90588 4.53682C6.50592 4.2998 6 4.58808 6 5.05299V18.947C6 19.4119 6.50592 19.7002 6.90588 19.4632L18.629 12.5162C19.0211 12.2838 19.0211 11.7162 18.629 11.4838L6.90588 4.53682Z" fill="#5A524B" stroke="#5A524B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
  </button>
</template>

<script setup>
defineEmits(['click'])
</script>

<style scoped>
.btn-play {
  background: var(--color-play-and-pause);
  color: var(--color-warm-brown);
  border: none;
  padding: 0.75rem;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  box-shadow: 4px 4px 0px #5A524B; /* Add a subtle "shadow" using the warm brown color */
}

.btn-play svg {
  display: block;
  margin-left: 2px; /* Visual centering for play icon */
}
</style>
