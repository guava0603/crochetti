<template>
  <div class="help-page">
    <h3 class="help-page__title">{{ t('help.editCrochetBasics.pageIncrease.title') }}</h3>
    <p class="help-page__text">{{ t('help.editCrochetBasics.pageIncrease.body') }}</p>

    <ul class="help-page__list">
      <li>{{ t('help.editCrochetBasics.pageIncrease.items.v') }}</li>
      <li>{{ t('help.editCrochetBasics.pageIncrease.items.colorHint') }}</li>
      <li>{{ t('help.editCrochetBasics.pageIncrease.items.useWithPosition') }}</li>
    </ul>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
</script>
