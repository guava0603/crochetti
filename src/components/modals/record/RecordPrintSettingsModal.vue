<template>
  <ModalShell
    :show="show"
    :title="t('print.settingsTitle')"
    max-width="400px"
    show-save-footer
    @update:show="emit('update:show', $event)"
    @save="handleSave"
  >
    <p class="modal-hint">{{ t('print.settingsHint') }}</p>

    <ul class="section-list">
      <li v-if="showGoToProject" class="section-item section-item--action">
        <button type="button" class="modal-nav-action" @click="handleGoToProject">
          {{ t('record.goToProject') }}
        </button>
      </li>
      <li v-for="item in sectionOptions" :key="item.key" class="section-item">
        <div class="modal-section-row">
          <span class="modal-section-row__label">{{ item.label }}</span>
          <label class="modal-toggle">
            <input
              v-if="item.key !== 'textInfo'"
              v-model="draft[item.key]"
              type="checkbox"
              class="modal-toggle__input"
            />
            <input
              v-else
              v-model="draftTextInfo"
              type="checkbox"
              class="modal-toggle__input"
              @change="applyTextInfoToDraft(draftTextInfo)"
            />
            <span class="modal-toggle__track" aria-hidden="true" />
          </label>
        </div>

        <section v-if="item.key === 'extraImages' && showExtraImagesSettings" class="extra-images-settings">
          <PrintImageOptionsSection
            v-model="draftExtraImages"
            :enabled="draft.extraImages"
            :source-images="sourceImages"
          />
        </section>

        <PrintCompletedTimePrecisionSection
          v-if="item.key === 'completedTime' && showCompletedTimeSettings"
          v-model="draftCompletedTime"
          :enabled="draft.completedTime"
          :completed-at-ms="completedAtMs"
        />
      </li>
    </ul>
  </ModalShell>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ModalShell from '@/components/modals/shell/ModalShell/ModalShell.vue'
import PrintImageOptionsSection from '@/components/modals/print/PrintImageOptionsSection.vue'
import PrintCompletedTimePrecisionSection from '@/components/modals/print/PrintCompletedTimePrecisionSection.vue'
import {
  RECORD_RESULT_SHARING_SECTION_KEYS,
  normalizeSectionVisibility
} from '@/constants/recordResultSharingSections'
import {
  normalizeExtraImagesSettings,
  normalizeSourceImageUrls
} from '@/constants/recordPrintExtraImages'
import { normalizeCompletedTimeSettings } from '@/constants/recordPrintCompletedTime'

const props = defineProps({
  show: { type: Boolean, default: false },
  modelValue: {
    type: Object,
    default: () => ({})
  },
  extraImagesSettings: {
    type: Object,
    default: () => ({})
  },
  sourceImages: {
    type: Array,
    default: () => []
  },
  availableKeys: {
    type: Array,
    default: () => [...RECORD_RESULT_SHARING_SECTION_KEYS]
  },
  completedTimeSettings: {
    type: Object,
    default: () => ({})
  },
  completedAtMs: {
    type: Number,
    default: null
  },
  projectId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:show', 'save', 'go-to-project'])

const { t } = useI18n({ useScope: 'global' })

const draft = reactive(normalizeSectionVisibility(props.modelValue))
const draftTextInfo = ref(true)
const draftExtraImages = reactive(normalizeExtraImagesSettings(props.extraImagesSettings, props.sourceImages))
const draftCompletedTime = reactive(normalizeCompletedTimeSettings(props.completedTimeSettings))

const sourceImages = computed(() => normalizeSourceImageUrls(props.sourceImages))

const allowedKeys = computed(() => {
  const list = Array.isArray(props.availableKeys) ? props.availableKeys : []
  if (!list.length) return [...RECORD_RESULT_SHARING_SECTION_KEYS]
  const allowed = new Set(list)
  return RECORD_RESULT_SHARING_SECTION_KEYS.filter((key) => allowed.has(key))
})

const TEXT_INFO_CHILD_KEYS = Object.freeze(['resultSummary', 'resultHeader'])

const PRINT_SECTION_OPTION_ORDER = Object.freeze([
  'extraImages',
  'projectTitle',
  'moreStatus',
  'extraNote',
  'completedTime',
  'textInfo'
])

const sectionOptions = computed(() =>
  buildSectionOptions(allowedKeys.value)
)

function buildSectionOptions(keys) {
  const removed = new Set(TEXT_INFO_CHILD_KEYS)
  const hasTextInfo = keys.some((k) => removed.has(k))
  const baseKeys = keys.filter((k) => !removed.has(k))
  const baseSet = new Set(baseKeys)
  const out = []

  for (const key of PRINT_SECTION_OPTION_ORDER) {
    if (key === 'textInfo') {
      if (hasTextInfo) out.push({ key: 'textInfo', label: t('recordPrint.sections.textInfo') })
      continue
    }
    if (!baseSet.has(key)) continue
    out.push({ key, label: t(`recordPrint.sections.${key}`) })
  }

  return out
}

function applyTextInfoToDraft(nextValue) {
  const enabled = Boolean(nextValue)
  for (const key of TEXT_INFO_CHILD_KEYS) {
    if (!allowedKeys.value.includes(key)) continue
    draft[key] = enabled
  }
}

const showExtraImagesSettings = computed(() =>
  allowedKeys.value.includes('extraImages') && draft.extraImages && sourceImages.value.length > 0
)

const showCompletedTimeSettings = computed(
  () =>
    allowedKeys.value.includes('completedTime') &&
    draft.completedTime &&
    props.completedAtMs != null &&
    Number.isFinite(props.completedAtMs)
)

const showGoToProject = computed(() => Boolean(String(props.projectId || '').trim()))

function handleGoToProject() {
  if (!showGoToProject.value) return
  emit('go-to-project')
  emit('update:show', false)
}

function syncDraftFromProps() {
  const next = normalizeSectionVisibility(props.modelValue)
  for (const key of RECORD_RESULT_SHARING_SECTION_KEYS) {
    draft[key] = allowedKeys.value.includes(key) ? next[key] : false
  }

  const relevantTextKeys = TEXT_INFO_CHILD_KEYS.filter((key) => allowedKeys.value.includes(key))
  draftTextInfo.value = relevantTextKeys.length
    ? relevantTextKeys.every((key) => draft[key] !== false)
    : false
  applyTextInfoToDraft(draftTextInfo.value)

  const nextExtraImages = normalizeExtraImagesSettings(props.extraImagesSettings, sourceImages.value)
  draftExtraImages.aspectRatio = nextExtraImages.aspectRatio
  draftExtraImages.aspectLandscape = nextExtraImages.aspectLandscape
  draftExtraImages.displayOrder = nextExtraImages.displayOrder
  draftExtraImages.gapPx = nextExtraImages.gapPx
  draftExtraImages.roundedCorners = nextExtraImages.roundedCorners
  draftExtraImages.selectedUrls = nextExtraImages.selectedUrls

  const nextCompletedTime = normalizeCompletedTimeSettings(props.completedTimeSettings)
  draftCompletedTime.precision = nextCompletedTime.precision
}

watch(
  () => props.show,
  (visible) => {
    if (!visible) return
    syncDraftFromProps()
  }
)

function handleSave() {
  const out = normalizeSectionVisibility(draft)
  for (const key of RECORD_RESULT_SHARING_SECTION_KEYS) {
    if (!allowedKeys.value.includes(key)) out[key] = false
  }

  const normalizedExtraImages = normalizeExtraImagesSettings(draftExtraImages, sourceImages.value)
  const normalizedCompletedTime = normalizeCompletedTimeSettings(draftCompletedTime)

  emit('save', {
    sectionVisibility: out,
    extraImages: normalizedExtraImages,
    completedTime: normalizedCompletedTime
  })
  emit('update:show', false)
}
</script>

<style scoped>
.section-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.section-item {
  display: flex;
  flex-direction: column;
}

.extra-images-settings {
  margin-top: 0.65rem;
  margin-left: 0.5rem;
}

.section-item--action {
  padding-bottom: 0.15rem;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 0.35rem;
}

.modal-nav-action {
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  background: rgba(17, 24, 39, 0.04);
  color: #111827;
  font-size: 0.95rem;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
}

.modal-nav-action:hover:not(:disabled) {
  background: rgba(17, 24, 39, 0.08);
}

.modal-nav-action:disabled {
  opacity: 0.5;
  cursor: default;
}

</style>
