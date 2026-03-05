<template>
  <div class="help-page">
    <h3 class="help-page__title">{{ t('help.editCrochetBasics.pageIntro.title') }}</h3>

    <ul class="help-page__list">
      <li>{{ t('help.editCrochetBasics.pageIntro.items.openEditor') }}</li>
      <li>{{ t('help.editCrochetBasics.pageIntro.items.changeOrAdd') }}</li>
    </ul>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
</script>
