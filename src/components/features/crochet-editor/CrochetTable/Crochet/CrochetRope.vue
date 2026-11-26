<template>
  <span class="rope">
    <CrochetStitch
      :stitch-id="1"
      :position="''"
      :count="chainCount"
    />
    <span v-if="repeat > 1" class="rope-count">{{ repeatSuffix }}</span>
  </span>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import CrochetStitch from './CrochetStitch.vue'
import { CROCHET_LANG } from '@/constants/crochetData.js'
import { useCrochetLang } from '@/composables/useCrochetLang'
import { normalizeRopeChainCount } from '@/utils/ropeChainCount'

const props = defineProps({
  chainCount: {
    type: Number,
    required: true
  },
  // How many times this rope is repeated (anchor `count`).
  count: {
    type: Number,
    default: 1
  }
})

const { t } = useI18n({ useScope: 'global' })
const { crochetLang } = useCrochetLang()
const showZhRepeatOverride = inject('showZhRepeatOverride', null)

const chainCount = computed(() => normalizeRopeChainCount(props.chainCount))
const repeat = computed(() => Math.max(1, Math.floor(Number(props.count) || 1)))

// Same repeat wording as patterns: " * n", or 「重複n組」 in the Chinese text mode.
const repeatSuffix = computed(() => {
  const zh = typeof showZhRepeatOverride === 'boolean'
    ? showZhRepeatOverride
    : crochetLang.value === CROCHET_LANG.text_zh
  return zh ? t('crochet.display.patternRepeatSuffix', { count: repeat.value }) : ` * ${repeat.value}`
})
</script>

<style scoped>
.rope-count {
  color: var(--color-font-note);
  font-weight: 600;
}
</style>
