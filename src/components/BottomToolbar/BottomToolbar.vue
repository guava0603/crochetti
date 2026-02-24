<template>
  <div class="crochet-scrollbar" :class="{ expanded: isExpanded }">
    <slot />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const isExpanded = ref(true)
</script>

<style scoped>
.crochet-scrollbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 101;
  transition: max-height 0.3s ease;
}

.crochet-scrollbar.expanded {
  max-height: 50vh;
  height: fit-content;
}

.expand-button {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1rem;
  color: #42b983;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  z-index: 101;
}

.expand-button:hover {
  background: #42b983;
  color: white;
  border-color: #42b983;
}
</style>
