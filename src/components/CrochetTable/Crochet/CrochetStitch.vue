<template>
  <span class="stitch-text">
    <template v-if="showIcon">
      <span v-if="countValue > 1" class="stitch-count">{{ countValue }}</span>
      <img
        class="stitch-icon"
        :src="iconSrc"
        alt=""
        aria-hidden="true"
        draggable="false"
      />
    </template>
    <template v-else>
      {{ displayText }}
    </template>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BasicStitch, CROCHET_LANG, getStitchDisplayText } from '@/constants/crochetData.js'
import { getCrochetIconUrl } from '@/constants/crochetIcons'
import { useCrochetLang } from '@/composables/useCrochetLang'
import { useSelfDefinedStitchesContext } from '@/composables/selfDefinedStitchesContext'

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
const selfDefinedCtx = useSelfDefinedStitchesContext()

const countValue = computed(() => {
  const n = Number(props.count)
  return Number.isFinite(n) ? Math.max(1, Math.trunc(n)) : 1
})

const isIconMode = computed(() => Number(crochetLang.value) === CROCHET_LANG.icon)

const stitchData = computed(() => {
  const selfDefined = selfDefinedCtx.byId.value.get(props.stitchId)
  if (selfDefined?.name) return { kind: 'self', value: selfDefined }
  const stitch = BasicStitch[props.stitchId]
  return stitch ? { kind: 'basic', value: stitch } : null
})

const iconSrc = computed(() => {
  if (!isIconMode.value) return ''
  const s = stitchData.value
  if (!s || s.kind !== 'basic') return ''
  return getCrochetIconUrl({ stitch: s.value, position: props.position })
})

const showIcon = computed(() => Boolean(isIconMode.value && iconSrc.value))

const displayText = computed(() => {
  const s = stitchData.value
  if (!s) return ''
  if (s.kind === 'self') {
    const base = String(s.value.name)
    return countValue.value > 1 ? `${countValue.value}${base}` : base
  }

  const stitch = s.value
  // Icon mode string fallback should be Chinese text.
  const text = getStitchDisplayText(stitch, isIconMode.value ? CROCHET_LANG.text_zh : crochetLang.value)

  const pos = typeof props.position === 'string' ? props.position.trim().toUpperCase() : ''
  const hasPos = Boolean(pos)

  if (!hasPos) return countValue.value > 1 ? `${countValue.value}${text}` : text

  // Position prefix: symbol_jp => FLX/FPF..., text_zh => 內鉤長針/挑前半針短針...
  const decorated = (() => {
    const translatePrefix = isIconMode.value || Number(crochetLang.value) === CROCHET_LANG.text_zh
    if (!translatePrefix) return `${pos}${text}`

    const key = `crochet.positionPrefix.${pos}`
    const translated = t(key)
    const prefix = translated === key ? pos : translated
    return `${prefix}${text}`
  })()

  return countValue.value > 1 ? `${countValue.value}${decorated}` : decorated
})

</script>

<style scoped>
.stitch-text {
  position: relative;
  display: inline-block;
  color: #111827;
}

.stitch-count {
  display: inline-block;
  margin-right: 2px;
}

.stitch-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  vertical-align: -3px;
}
</style>
