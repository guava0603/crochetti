<template>
  <div class="step">
    <div class="field">
      <label>{{ t('toolbar.addCrochet.bundleWizard.nameLabel') }}</label>
      <input
        :value="name"
        type="text"
        class="input"
        :placeholder="t('toolbar.addCrochet.bundleWizard.namePlaceholder')"
        @input="$emit('update:name', $event.target.value)"
      />
    </div>

    <div class="field">
      <label>{{ t('toolbar.addCrochet.bundleWizard.descriptionLabel') }}</label>
      <LimitedTextArea
        :model-value="description"
        class="textarea-soft"
        :rows="3"
        :placeholder="t('toolbar.addCrochet.bundleWizard.descriptionPlaceholder')"
        @update:modelValue="$emit('update:description', $event)"
      />
    </div>

    <div class="stats">
      <div class="stat">
        <span>{{ t('toolbar.addCrochet.bundleWizard.consumeLabel') }}</span>
        <InputNumber :model-value="consume" :min="1" :max="99" size="sm" @update:modelValue="$emit('update:consume', $event)" />
      </div>
      <div class="stat">
        <span>{{ t('toolbar.addCrochet.bundleWizard.generateLabel') }}</span>
        <InputNumber :model-value="generate" :min="0" :max="999" size="sm" @update:modelValue="$emit('update:generate', $event)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import InputNumber from '@/components/Input/InputNumber.vue'
import LimitedTextArea from '@/components/Input/LimitedTextArea.vue'

const { t } = useI18n({ useScope: 'global' })

defineProps({
  name: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  consume: {
    type: Number,
    default: 1
  },
  generate: {
    type: Number,
    default: 0
  }
})

defineEmits(['update:name', 'update:description', 'update:consume', 'update:generate'])
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

.input {
  width: 100%;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.75rem;
  font-size: 0.95rem;
  font-weight: 650;
  color: #111827;
  background: #fff;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat span {
  font-weight: 800;
  color: #374151;
}
</style>
