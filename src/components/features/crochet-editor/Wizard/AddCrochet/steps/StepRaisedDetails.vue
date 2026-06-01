<template>
  <div class="step">
    <div class="field">
      <label>{{ t('toolbar.addCrochet.moreWizard.details.countLabel') }}</label>
      <InputNumber :model-value="count" :min="2" :max="7" size="sm" @update:modelValue="$emit('update:count', $event)" />
    </div>

    <div class="field">
      <label>{{ t('toolbar.addCrochet.moreWizard.details.baseStitchLabel') }}</label>
      <div class="base-grid">
        <div
          class="base"
          :class="{ active: baseStitch === 'X' }"
          role="button"
          tabindex="0"
          @click="$emit('update:baseStitch', 'X')"
          @keydown.enter.prevent="$emit('update:baseStitch', 'X')"
          @keydown.space.prevent="$emit('update:baseStitch', 'X')"
        >
          <div class="sym">X</div>
          <div class="txt">{{ t('crochet.stitches.singleCrochet') }}</div>
        </div>
        <div
          class="base"
          :class="{ active: baseStitch === 'T' }"
          role="button"
          tabindex="0"
          @click="$emit('update:baseStitch', 'T')"
          @keydown.enter.prevent="$emit('update:baseStitch', 'T')"
          @keydown.space.prevent="$emit('update:baseStitch', 'T')"
        >
          <div class="sym">T</div>
          <div class="txt">{{ t('crochet.stitches.halfDoubleCrochet') }}</div>
        </div>
        <div
          class="base"
          :class="{ active: baseStitch === 'F' }"
          role="button"
          tabindex="0"
          @click="$emit('update:baseStitch', 'F')"
          @keydown.enter.prevent="$emit('update:baseStitch', 'F')"
          @keydown.space.prevent="$emit('update:baseStitch', 'F')"
        >
          <div class="sym">F</div>
          <div class="txt">{{ t('crochet.stitches.doubleCrochet') }}</div>
        </div>
        <div
          class="base"
          :class="{ active: baseStitch === 'E' }"
          role="button"
          tabindex="0"
          @click="$emit('update:baseStitch', 'E')"
          @keydown.enter.prevent="$emit('update:baseStitch', 'E')"
          @keydown.space.prevent="$emit('update:baseStitch', 'E')"
        >
          <div class="sym">E</div>
          <div class="txt">{{ t('crochet.stitches.trebleCrochet') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import InputNumber from '@/components/shared/inputs/InputNumber.vue'

const { t } = useI18n({ useScope: 'global' })

defineProps({
  count: {
    type: Number,
    default: 2
  },
  baseStitch: {
    type: String,
    default: 'F'
  }
})

defineEmits(['update:count', 'update:baseStitch'])
</script>

<style scoped>
.step {
  display: grid;
  gap: 1rem;
}

.field label {
  display: block;
  font-weight: 800;
  margin-bottom: 0.5rem;
  color: #374151;
}

.base-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.base {
  border: 2px solid #e5e7eb;
  background: #fff;
  border-radius: 12px;
  padding: 0.6rem 0.7rem;
  cursor: pointer;
  text-align: left;
}

.base.active {
  border-color: #f59e0b;
  background: #fffbeb;
}

.sym {
  font-weight: 1000;
  color: #111827;
  line-height: 1;
}

.txt {
  margin-top: 0.15rem;
  font-size: 0.8rem;
  color: #6b7280;
}
</style>
