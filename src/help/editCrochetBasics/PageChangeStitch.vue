<template>
  <div class="help-page">
    <h3 class="help-page__title">{{ t('help.editCrochetBasics.pageChangeStitch.title') }}</h3>

    <p class="help-page__text">{{ t('help.editCrochetBasics.pageChangeStitch.body') }}</p>

    <ul class="help-page__list">
      <li>{{ t('help.editCrochetBasics.pageChangeStitch.items.pickStitch') }}</li>
      <li>{{ t('help.editCrochetBasics.pageChangeStitch.items.positionOptional') }}</li>
      <li>{{ t('help.editCrochetBasics.pageChangeStitch.items.bundlePattern') }}</li>
      <li>{{ t('help.editCrochetBasics.pageChangeStitch.items.goParent') }}</li>
    </ul>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
</script>
