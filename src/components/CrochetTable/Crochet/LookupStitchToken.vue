<template>
  <span class="stitch-text">{{ displayText }}</span>
</template>

<script setup>
import { computed, inject, unref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  stitchId: { type: Number, required: true },
  position: { type: String, default: '' },
  count: { type: Number, default: 1 }
})

const stitchLookup = inject('stitchLookup', null)
const resolvedStitchLookup = computed(() => unref(stitchLookup))

const { t } = useI18n({ useScope: 'global' })

const countValue = computed(() => {
  const n = Number(props.count)
  return Number.isFinite(n) ? Math.max(1, Math.trunc(n)) : 1
})

const label = computed(() => {
  const lookup = resolvedStitchLookup.value
  const id = props.stitchId

  const meta = (lookup && (typeof lookup === 'object')) ? lookup[id] : null
  if (!meta) return String(id)

  const key = meta && meta.nameKey ? String(meta.nameKey).trim() : ''
  if (key) {
    const translated = t(key)
    if (translated && translated !== key) return translated
  }

  const symbolJp = meta && meta.symbol_jp ? String(meta.symbol_jp).trim() : ''
  return symbolJp || String(id)
})

const displayText = computed(() => {
  const base = label.value
  return countValue.value > 1 ? `${countValue.value}${base}` : base
})
</script>

<style scoped>
.stitch-text {
  position: relative;
  display: inline-block;
  color: #111827;
}
</style>
