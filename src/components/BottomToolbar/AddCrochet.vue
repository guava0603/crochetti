<template>
  <div class="add-crochet">
    <div class="add-crochet__body">
      <CrochetList
        :disabled="disabled"
        :preset-stitch-id="presetStitchId"
        :preset-position="presetPosition"
        :default-position="defaultPosition"
        :stitches="stitchesForList"
        :self-defined-stitches="selfDefinedStitches"
        :enabled-stitch-ids="null"
        :show-custom-button="showCustomButton"
        :emit-on-decrease-toggle="emitOnDecreaseToggle"
        @stitch-click="handleCrochetClick"
        @position-change="handlePositionChange"
        @custom-click="openBundleWizard"
      />
    </div>

    <!-- Bundle Wizard Modal -->
    <div v-if="showBundleWizard" class="bundle-wizard-overlay" @click="closeBundleWizard">
      <div class="bundle-wizard" @click.stop>
        <h3>{{ t('toolbar.addCrochet.bundleWizard.title') }}</h3>

        <div class="wizard-section">
          <label>{{ t('toolbar.addCrochet.bundleWizard.nameLabel') }}</label>
          <input
            v-model="bundleName"
            type="text"
            class="wizard-input"
            :placeholder="t('toolbar.addCrochet.bundleWizard.namePlaceholder')"
          />
        </div>

        <div class="wizard-section">
          <label>{{ t('toolbar.addCrochet.bundleWizard.descriptionLabel') }}</label>
          <textarea
            v-model="bundleDescription"
            class="wizard-textarea"
            rows="3"
            :placeholder="t('toolbar.addCrochet.bundleWizard.descriptionPlaceholder')"
          />
        </div>

        <div class="wizard-section">
          <div class="wizard-stats">
            <div class="stat-item">
              <span>{{ t('toolbar.addCrochet.bundleWizard.consumeLabel') }}</span>
              <InputNumber v-model="bundleConsume" :min="1" :max="99" size="sm" />
            </div>
            <div class="stat-item">
              <span>{{ t('toolbar.addCrochet.bundleWizard.generateLabel') }}</span>
              <InputNumber v-model="bundleGenerate" :min="0" :max="999" size="sm" />
            </div>
          </div>
        </div>

        <div class="wizard-actions">
          <button type="button" class="btn-cancel" @click="closeBundleWizard">
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            class="btn-confirm"
            :disabled="!bundleName.trim()"
            @click="confirmBundle"
          >
            {{ t('common.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BasicStitchGeneral } from '@/constants/crochetData'
import InputNumber from '@/components/Input/InputNumber.vue'
import CrochetList from './CrochetList.vue'
import { useSelfDefinedStitchesContext } from '@/composables/selfDefinedStitchesContext'
import { openError } from '@/services/ui/notice'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  },
  emitOnDecreaseToggle: {
    type: Boolean,
    default: false
  },
  presetStitchId: {
    type: Number,
    default: null
  },
  presetPosition: {
    type: String,
    default: ''
  },
  defaultPosition: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['add-crochet', 'add-bundle', 'position-change'])

// mode: 'normal' => append stitches as usual
// mode: 'same-stitch' => append into a top-level bundle (consume must be 1)
const mode = ref('normal')

const { list: selfDefinedStitches, addStitch: addSelfDefinedStitch } = useSelfDefinedStitchesContext()

const stitchesForList = computed(() => {
  return BasicStitchGeneral
})
const showCustomButton = computed(() => true)


const handleCrochetClick = (payload) => {
  const stitchId = typeof payload === 'number'
    ? payload
    : (payload?.stitchId ?? payload?.stitch_id)
  if (stitchId === null || stitchId === undefined) return

  const position = typeof payload === 'object' ? String(payload?.position ?? '') : ''

  if (mode.value === 'same-stitch') {
    emit('add-crochet', { stitchId, position, mode: 'same-stitch' })
    return
  }

  emit('add-crochet', { stitchId, position, mode: 'normal' })
}

const handlePositionChange = (pos) => {
  emit('position-change', pos)
}

const showBundleWizard = ref(false)
const bundleConsume = ref(1)
const bundleGenerate = ref(0)
const bundleName = ref('')
const bundleDescription = ref('')

const openBundleWizard = () => {
  if (props.disabled) return
  showBundleWizard.value = true
  bundleConsume.value = 1
  bundleGenerate.value = 0
  bundleName.value = ''
  bundleDescription.value = ''
}

const closeBundleWizard = () => {
  showBundleWizard.value = false
}

const confirmBundle = () => {
  if (!String(bundleName.value || '').trim()) return

  // Prefer storing as a project-level self-defined stitch.
  if (!addSelfDefinedStitch) {
    openError({
      title: t('common.error'),
      message: t('common.saveFailed'),
      confirmText: t('common.ok')
    })
    return
  }

  const list = Array.isArray(selfDefinedStitches.value) ? selfDefinedStitches.value : []
  const ids = list
    .map((s) => Number(s?.stitch_id))
    .filter((n) => Number.isFinite(n))

  const minId = ids.length ? Math.min(...ids) : 0
  // Use negative ids to avoid colliding with built-in stitches (0..).
  const nextId = minId < 0 ? minId - 1 : -1

  addSelfDefinedStitch({
    stitch_id: nextId,
    name: String(bundleName.value || '').trim(),
    description: String(bundleDescription.value || ''),
    consume: bundleConsume.value,
    generate: bundleGenerate.value
  })

  closeBundleWizard()
}
</script>

<style scoped>
.add-crochet {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.add-crochet__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
}

.add-tabs {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 0.75rem;
}

.add-tab {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #374151;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.05s;
}

.add-tab:hover {
  background: #f3f4f6;
}

.add-tab:active {
  transform: translateY(1px);
}

.add-tab.active {
  border-color: rgb(var(--color-icon-add-rgb) / 0.55);
  background: rgb(var(--color-icon-add-rgb) / 0.12);
  color: #0f5132;
}

.bundle-wizard-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
}

.bundle-wizard {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.bundle-wizard h3 {
  margin: 0 0 1.5rem 0;
  color: #111827;
}

.wizard-section {
  margin-bottom: 1.5rem;
}

.wizard-section label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #374151;
}

.wizard-input,
.wizard-textarea {
  width: 100%;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 0.95rem;
  font-weight: 650;
  color: #111827;
  background: #fff;
}

.wizard-textarea {
  resize: vertical;
}

.wizard-stitches {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 0.5rem;
}

.wizard-stitch-button {
  padding: 0.75rem;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.wizard-stitch-button:hover {
  background: var(--color-icon-add);
  border-color: var(--color-icon-add);
  color: white;
}

.bundle-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 40px;
  padding: 0.75rem;
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 6px;
}

.empty-hint {
  color: #9ca3af;
  font-size: 0.875rem;
}

.wizard-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-value {
  padding: 0.5rem;
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 4px;
  color: #166534;
  font-weight: 600;
  text-align: center;
}

.wizard-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-confirm {
  background: var(--color-icon-add);
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: #359268;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
