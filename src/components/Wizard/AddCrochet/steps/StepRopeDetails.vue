<template>
  <div class="step">
    <div class="field">
      <label>{{ t('toolbar.addCrochet.ropeBundle.chainCountLabel') }}</label>
      <InputNumber
        :model-value="chainCount"
        :min="1"
        :max="99"
        size="sm"
        @update:modelValue="$emit('update:chainCount', $event)"
      />
      <div class="hint">{{ t('toolbar.addCrochet.ropeBundle.hint') }}</div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import InputNumber from '@/components/Input/InputNumber.vue'

const { t } = useI18n({ useScope: 'global' })

defineProps({
  chainCount: {
    type: Number,
    default: 1
  }
})

defineEmits(['update:chainCount'])
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

.hint {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #6b7280;
}
</style>
