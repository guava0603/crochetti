<template>
  <div class="help-page">
    <div class="help-page__header">
      <h3 class="help-page__title">{{ t('help.editRowHowTo.pageAddFromOldRow.title') }}</h3>
      <button type="button" class="help-page__back" @click.stop="goHelpPage(0)">
        {{ t('help.editRowHowTo.back') }}
      </button>
    </div>
    <p class="help-page__text">{{ t('help.editRowHowTo.pageAddFromOldRow.body') }}</p>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { goHelpPage } from '@/services/ui/help'

const { t } = useI18n({ useScope: 'global' })
</script>

<style scoped>
.help-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.help-page__title {
  margin: 0;
}

.help-page__back {
  appearance: none;
  background: transparent;
  border: 1px solid rgb(0 0 0 / 0.12);
  border-radius: 999px;
  padding: 0.35rem 0.6rem;
  font-weight: 800;
  cursor: pointer;
  color: #374151;
  flex: none;
}

.help-page__back:hover {
  background: rgb(0 0 0 / 0.04);
}
</style>
