<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click="handleCancel">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <h2>{{ computedTitle }}</h2>
            <button class="close-button" type="button" @click="handleCancel">×</button>
          </div>

          <div class="modal-body">
            <div class="field">
              <label class="label">{{ t('recordResult.imagesLabel') }}</label>

              <div class="existing-images">
                <div v-if="keptImageUrls.length" class="existing-images__grid">
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
                </div>

                <div v-else class="existing-images__empty">
                  {{ t('recordResult.noImagesYet') }}
                </div>
              </div>

              <div class="new-images">
                <ImageUploader
                  v-model="newImageFiles"
                  :max="remainingSlots"
                  accept="image/*"
                  :multiple="true"
                  :disabled="saving || remainingSlots <= 0"
                  :remove-text="t('common.remove')"
                  :max-error-text="t('recordResult.maxImagesError', { max: MAX_IMAGES })"
                  :alt-text-for-index="(i) => t('recordResult.newImageAlt', { n: i + 1 })"
                />
                <div v-if="remainingSlots <= 0" class="new-images__hint">
                  {{ t('recordResult.imagesMaxReached', { max: MAX_IMAGES }) }}
                </div>
              </div>
            </div>

            <div class="field">
              <label class="label" for="record-thought">{{ t('recordResult.thoughtLabel') }}</label>
              <textarea
                id="record-thought"
                v-model="draftThought"
                class="textarea"
                :disabled="saving"
                :placeholder="t('recordResult.thoughtPlaceholder')"
                rows="4"
              />
            </div>

            <div class="actions">
              <button class="btn-secondary" type="button" :disabled="saving" @click="handleCancel">
                {{ t('common.cancel') }}
              </button>
              <button class="btn-primary" type="button" :disabled="saving" @click="handleSave">
                {{ saving ? t('common.saving') : t('common.save') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ImageUploader from '@/components/Input/ImageUploader.vue'
import ImageBox from '@/components/Image/ImageBox.vue'

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

const computedTitle = computed(() => props.title || t('recordResult.editResultTitle'))

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
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-container {
  background: white;
  border-radius: 12px;
  max-width: 520px;
  width: 92%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #111827;
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.close-button:hover {
  background-color: #f3f4f6;
}

.modal-body {
  padding: 1.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.9rem;
}

.label {
  font-size: 0.9rem;
  font-weight: 800;
  color: #111827;
}

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

.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 0.5rem;
}

.btn-secondary {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.18);
  color: #111827;
  border-radius: 10px;
  padding: 0.6rem 0.9rem;
  font-weight: 800;
}

.btn-primary {
  background: #111827;
  border: none;
  color: #fff;
  border-radius: 10px;
  padding: 0.6rem 0.9rem;
  font-weight: 900;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
