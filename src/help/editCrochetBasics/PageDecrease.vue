<template>
  <div class="help-page">
    <h3 class="help-page__title">{{ t('help.editCrochetBasics.pageDecrease.title') }}</h3>
    <p class="help-page__text">{{ t('help.editCrochetBasics.pageDecrease.body') }}</p>

    <ul class="help-page__list">
      <li>{{ t('help.editCrochetBasics.pageDecrease.items.panel') }}</li>
      <li>{{ t('help.editCrochetBasics.pageDecrease.items.mapping') }}</li>
      <li>{{ t('help.editCrochetBasics.pageDecrease.items.bpfa') }}</li>
      <li>{{ t('help.editCrochetBasics.pageDecrease.items.stats') }}</li>
    </ul>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
</script>
