<template>
  <span @click.stop="handleClick" class="clickable stitch-text">
    {{ displayText }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { BasicStitch } from '@/constants/crochetData.js'

const props = defineProps({
  stitchId: {
    type: Number,
    required: true
  },
  count: {
    type: Number,
    default: 1
  }
})

const emit = defineEmits(['select'])

const displayText = computed(() => {
  const stitch = BasicStitch[props.stitchId]
  if (!stitch) return ''
  return props.count > 1 ? `${props.count}${stitch.symbol_jp}` : stitch.symbol_jp
})

const handleClick = (event) => {
  emit('select', event)
}
</script>

<style scoped>
.stitch-text {
  position: relative;
  display: inline-block;
  color: #111827;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
  padding: 2px 4px;
}

.clickable {
  cursor: pointer;
}
</style>
