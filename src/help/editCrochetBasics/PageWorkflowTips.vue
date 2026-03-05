<template>
  <div class="help-page">
    <h3 class="help-page__title">{{ t('help.editCrochetBasics.pageWorkflowTips.title') }}</h3>

    <p class="help-page__text">{{ t('help.editCrochetBasics.pageWorkflowTips.body') }}</p>

    <ul class="help-page__list">
      <li>{{ t('help.editCrochetBasics.pageWorkflowTips.items.oneRowAtATime') }}</li>
      <li>{{ t('help.editCrochetBasics.pageWorkflowTips.items.checkTotal') }}</li>
      <li>{{ t('help.editCrochetBasics.pageWorkflowTips.items.adjustEarlier') }}</li>
      <li>{{ t('help.editCrochetBasics.pageWorkflowTips.items.okToSubmit') }}</li>
    </ul>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
</script>
