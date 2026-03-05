<template>
  <div class="help-page">
    <h3 class="help-page__title">{{ t('help.addProjectTableHeader.pageTotalStitches.title') }}</h3>

    <p class="help-page__text">{{ t('help.addProjectTableHeader.pageTotalStitches.bullet1') }}</p>

    <div class="status-gallery" role="list">
      <div class="status-gallery__item" role="listitem">
        <div class="status-gallery__label">{{ t('help.addProjectTableHeader.pageTotalStitches.status.green') }}</div>
        <img class="status-gallery__img" :src="imgGreen" alt="" />
      </div>
      <div class="status-gallery__item" role="listitem">
        <div class="status-gallery__label">{{ t('help.addProjectTableHeader.pageTotalStitches.status.red') }}</div>
        <img class="status-gallery__img" :src="imgRed" alt="" />
      </div>
      <div class="status-gallery__item" role="listitem">
        <div class="status-gallery__label">{{ t('help.addProjectTableHeader.pageTotalStitches.status.yellow') }}</div>
        <img class="status-gallery__img" :src="imgYellow" alt="" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })

const imgGreen = computed(() => {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}assets/image/helper/pageTotalStitches/green.png`
})

const imgRed = computed(() => {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}assets/image/helper/pageTotalStitches/red.png`
})

const imgYellow = computed(() => {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}assets/image/helper/pageTotalStitches/yellow.png`
})
</script>

<style scoped>
.status-gallery {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
}

.status-gallery__item {
  padding: 0.7rem 0.75rem;
  border-radius: 14px;
  border: 1px solid rgb(0 0 0 / 0.08);
  background: rgb(255 255 255 / 0.75);
}

.status-gallery__label {
  font-weight: 900;
  color: #111827;
  line-height: 1.35;
  margin-bottom: 0.4rem;
}

.status-gallery__img {
  width: min(92%, 460px);
  height: auto;
  display: block;
  margin: 0 auto;
  object-fit: contain;
  border-radius: 10px;
}
</style>
