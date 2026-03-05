<template>
  <div class="help-page">
    <h3 class="help-page__title">{{ t('help.editCrochetBasics.pageDecorativeStitches.title') }}</h3>
    <p class="help-page__text">{{ t('help.editCrochetBasics.pageDecorativeStitches.body') }}</p>

    <ul class="help-page__list">
      <li>{{ t('help.editCrochetBasics.pageDecorativeStitches.items.sl') }}</li>
      <li>{{ t('help.editCrochetBasics.pageDecorativeStitches.items.ch') }}</li>
      <li>{{ t('help.editCrochetBasics.pageDecorativeStitches.items.skip') }}</li>
      <li>{{ t('help.editCrochetBasics.pageDecorativeStitches.items.turning') }}</li>
    </ul>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
</script>
