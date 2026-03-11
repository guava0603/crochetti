<template>
  <teleport to="body">
    <div class="crochet-scrollbar" :class="{ expanded: isExpanded }">
      <slot />
    </div>
  </teleport>
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
  z-index: var(--z-bottom-toolbar);
  background: white;
  transition: max-height 0.3s ease;
}

.crochet-scrollbar.expanded {
  /* Must be above floating docks/FABs. */
  z-index: calc(var(--z-bottom-toolbar) + 1);
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
  color: var(--color-icon-add);
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  z-index: calc(var(--z-bottom-toolbar) + 2);
}

.expand-button:hover {
  background: var(--color-icon-add);
  color: white;
  border-color: var(--color-icon-add);
}
</style>
