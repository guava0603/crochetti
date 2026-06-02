<template>
  <ModalShell
    :show="open"
    :title="t('toolbar.addCrochet.ropeBundle.title')"
    max-width="560px"
    z-level="top"
    show-save-footer
    @close="handleCancel"
    @save="handleSave"
  >
    <div class="add-rope-crochet-form">
      <div class="field">
        <label>{{ t('toolbar.addCrochet.ropeBundle.chainCountLabel') }}</label>
        <InputNumber v-model="chainCount" :min="1" :max="99" size="sm" />
        <div class="hint">{{ t('toolbar.addCrochet.ropeBundle.hint') }}</div>
      </div>
    </div>
  </ModalShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ModalShell from '@/components/modals/shell/ModalShell/ModalShell.vue'
import InputNumber from '@/components/shared/inputs/InputNumber.vue'

defineOptions({ name: 'AddRopeCrochetModal' })

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['update:show', 'close', 'submit'])

const { t } = useI18n({ useScope: 'global' })

const open = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const chainCount = ref(1)

watch(
  () => open.value,
  (next) => {
    if (!next) return
    chainCount.value = 1
  }
)

function handleCancel() {
  open.value = false
  emit('close')
}

function handleSave() {
  const safe = Math.max(1, Math.min(99, Number(chainCount.value) || 1))
  emit('submit', {
    kind: 'rope',
    chainCount: safe
  })
  open.value = false
  emit('close')
}
</script>

<style scoped>
.add-rope-crochet-form {
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
