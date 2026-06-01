<template>
  <div class="step-root">
    <div
      class="choice"
      :class="{ active: modelValue === 'rope' }"
      role="button"
      tabindex="0"
      @click="update('rope')"
      @keydown.enter.prevent="update('rope')"
      @keydown.space.prevent="update('rope')"
    >
      {{ t('toolbar.addCrochet.ropeBundle.title') }}
    </div>
    <div
      class="choice"
      :class="{ active: modelValue === 'raised' }"
      role="button"
      tabindex="0"
      @click="update('raised')"
      @keydown.enter.prevent="update('raised')"
      @keydown.space.prevent="update('raised')"
    >
      {{ t('toolbar.addCrochet.moreWizard.options.raised') }}
    </div>
    <div
      class="choice"
      :class="{ active: modelValue === 'custom' }"
      role="button"
      tabindex="0"
      @click="update('custom')"
      @keydown.enter.prevent="update('custom')"
      @keydown.space.prevent="update('custom')"
    >
      {{ t('toolbar.addCrochet.moreWizard.options.custom') }}
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })

defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const update = (v) => {
  emit('update:modelValue', v)
}
</script>

<style scoped>
.step-root {
  display: grid;
  gap: 0.75rem;
}

.choice {
  width: 100%;
  border: 2px solid #e5e7eb;
  background: #fff;
  border-radius: 12px;
  padding: 0.9rem 1rem;
  font-size: 1rem;
  font-weight: 900;
  color: #111827;
  text-align: left;
  cursor: pointer;
}

.choice:hover {
  background: #f9fafb;
}

.choice.active {
  border-color: rgb(var(--color-icon-add-rgb) / 0.55);
  background: rgb(var(--color-icon-add-rgb) / 0.12);
}
</style>
