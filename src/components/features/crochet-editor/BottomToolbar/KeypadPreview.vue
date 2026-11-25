<template>
  <div class="keypad-preview">
    <template v-for="(node, i) in rowList" :key="i">
      <KeypadPreviewNode
        :node="node"
        :path="[i]"
        :active-path="activePath"
        @pick="(p) => $emit('pick', p)"
        @update-count="(n) => $emit('update-count', n)"
      />
      <span v-if="i < rowList.length - 1" class="keypad-preview__sep">, </span>
    </template>
    <span v-if="!rowList.length" class="keypad-preview__empty">…</span>
  </div>
</template>

<script setup>
import KeypadPreviewNode from './KeypadPreviewNode.vue'

defineProps({
  rowList: { type: Array, default: () => [] },
  activePath: { type: Array, default: () => [] }
})

defineEmits(['pick', 'update-count'])
</script>

<style scoped>
.keypad-preview {
  font-size: 0.875rem;
  color: #374151;
  line-height: 1.9;
}

.keypad-preview__sep {
  color: #6b7280;
}

.keypad-preview__empty {
  color: #9ca3af;
}
</style>
