<template>
  <div class="help-page">
    <h3 class="help-page__title">{{ t('help.recordHowTo.page8.title') }}</h3>
    <p class="help-page__text">{{ t('help.recordHowTo.page8.body') }}</p>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'RecordHowToPage8' })

const { t } = useI18n({ useScope: 'global' })
</script>
