<template>
  <ModalShell
    :show="open"
    :title="t('user.systemSettings.customDisplayModal.title')"
    max-width="560px"
    z-level="top"
    show-save-footer
    :saving="saving"
    :save-disabled="!isDirty"
    @close="handleCancel"
    @save="handleSave"
  >
    <p class="custom-display-modal__hint">
      {{ t('user.systemSettings.customDisplayModal.hint') }}
    </p>

    <div class="custom-display-modal__list">
      <div
        v-for="row in builtinRows"
        :key="row.stitchId"
        class="custom-display-modal__row"
      >
        <span class="custom-display-modal__label">{{ row.textLabel }}</span>
        <input
          v-model="draftAliases[row.stitchId]"
          type="text"
          class="custom-display-modal__input"
          :placeholder="row.textLabel"
          :disabled="saving"
        />
      </div>

      <div
        v-for="(stitch, idx) in draftUserStitches"
        :key="stitch.stitch_id"
        class="custom-display-modal__row custom-display-modal__row--user"
      >
        <span class="custom-display-modal__label">{{ stitch.name }}</span>
        <input
          v-model="stitch.display_label"
          type="text"
          class="custom-display-modal__input"
          :placeholder="stitch.name"
          :disabled="saving"
        />
        <button
          type="button"
          class="custom-display-modal__delete"
          :aria-label="t('common.delete')"
          :disabled="saving"
          @click="removeUserStitchAt(idx)"
        >
          ×
        </button>
      </div>
    </div>

    <button
      type="button"
      class="custom-display-modal__add"
      :disabled="saving"
      @click="openAddWizard"
    >
      {{ t('common.add') }}
    </button>

    <AddCustomCrochetModal
      v-model:show="showAddWizard"
      @submit="handleWizardSubmit"
    />
  </ModalShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ModalShell from '@/components/modals/shell/ModalShell/ModalShell.vue'
import AddCustomCrochetModal from '@/components/modals/crochet/AddCustomCrochetModal.vue'
import { BasicStitchGeneral, getCrochetZhText } from '@/constants/crochetData'
import { useUserCrochetDisplay } from '@/composables/useUserCrochetDisplay'
import { openConfirmation } from '@/services/ui/confirmation'
import { openError } from '@/services/ui/notice'
import {
  buildBuiltinAliasDraft,
  buildBuiltinAliasesToSave,
  getNextUserSelfDefinedStitchId,
  normalizeUserSelfDefinedStitches
} from '@/utils/userCrochetDisplay'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['update:show', 'close', 'saved'])

const open = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const { t } = useI18n({ useScope: 'global' })
const {
  stitchDisplayAliases,
  userSelfDefinedStitches,
  saveUserCrochetDisplaySettings
} = useUserCrochetDisplay()

const saving = ref(false)
const showAddWizard = ref(false)
const draftAliases = ref({})
const draftUserStitches = ref([])
const initialAliasesJson = ref('')
const initialUserStitchesJson = ref('')

const builtinRows = computed(() => {
  return BasicStitchGeneral.map((stitch) => ({
    stitchId: String(stitch.index),
    textLabel: stitch.nameKey ? getCrochetZhText(stitch.nameKey) : ''
  }))
})

function cloneDraftFromProfile() {
  const aliases = buildBuiltinAliasDraft(stitchDisplayAliases.value)
  const stitches = normalizeUserSelfDefinedStitches(userSelfDefinedStitches.value)
    .map((item) => ({ ...item, display_label: item.display_label || item.name }))

  draftAliases.value = { ...aliases }
  draftUserStitches.value = stitches
  initialAliasesJson.value = JSON.stringify(aliases)
  initialUserStitchesJson.value = JSON.stringify(stitches)
}

watch(
  () => open.value,
  (next) => {
    if (!next) return
    cloneDraftFromProfile()
  },
  { immediate: true }
)

const isDirty = computed(() => {
  return JSON.stringify(draftAliases.value) !== initialAliasesJson.value
    || JSON.stringify(normalizeUserSelfDefinedStitches(draftUserStitches.value)) !== initialUserStitchesJson.value
})

function openAddWizard() {
  if (saving.value) return
  showAddWizard.value = true
}

function handleWizardSubmit(draft) {
  const name = String(draft?.name || '').trim()
  if (!name) return

  draftUserStitches.value = [
    ...draftUserStitches.value,
    {
      stitch_id: getNextUserSelfDefinedStitchId(draftUserStitches.value),
      name,
      display_label: name,
      description: String(draft?.description || '').trim(),
      consume: Number(draft?.consume) || 1,
      generate: Number(draft?.generate) || 0
    }
  ]
}

function removeUserStitchAt(index) {
  draftUserStitches.value = draftUserStitches.value.filter((_, idx) => idx !== index)
}

async function handleCancel() {
  if (!isDirty.value || saving.value) {
    open.value = false
    emit('close')
    return
  }
  const ok = await openConfirmation({ type: 'discardChanges' })
  if (!ok) return
  open.value = false
  emit('close')
}

async function handleSave() {
  if (saving.value || !isDirty.value) return
  saving.value = true
  try {
    const ok = await saveUserCrochetDisplaySettings({
      aliases: buildBuiltinAliasesToSave(draftAliases.value),
      userStitches: draftUserStitches.value
    })
    if (!ok) {
      openError({
        title: t('common.error'),
        message: t('common.saveFailed'),
        confirmText: t('common.ok')
      })
      return
    }
    emit('saved')
    open.value = false
    emit('close')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.custom-display-modal__hint {
  margin: 0 0 0.85rem;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.45;
}

.custom-display-modal__list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  max-height: min(52vh, 28rem);
  overflow-y: auto;
}

.custom-display-modal__row {
  display: grid;
  grid-template-columns: minmax(5.5rem, 7.5rem) minmax(0, 1fr);
  gap: 0.65rem;
  align-items: center;
}

.custom-display-modal__row--user {
  grid-template-columns: minmax(5.5rem, 7.5rem) minmax(0, 1fr) auto;
}

.custom-display-modal__label {
  font-size: 0.875rem;
  font-weight: 700;
  color: #374151;
  line-height: 1.3;
}

.custom-display-modal__input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.55rem 0.65rem;
  font-size: 0.9rem;
  color: #111827;
  background: #fff;
}

.custom-display-modal__input:focus {
  outline: none;
  border-color: rgb(var(--color-icon-add-rgb, 34 197 94) / 0.55);
  box-shadow: 0 0 0 2px rgb(var(--color-icon-add-rgb, 34 197 94) / 0.12);
}

.custom-display-modal__delete {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  color: #b91c1c;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
}

.custom-display-modal__delete:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.16);
}

.custom-display-modal__add {
  margin-top: 0.85rem;
  width: 100%;
  border: 1px dashed #d1d5db;
  border-radius: 10px;
  background: #f9fafb;
  color: #374151;
  font-size: 0.9rem;
  font-weight: 700;
  padding: 0.65rem 0.75rem;
  cursor: pointer;
}

.custom-display-modal__add:hover:not(:disabled) {
  background: #f3f4f6;
}
</style>
