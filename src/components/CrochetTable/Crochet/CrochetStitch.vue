<template>
  <span class="stitch-text">
    {{ displayText }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BasicStitch, getStitchDisplayText } from '@/constants/crochetData.js'
import { useCrochetLang } from '@/composables/useCrochetLang'

const props = defineProps({
  stitchId: {
    type: Number,
    required: true
  },
  position: {
    type: String,
    default: ''
  },
  count: {
    type: Number,
    default: 1
  }
})

const { crochetLang } = useCrochetLang()
const { t } = useI18n({ useScope: 'global' })

const displayText = computed(() => {
  const stitch = BasicStitch[props.stitchId]
  if (!stitch) return ''
  const text = getStitchDisplayText(stitch, crochetLang.value)

  const pos = typeof props.position === 'string' ? props.position.trim().toUpperCase() : ''
  const hasPos = Boolean(pos)

  if (!hasPos) {
    return props.count > 1 ? `${props.count}${text}` : text
  }

  // Position prefix: symbol_jp => FLX/FPF..., text_zh => 內鉤長針/挑前半針短針...
  const decorated = (() => {
    if (crochetLang.value !== 1) return `${pos}${text}`

    const key = `crochet.positionPrefix.${pos}`
    const translated = t(key)
    const prefix = translated === key ? pos : translated
    return `${prefix}${text}`
  })()

  return props.count > 1 ? `${props.count}${decorated}` : decorated
})

</script>

<style scoped>
.stitch-text {
  position: relative;
  display: inline-block;
  color: #111827;
}
</style>
