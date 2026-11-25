<template>
  <div v-if="ornamentRows.length" class="print-style-ornaments" aria-hidden="true">
    <div
      v-for="(row, rowIndex) in ornamentRows"
      :key="rowIndex"
      class="print-style-ornaments__row"
      :class="`print-style-ornaments__row--${styleId}`"
    >
      <span
        v-for="(item, itemIndex) in row"
        :key="itemIndex"
        class="print-style-ornaments__item"
        :style="item"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  styleId: { type: String, default: 'warm' }
})

const ornamentRows = computed(() => [])
</script>

<style scoped>
.print-style-ornaments {
  position: relative;
  z-index: 2;
  pointer-events: none;
  margin-bottom: 0.35rem;
}

.print-style-ornaments__row {
  position: relative;
  height: 1.1rem;
}

.print-style-ornaments__item {
  position: absolute;
  top: 0;
  display: block;
  box-shadow: 0 0 0 0.12rem rgba(255, 255, 255, 0.75);
}

</style>
