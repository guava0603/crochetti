<template>
  <div class="add-crochet">
    <div>
      <h4>針法選擇</h4>
      <CrochetList
        :disabled="disabled"
        @stitch-click="handleCrochetClick"
        @custom-click="openBundleWizard"
      />
    </div>

    <!-- Bundle Wizard Modal -->
    <div v-if="showBundleWizard" class="bundle-wizard-overlay" @click="closeBundleWizard">
      <div class="bundle-wizard" @click.stop>
        <h3>建立自定義束</h3>

        <div class="wizard-section">
          <label>選擇針法:</label>
          <div class="wizard-stitches">
            <button
              v-for="crochet in BasicStitch"
              :key="crochet.index"
              type="button"
              @click="addStitchToBundle(crochet.index)"
              class="wizard-stitch-button"
            >
              {{ crochet.symbol_jp }}
            </button>
          </div>
        </div>

        <div class="wizard-section">
          <label>已選擇的針法:</label>
          <div class="bundle-preview">
            <CrochetDisplay
              v-if="bundleStitches.length > 0"
              :type="'view'"
              :stitch-node-list="bundleStitches"
            />
            <span v-else class="empty-hint">點擊上方針法添加</span>
          </div>
        </div>

        <div class="wizard-section">
          <div class="wizard-stats">
            <div class="stat-item">
              <label>消耗針數 (consume):</label>
              <InputNumber v-model="bundleConsume" :min="1" :max="999" />
            </div>
            <div class="stat-item">
              <label>產生針數 (generate):</label>
              <span class="stat-value">{{ bundleGenerate }}</span>
            </div>
          </div>
        </div>

        <div class="wizard-actions">
          <button @click="closeBundleWizard" class="btn-cancel">取消</button>
          <button @click="confirmBundle" class="btn-confirm" :disabled="bundleStitches.length === 0">確認</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { BasicStitch } from '@/constants/crochetData'
import InputNumber from '@/components/Input/InputNumber.vue'
import CrochetDisplay from '@/components/Crochet/CrochetDisplay.vue'
import CrochetList from './CrochetList.vue'

defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['add-crochet', 'add-bundle'])

const showBundleWizard = ref(false)
const bundleStitches = ref([])
const bundleConsume = ref(1)

const bundleGenerate = computed(() => {
  return bundleStitches.value.reduce((total, item) => {
    const stitch = BasicStitch[item.stitch_id]
    return total + (stitch?.generate || 0) * (item.count || 1)
  }, 0)
})

const handleCrochetClick = (crochetIndex) => {
  emit('add-crochet', crochetIndex)
}

const openBundleWizard = () => {
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
