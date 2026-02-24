<template>
  <div class="add-crochet">
    <div>
      <CrochetList
        :disabled="disabled"
        :stitches="stitchesForList"
        :enabled-stitch-ids="null"
        :show-custom-button="showCustomButton"
        @stitch-click="handleCrochetClick"
        @custom-click="openBundleWizard"
      />
    </div>

    <!-- Bundle Wizard Modal -->
    <div v-if="showBundleWizard" class="bundle-wizard-overlay" @click="closeBundleWizard">
      <div class="bundle-wizard" @click.stop>
        <h3>{{ t('toolbar.addCrochet.bundleWizard.title') }}</h3>

        <div class="wizard-section">
          <label>{{ t('toolbar.addCrochet.bundleWizard.chooseStitch') }}</label>
          <div class="wizard-stitches">
            <button
              v-for="crochet in BasicStitch"
              :key="crochet.index"
              type="button"
              class="wizard-stitch-button"
              @click="addStitchToBundle(crochet.index)"
            >
              {{ crochet.symbol_jp }}
            </button>
          </div>
        </div>

        <div class="wizard-section">
          <label>{{ t('toolbar.addCrochet.bundleWizard.selectedStitches') }}</label>
          <div class="bundle-preview">
            <span v-if="bundleStitches.length === 0" class="empty-hint">
              {{ t('toolbar.addCrochet.bundleWizard.emptyHint') }}
            </span>
            <CrochetDisplay
              v-else
              table-type="row"
              :stitch-node-list="bundleStitches"
            />
          </div>
        </div>

        <div class="wizard-section">
          <div class="wizard-stats">
            <div class="stat-item">
              <span>{{ t('toolbar.addCrochet.bundleWizard.consumeLabel') }}</span>
              <InputNumber v-model="bundleConsume" :min="1" :max="99" size="sm" />
            </div>
            <div class="stat-item">
              <span>{{ t('toolbar.addCrochet.bundleWizard.generateLabel') }}</span>
              <div class="stat-value">{{ bundleGenerate }}</div>
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
            :disabled="bundleStitches.length === 0"
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
import { BasicStitch, BasicStitchGeneral } from '@/constants/crochetData'
import { calculateConsumeGenerate } from '@/utils/calculateConsumeGenerate.js'
import InputNumber from '@/components/Input/InputNumber.vue'
import CrochetDisplay from '@/components/CrochetTable/Crochet/CrochetDisplay.vue'
import CrochetList from './CrochetList.vue'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['add-crochet', 'add-bundle'])

// mode: 'normal' => append stitches as usual
// mode: 'same-stitch' => append into a top-level bundle (consume must be 1)
const mode = ref('normal')

const stitchesForList = computed(() => {
  return BasicStitchGeneral
})
const showCustomButton = computed(() => true)


const handleCrochetClick = (crochetIndex) => {
  if (mode.value === 'same-stitch') {
    emit('add-crochet', { stitchId: crochetIndex, mode: 'same-stitch' })
    return
  }
  emit('add-crochet', { stitchId: crochetIndex, mode: 'normal' })
}

const showBundleWizard = ref(false)
const bundleStitches = ref([])
const bundleConsume = ref(1)

const bundleGenerate = computed(() => {
  return calculateConsumeGenerate(bundleStitches.value).generate
})

const openBundleWizard = () => {
  if (props.disabled) return
  showBundleWizard.value = true
  bundleStitches.value = []
  bundleConsume.value = 1
}

const closeBundleWizard = () => {
  showBundleWizard.value = false
}

const addStitchToBundle = (stitchId) => {
  bundleStitches.value.push({
    type: 'stitch',
    stitch_id: stitchId
  })
}

const confirmBundle = () => {
  if (bundleStitches.value.length === 0) return

  const bundle = {
    type: 'bundle',
    bundle: bundleStitches.value,
    consume: bundleConsume.value,
    generate: bundleGenerate.value,
    count: 1
  }

  emit('add-bundle', bundle)
  closeBundleWizard()
}
</script>

<style scoped>
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
  border-color: rgba(66, 185, 131, 0.55);
  background: rgba(66, 185, 131, 0.12);
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
  z-index: 200;
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
  background: #42b983;
  border-color: #42b983;
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
  background: #42b983;
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
