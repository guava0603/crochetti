<template>
  <div class="help-page">
    <h3 class="help-page__title">{{ t('help.addProjectTableHeader.pageStitch.title') }}</h3>
    <p class="help-page__text">{{ t('help.addProjectTableHeader.pageStitch.body') }}</p>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
</script>
