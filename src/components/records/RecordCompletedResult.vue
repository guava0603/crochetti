<template>
  <div class="record-completed-result">
    <div v-if="images.length" class="extra-images">
      <ImageBox
        v-for="(url, idx) in images"
        :key="url"
        class="extra-image"
        :image-url="url"
        :alt="t('recordResult.imageAlt', { n: idx + 1 })"
        :aria-label="t('recordResult.imageAlt', { n: idx + 1 })"
        :openable="true"
        :stop-propagation="true"
      />
      <div v-if="thought" class="extra-thought__text">{{ thought }}</div>
    </div>

    <RecordResult />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRecordContext } from '@/composables/recordContext'
import RecordResult from '@/components/records/RecordResult.vue'
import ImageBox from '@/components/Image/ImageBox.vue'

const { t } = useI18n({ useScope: 'global' })

const recordCtx = useRecordContext()
const currentRecord = recordCtx?.recordData || ref(null)

const images = computed(() => {
  const list = currentRecord.value?.result?.images
  const arr = Array.isArray(list) ? list : []
  return arr.map((u) => String(u || '').trim()).filter(Boolean).slice(0, 3)
})

const thought = computed(() => String(currentRecord.value?.result?.thought || '').trim())
</script>

<style scoped>
.result-extra {
  padding: 0 2rem 2rem;
}

.extra-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.25rem;
}

.extra-title {
  font-size: 1.1rem;
  font-weight: 900;
  color: #111827;
  margin-bottom: 0.8rem;
}

.extra-images {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 1rem;
}

.extra-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}

.extra-thought__label {
  font-weight: 800;
  color: #111827;
  margin-bottom: 0.35rem;
}

.extra-thought__text {
  white-space: pre-line;
  color: #111827;
  font-weight: 600;
  line-height: 1.4;
  padding-left: 0.6rem;
}

.extra-empty {
  color: #6b7280;
  font-weight: 600;
}
</style>
