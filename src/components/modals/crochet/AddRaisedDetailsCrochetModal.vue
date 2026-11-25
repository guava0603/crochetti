<template>
  <ModalShell
    :show="open"
    :title="modalTitle"
    max-width="560px"
    z-level="top"
    show-save-footer
    @close="handleCancel"
    @save="handleSave"
  >
    <div class="add-raised-details-form">
      <div class="field">
        <label>{{ t('toolbar.addCrochet.moreWizard.details.countLabel') }}</label>
        <InputNumber v-model="count" :min="2" :max="7" size="sm" />
      </div>

      <div class="field">
        <label>{{ t('toolbar.addCrochet.moreWizard.details.baseStitchLabel') }}</label>
        <div class="base-grid">
          <div
            v-for="base in baseOptions"
            :key="base.value"
            class="base"
            :class="{ active: baseStitch === base.value }"
            role="button"
            tabindex="0"
            @click="baseStitch = base.value"
            @keydown.enter.prevent="baseStitch = base.value"
            @keydown.space.prevent="baseStitch = base.value"
          >
            <div class="sym">{{ base.value }}</div>
            <div class="txt">{{ base.label }}</div>
          </div>
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
import { buildRaisedDetailsSubmit, raisedTypeTitle } from '@/utils/addCrochetRaised'

defineOptions({ name: 'AddRaisedDetailsCrochetModal' })

const props = defineProps({
  show: { type: Boolean, default: false },
  raisedType: { type: String, default: '' }
})

const emit = defineEmits(['update:show', 'close', 'submit'])

const { t } = useI18n({ useScope: 'global' })

const open = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const count = ref(2)
const baseStitch = ref('F')

const baseOptions = computed(() => [
  { value: 'X', label: t('crochet.stitches.singleCrochet') },
  { value: 'T', label: t('crochet.stitches.halfDoubleCrochet') },
  { value: 'F', label: t('crochet.stitches.doubleCrochet') },
  { value: 'E', label: t('crochet.stitches.trebleCrochet') }
])

const modalTitle = computed(() => {
  return raisedTypeTitle(props.raisedType, t) || t('toolbar.addCrochet.moreWizard.options.raised')
})

watch(
  () => open.value,
  (next) => {
    if (!next) return
    count.value = 2
    baseStitch.value = 'F'
  }
)

function handleCancel() {
  open.value = false
  emit('close')
}

function handleSave() {
  if (!props.raisedType) return
  emit('submit', buildRaisedDetailsSubmit({
    raisedType: props.raisedType,
    count: count.value,
    baseStitch: baseStitch.value
  }, t))
  open.value = false
  emit('close')
}
</script>

<style scoped>
.add-raised-details-form {
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
