<template>
  <div
    class="translate-toggle"
    @click.stop
    @mousedown.stop
    @pointerdown.stop
    @touchstart.stop
    @touchmove.stop.prevent
    @touchend.stop
    @wheel.stop.prevent
  >
    <ButtonGroup
      type="toggle"
      v-model="langKey"
      :items="langItems"
      :aria-label="t('toolbar.editRow.crochetLang')"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ButtonGroup from '@/components/buttons/ButtonGroup.vue'
import { useCrochetLang } from '@/composables/useCrochetLang'

const { t } = useI18n({ useScope: 'global' })
const { crochetLang: crochetLangRef, setCrochetLang } = useCrochetLang()

const crochetLang = computed(() => Number(crochetLangRef.value) || 0)

const langKey = computed({
  get: () => (crochetLang.value === 1 ? 'zh' : 'jp'),
  set: (next) => {
    const nextId = next === 'zh' ? 1 : 0
    void setCrochetLang(nextId)
  }
})

const langItems = computed(() => ([
  {
    key: 'jp',
    label: t('toolbar.editRow.crochetLangSymbolJp'),
    ariaLabel: t('toolbar.editRow.crochetLangSymbolJp')
  },
  {
    key: 'zh',
    label: t('toolbar.editRow.crochetLangTextZh'),
    ariaLabel: t('toolbar.editRow.crochetLangTextZh')
  }
]))
</script>

<style scoped>
.translate-toggle {
  display: inline-flex;
  flex: none;
}
</style>
