<template>
  <div class="help-page">
    <h3 class="help-page__title">{{ t('help.editCrochetBasics.pageBasicStitches.title') }}</h3>
    <p class="help-page__text">{{ t('help.editCrochetBasics.pageBasicStitches.body') }}</p>

    <ul class="help-page__list">
      <li>{{ t('help.editCrochetBasics.pageBasicStitches.items.x') }}</li>
      <li>{{ t('help.editCrochetBasics.pageBasicStitches.items.t') }}</li>
      <li>{{ t('help.editCrochetBasics.pageBasicStitches.items.f') }}</li>
      <li>{{ t('help.editCrochetBasics.pageBasicStitches.items.e') }}</li>
    </ul>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
</script>
