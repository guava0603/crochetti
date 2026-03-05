<template>
  <div class="help-page">
    <h3 class="help-page__title">{{ t('help.addProjectTableHeader.pageTotalStitches.title') }}</h3>

    <p class="help-page__text">{{ t('help.addProjectTableHeader.pageTotalStitches.statusIntro') }}</p>

    <div class="status-page">
      <div class="status-page__label">{{ t('help.addProjectTableHeader.pageTotalStitches.status.red') }}</div>
      <img class="status-page__img" :src="imgRed" alt="" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })

const imgRed = computed(() => {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}assets/image/helper/pageTotalStitches/red.png`
})
</script>

<style scoped>
.status-page {
  margin-top: 0.75rem;
  padding: 0.7rem 0.75rem;
  border-radius: 14px;
  border: 1px solid rgb(0 0 0 / 0.08);
  background: rgb(255 255 255 / 0.75);
}

.status-page__label {
  font-weight: 900;
  color: #111827;
  line-height: 1.35;
  margin-bottom: 0.4rem;
}

.status-page__img {
  width: min(92%, 460px);
  height: auto;
  display: block;
  margin: 0 auto;
  object-fit: contain;
  border-radius: 10px;
}
</style>
