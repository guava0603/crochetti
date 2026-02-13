<template>
  <div class="crochet-list">
    <button
      v-for="crochet in BasicStitch"
      :key="crochet.index"
      type="button"
      @click="$emit('stitch-click', crochet.index)"
      class="crochet-button"
      :disabled="disabled"
    >
      <div class="crochet-symbol">{{ crochet.symbol_jp }}</div>
    </button>
    <button
      v-if="showCustomButton"
      type="button"
      @click="$emit('custom-click')"
      class="crochet-button custom-button"
      :disabled="disabled"
    >
      <div class="crochet-symbol">自定義</div>
    </button>
  </div>
</template>

<script setup>
import { BasicStitch } from '@/constants/crochetData'

defineProps({
  disabled: {
    type: Boolean,
    default: false
  },
  showCustomButton: {
    type: Boolean,
    default: true
  }
})

defineEmits(['stitch-click', 'custom-click'])
</script>

<style scoped>
.crochet-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  gap: 0.75rem;
  overflow-y: auto;
  max-height: calc(50vh - 80px);
  padding-right: 0.5rem;
}

.crochet-scrollbar:not(.expanded) .crochet-list {
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  max-height: none;
}

.crochet-list::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.crochet-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.crochet-button {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.crochet-button:hover:not(:disabled) {
  background: #42b983;
  border-color: #42b983;
  color: white;
}

.crochet-button:hover:not(:disabled) .crochet-stats {
  color: white;
}

.crochet-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.crochet-symbol {
  font-size: 0.75rem;
  color: #6b7280;
}

.crochet-button:hover:not(:disabled) .crochet-symbol {
  color: white;
}

.custom-button {
  background: #fef3c7;
  border-color: #fbbf24;
}

.custom-button:hover:not(:disabled) {
  background: #fbbf24;
  border-color: #f59e0b;
}
</style>
