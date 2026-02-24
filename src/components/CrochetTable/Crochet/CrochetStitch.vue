<template>
  <span class="stitch-text">
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

const displayText = computed(() => {
  const stitch = BasicStitch[props.stitchId]
  if (!stitch) return ''
  return props.count > 1 ? `${props.count}${stitch.symbol_jp}` : stitch.symbol_jp
})

</script>

<style scoped>
.stitch-text {
  position: relative;
  display: inline-block;
  color: #111827;
}
</style>
