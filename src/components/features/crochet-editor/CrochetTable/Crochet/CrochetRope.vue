<template>
  <CrochetStitch
    :stitch-id="1"
    :position="''"
    :count="chainCount"
  />
</template>

<script setup>
import { computed } from 'vue'
import CrochetStitch from './CrochetStitch.vue'
import { normalizeRopeChainCount } from '@/utils/ropeChainCount'

const props = defineProps({
  chainCount: {
    type: Number,
    required: true
  }
})

const chainCount = computed(() => {
  return normalizeRopeChainCount(props.chainCount)
})
</script>
