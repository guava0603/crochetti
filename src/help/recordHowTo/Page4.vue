<template>
  <div class="help-page">
    <h3 class="help-page__title">{{ t('help.recordHowTo.page4.title') }}</h3>
    <p class="help-page__text">{{ t('help.recordHowTo.page4.body') }}</p>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

defineOptions({
  name: 'RecordHowToPage'
})

const { t } = useI18n({ useScope: 'global' })
</script>
