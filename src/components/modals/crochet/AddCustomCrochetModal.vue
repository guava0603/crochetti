<template>
  <ModalShell
    :show="open"
    :title="t('toolbar.addCrochet.moreWizard.options.custom')"
    max-width="560px"
    z-level="top"
    show-save-footer
    :save-disabled="!canSave"
    @close="handleCancel"
    @save="handleSave"
  >
    <div class="add-custom-crochet-form">
      <div class="field">
        <label>{{ t('toolbar.addCrochet.bundleWizard.nameLabel') }}</label>
        <input
          v-model="name"
          type="text"
          class="input"
          :placeholder="t('toolbar.addCrochet.bundleWizard.namePlaceholder')"
        />
      </div>

      <div class="field">
        <label>{{ t('toolbar.addCrochet.bundleWizard.descriptionLabel') }}</label>
        <LimitedTextArea
          v-model="description"
          class="textarea-soft"
          :rows="3"
          :placeholder="t('toolbar.addCrochet.bundleWizard.descriptionPlaceholder')"
        />
      </div>

      <div class="stats">
        <div class="stat">
          <span>{{ t('toolbar.addCrochet.bundleWizard.consumeLabel') }}</span>
          <InputNumber v-model="consume" :min="1" :max="99" size="sm" />
        </div>
        <div class="stat">
          <span>{{ t('toolbar.addCrochet.bundleWizard.generateLabel') }}</span>
          <InputNumber v-model="generate" :min="0" :max="999" size="sm" />
        </div>
      </div>
    </div>
  </ModalShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ModalShell from '@/components/modals/shell/ModalShell/ModalShell.vue'
import InputNumber from '@/components/shared/inputs/InputNumber.vue'
import LimitedTextArea from '@/components/shared/inputs/LimitedTextArea.vue'

defineOptions({ name: 'AddCustomCrochetModal' })

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['update:show', 'close', 'submit'])

const { t } = useI18n({ useScope: 'global' })

const open = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const name = ref('')
const description = ref('')
const consume = ref(1)
const generate = ref(0)

function resetForm() {
  name.value = ''
  description.value = ''
  consume.value = 1
  generate.value = 0
}

watch(
  () => open.value,
  (next) => {
    if (!next) return
    resetForm()
  }
)

const canSave = computed(() => Boolean(String(name.value || '').trim()))

function handleCancel() {
  open.value = false
  emit('close')
}

function handleSave() {
  if (!canSave.value) return
  emit('submit', {
    kind: 'custom',
    name: String(name.value || '').trim(),
    description: String(description.value || ''),
    consume: Number(consume.value) || 1,
    generate: Number(generate.value) || 0
  })
  open.value = false
  emit('close')
}
</script>

<style scoped>
.add-custom-crochet-form {
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
