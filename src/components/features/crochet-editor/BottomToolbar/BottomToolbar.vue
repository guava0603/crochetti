<template>
  <teleport to="body">
    <div class="crochet-scrollbar" :class="{ expanded: isExpanded }">
      <slot />
    </div>
  </teleport>
</template>

<script setup>
import { provide, ref } from 'vue'

const isExpanded = ref(true)

provide('crochetScrollbarExpanded', isExpanded)

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

defineExpose({
  isExpanded,
  toggleExpanded
})
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
  height: fit-content;
}
</style>
