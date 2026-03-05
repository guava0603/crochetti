<template>
  <div class="help-page">
    <h3 class="help-page__title">{{ t('help.editCrochetBasics.pageCustom.title') }}</h3>
    <p class="help-page__text">{{ t('help.editCrochetBasics.pageCustom.body') }}</p>

    <ul class="help-page__list">
      <li>{{ t('help.editCrochetBasics.pageCustom.items.when') }}</li>
      <li>{{ t('help.editCrochetBasics.pageCustom.items.consumeGenerate') }}</li>
      <li>{{ t('help.editCrochetBasics.pageCustom.items.name') }}</li>
    </ul>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
</script>
