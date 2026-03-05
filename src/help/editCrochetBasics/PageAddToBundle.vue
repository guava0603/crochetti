<template>
  <div class="help-page">
    <h3 class="help-page__title">{{ t('help.editCrochetBasics.pageAddToBundle.title') }}</h3>

    <p class="help-page__text">{{ t('help.editCrochetBasics.pageAddToBundle.body') }}</p>

    <ul class="help-page__list">
      <li>{{ t('help.editCrochetBasics.pageAddToBundle.items.switchTab') }}</li>
      <li>{{ t('help.editCrochetBasics.pageAddToBundle.items.addSeveral') }}</li>
      <li>{{ t('help.editCrochetBasics.pageAddToBundle.items.countMultiplier') }}</li>
      <li>{{ t('help.editCrochetBasics.pageAddToBundle.items.useForShaping') }}</li>
    </ul>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
</script>
