<template>
  <ModalShell
    :show="show"
    :title="titleText"
    max-width="480px"
    show-save-footer
    :save-disabled="!canSave"
    @close="onCancel"
    @save="onSave"
  >
    <div class="avatar-grid" role="listbox" :aria-label="titleText">
      <button
        v-for="opt in options"
        :key="opt.id"
        type="button"
        class="avatar-grid__item"
        :class="{ 'is-selected': opt.id === selectedId }"
        role="option"
        :aria-selected="opt.id === selectedId"
        @click="select(opt.id)"
      >
        <div v-if="opt.kind === 'default'" class="avatar-grid__default">
          <div class="avatar-grid__default-text">{{ defaultText }}</div>
        </div>
        <img
          v-else
          class="avatar-grid__img"
          :src="opt.src"
          :alt="opt.label"
          loading="lazy"
        />
      </button>
    </div>
  </ModalShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { openConfirmation } from '@/services/ui/confirmation'
import { avatarIdFromValue, avatarSrcFromId } from '@/constants/avatarPresets'
import ModalShell from '@/components/modals/shell/ModalShell/ModalShell.vue'

defineOptions({ name: 'AvatarPickerModal' })

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  show: { type: Boolean, required: true },
  value: { type: String, default: '' },
  title: { type: String, default: '' },
  defaultLabel: { type: String, default: '' },
  avatarFiles: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'save'])

const selectedId = ref('')
const initialId = ref('')

watch(
  () => [props.show, props.value],
  () => {
    if (!props.show) return
    initialId.value = String(props.value || '')
    selectedId.value = initialId.value
  },
  { immediate: true }
)

const titleText = computed(() => props.title || t('user.avatarPicker.title'))
const defaultText = computed(() => props.defaultLabel || t('user.avatarPicker.default'))

const options = computed(() => {
  const files = Array.isArray(props.avatarFiles) ? props.avatarFiles : []
  const list = files
    .map((f) => String(f || '').trim())
    .filter(Boolean)
    .map((file) => {
      const id = avatarIdFromValue(file)
      return {
        id,
        kind: 'avatar',
        src: avatarSrcFromId(id),
        label: file
      }
    })
    .filter((opt) => Boolean(opt.id))

  return [{ id: '', kind: 'default', src: '', label: defaultText.value }, ...list]
})

function select(id) {
  selectedId.value = String(id || '')
}

const canSave = computed(() => selectedId.value !== initialId.value)

function onCancel() {
  if (!canSave.value) {
    emit('close')
    return
  }
  void (async () => {
    const ok = await openConfirmation({ type: 'discardChanges' })
    if (!ok) return
    emit('close')
  })()
}

function onSave() {
  if (!canSave.value) return
  emit('save', selectedId.value)
}
</script>

<style scoped>
.avatar-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
}

.avatar-grid__item {
  appearance: none;
  border: 2px solid rgba(17, 24, 39, 0.12);
  border-radius: 14px;
  background: white;
  padding: 0.5rem;
  cursor: pointer;
  width: 100%;
  aspect-ratio: 1 / 1;
  display: grid;
  place-items: center;
  transition: transform 0.08s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.avatar-grid__item:hover {
  transform: translateY(-1px);
  border-color: rgba(17, 24, 39, 0.2);
}

.avatar-grid__item.is-selected {
  border-color: rgba(59, 130, 246, 0.75);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
}

.avatar-grid__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.avatar-grid__default {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: var(--color-button-add);
  display: grid;
  place-items: center;
}

.avatar-grid__default-text {
  font-weight: 900;
  color: var(--color-white);
  letter-spacing: 0.02em;
}

@media (max-width: 420px) {
  .avatar-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
