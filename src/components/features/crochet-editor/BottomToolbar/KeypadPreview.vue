<template>
  <div class="keypad-preview">
    <template v-for="(node, i) in rowList" :key="i">
      <KeypadCaret v-if="caretHere && caret === i" />
      <KeypadPreviewNode
        :node="node"
        :path="[i]"
        :active-path="activePath"
        :caret="caret"
        @pick="(p) => $emit('pick', p)"
        @update-count="(n) => $emit('update-count', n)"
      />
      <span v-if="i < rowList.length - 1" class="keypad-preview__sep">, </span>
    </template>
    <KeypadCaret v-if="caretHere && caret >= rowList.length" />
    <span v-if="!rowList.length" class="keypad-preview__empty">…</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import KeypadCaret from './KeypadCaret.vue'
import KeypadPreviewNode from './KeypadPreviewNode.vue'

const props = defineProps({
  rowList: { type: Array, default: () => [] },
  activePath: { type: Array, default: () => [] },
  // Insertion point inside the current container (the row itself when activePath is empty).
  caret: { type: Number, default: 0 }
})

defineEmits(['pick', 'update-count'])

// The caret is drawn in the row list only when no pattern/bundle is selected.
const caretHere = computed(() => props.activePath.length === 0)
</script>

<style scoped>
.keypad-preview {
  font-size: 0.875rem;
  color: var(--color-font-dark);
  line-height: 1.9;
}

.keypad-preview__sep {
  color: var(--color-font-note);
}

.keypad-preview__empty {
  color: var(--color-font-note);
}
</style>
