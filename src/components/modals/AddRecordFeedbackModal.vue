<template>
  <ModalShell
    :show="show"
    :title="computedTitle"
    max-width="520px"
    z-level="high"
    show-save-footer
    :saving="saving"
    @close="handleCancel"
    @save="handleSave"
  >
    <div class="modal-field">
      <label class="modal-label">{{ t('recordResult.imagesLabel') }}</label>

              <div class="existing-images">
                <div class="existing-images__grid">
                  <ImageBox
                    v-for="(url, idx) in keptImageUrls"
                    :key="url"
                    class="existing-images__item"
                    :image-url="url"
                    :alt="t('recordResult.imageAlt', { n: idx + 1 })"
                    :aria-label="t('recordResult.imageAlt', { n: idx + 1 })"
                    :disabled="saving"
                    :openable="true"
                    :stop-propagation="true"
                    :show-delete="true"
                    :delete-aria-label="t('common.remove')"
                    @delete="removeKeptUrl(url)"
                  />

                  <ImageUploader
                    v-model="newImageFiles"
                    :max="remainingSlots"
                    accept="image/*"
                    :multiple="true"
                    :disabled="saving || remainingSlots <= 0"
                    :remove-text="t('common.remove')"
                    :max-error-text="t('recordResult.maxImagesError', { max: MAX_IMAGES })"
                    :alt-text-for-index="(i) => t('recordResult.newImageAlt', { n: i + 1 })"
                    use-parent-grid
                  />
                </div>

                <div v-if="keptImageUrls.length === 0 && newImageFiles.length === 0" class="existing-images__empty">
                  {{ t('recordResult.noImagesYet') }}
                </div>
              </div>

              <div v-if="remainingSlots <= 0" class="new-images__hint">
                {{ t('recordResult.imagesMaxReached', { max: MAX_IMAGES }) }}
              </div>
            </div>

    <div class="modal-field">
      <label class="modal-label" for="record-thought">{{ t('recordResult.thoughtLabel') }}</label>
              <LimitedTextArea
                id="record-thought"
                v-model="draftThought"
                class="textarea"
                :disabled="saving"
                :placeholder="t('recordResult.thoughtPlaceholder')"
                :rows="4"
              />
    </div>
  </ModalShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ImageUploader from '@/components/Input/ImageUploader.vue'
import ImageBox from '@/components/Image/ImageBox.vue'
import LimitedTextArea from '@/components/Input/LimitedTextArea.vue'
import ModalShell from '@/components/modals/ModalShell/ModalShell.vue'

defineOptions({ name: 'AddRecordFeedbackModal' })

const { t } = useI18n({ useScope: 'global' })

const MAX_IMAGES = 3

const props = defineProps({
  show: { type: Boolean, required: true },
  saving: { type: Boolean, default: false },
  title: { type: String, default: '' },
  initialImages: { type: Array, default: () => [] },
  initialThought: { type: String, default: '' }
})

const emit = defineEmits(['close', 'save'])

const keptImageUrls = ref([])
const newImageFiles = ref([])
const draftThought = ref('')

const computedTitle = computed(() => props.title || t('recordResult.addRecordFeedbackTitle'))

const remainingSlots = computed(() => {
  const kept = Array.isArray(keptImageUrls.value) ? keptImageUrls.value.length : 0
  return Math.max(0, MAX_IMAGES - kept)
})

watch(
  () => [props.show, props.initialImages, props.initialThought],
  () => {
    if (!props.show) return
    const urls = Array.isArray(props.initialImages) ? props.initialImages : []
    keptImageUrls.value = urls.map((u) => String(u || '').trim()).filter(Boolean).slice(0, MAX_IMAGES)
    newImageFiles.value = []
    draftThought.value = String(props.initialThought || '')
  },
  { immediate: true }
)

function removeKeptUrl(url) {
  const u = String(url || '').trim()
  keptImageUrls.value = keptImageUrls.value.filter((x) => x !== u)
}

function handleCancel() {
  emit('close')
}

function handleSave() {
  emit('save', {
    kept_urls: Array.isArray(keptImageUrls.value) ? keptImageUrls.value : [],
    new_files: Array.isArray(newImageFiles.value) ? newImageFiles.value : [],
    thought: String(draftThought.value || '').trim()
  })
}
</script>

<style scoped>
.textarea {
  border: 1px solid rgba(0, 0, 0, 0.14);
  background: #fff;
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  font-weight: 600;
  color: #111827;
  resize: vertical;
}

.existing-images__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 0.75rem;
}

.existing-images__item {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}

.existing-images__empty {
  color: #6b7280;
  font-weight: 600;
  padding: 0.5rem 0;
}

.new-images__hint {
  margin-top: 0.5rem;
  color: #6b7280;
  font-size: 0.9rem;
  font-weight: 600;
}
</style>
