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

    <section v-if="showComponentMode" class="multi-export">
      <div class="modal-section-row">
        <span class="modal-section-row__label">{{ t('designPrint.exportAsMultiplePhotos') }}</span>
        <label class="modal-toggle">
          <input v-model="draftExportMultiple" type="checkbox" class="modal-toggle__input" />
          <span class="modal-toggle__track" aria-hidden="true" />
        </label>
      </div>
    </section>

    <ul class="section-list">
      <li v-for="item in sectionOptions" :key="item.key" class="section-item">
        <div class="modal-section-row">
          <span class="modal-section-row__label">{{ item.label }}</span>
          <label class="modal-toggle">
            <input v-model="draft[item.key]" type="checkbox" class="modal-toggle__input" />
            <span class="modal-toggle__track" aria-hidden="true" />
          </label>
        </div>

        <section v-if="item.key === 'images' && showExtraImagesSettings" class="extra-images-settings">
          <PrintImageOptionsSection
            v-model="draftExtraImages"
            :enabled="draft.images"
            :source-images="sourceImages"
          />
        </section>
      </li>
    </ul>
  </ModalShell>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ModalShell from '@/components/modals/ModalShell/ModalShell.vue'
import PrintImageOptionsSection from '@/components/modals/PrintImageOptionsSection.vue'
import {
  DEFAULT_DESIGN_PRINT_COMPONENT_MODE,
  DESIGN_PRINT_COMPONENT_MODES,
  DESIGN_PRINT_SECTION_KEYS,
  normalizeDesignComponentMode,
  normalizeDesignSectionVisibility
} from '@/constants/designPrintSections'
import {
  normalizeExtraImagesSettings,
  normalizeSourceImageUrls
} from '@/constants/recordPrintExtraImages'

const props = defineProps({
  show: { type: Boolean, default: false },
  modelValue: {
    type: Object,
    default: () => ({})
  },
  componentMode: {
    type: String,
    default: DEFAULT_DESIGN_PRINT_COMPONENT_MODE
  },
  extraImagesSettings: {
    type: Object,
    default: () => ({})
  },
  sourceImages: {
    type: Array,
    default: () => []
  },
  showComponentMode: {
    type: Boolean,
    default: false
  },
  availableKeys: {
    type: Array,
    default: () => [...DESIGN_PRINT_SECTION_KEYS]
  }
})

const emit = defineEmits(['update:show', 'save'])

const { t } = useI18n({ useScope: 'global' })

const draft = reactive(normalizeDesignSectionVisibility(props.modelValue))
const draftComponentMode = ref(normalizeDesignComponentMode(props.componentMode))
const draftExportMultiple = ref(draftComponentMode.value === DESIGN_PRINT_COMPONENT_MODES.separate)
const draftExtraImages = reactive(normalizeExtraImagesSettings(props.extraImagesSettings, props.sourceImages))

const sourceImages = computed(() => normalizeSourceImageUrls(props.sourceImages))

const allowedKeys = computed(() => {
  const list = Array.isArray(props.availableKeys) ? props.availableKeys : []
  if (!list.length) return [...DESIGN_PRINT_SECTION_KEYS]
  const allowed = new Set(list)
  return DESIGN_PRINT_SECTION_KEYS.filter((key) => allowed.has(key))
})

const SECTION_LABEL_KEYS = {
  images: 'project.downloadDesignPage.sectionImages',
  description: 'project.downloadDesignPage.sectionDescription',
  materials: 'project.downloadDesignPage.sectionMaterials',
  notes: 'project.downloadDesignPage.sectionNotes',
  selfDefinedStitches: 'project.downloadDesignPage.sectionSelfDefinedStitches'
}

const PROJECT_ONLY_KEYS = Object.freeze(['images', 'description', 'selfDefinedStitches'])

const sectionOptions = computed(() => {
  const keys = allowedKeys.value.filter((key) => {
    // Project-level options only make sense when exporting a single combined image.
    if (!draftExportMultiple.value) return true
    return !PROJECT_ONLY_KEYS.includes(key)
  })

  const ordered = []
  if (keys.includes('images')) ordered.push('images')
  for (const key of keys) {
    if (key !== 'images') ordered.push(key)
  }

  return ordered.map((key) => ({
    key,
    label: t(SECTION_LABEL_KEYS[key] || key)
  }))
})

const showExtraImagesSettings = computed(() => {
  if (!allowedKeys.value.includes('images')) return false
  if (!draft.images) return false
  if (draftExportMultiple.value) return false
  return sourceImages.value.length > 0
})

function syncDraftFromProps() {
  const next = normalizeDesignSectionVisibility(props.modelValue)
  for (const key of DESIGN_PRINT_SECTION_KEYS) {
    draft[key] = allowedKeys.value.includes(key) ? next[key] : false
  }
  draftComponentMode.value = normalizeDesignComponentMode(props.componentMode)
  draftExportMultiple.value = draftComponentMode.value === DESIGN_PRINT_COMPONENT_MODES.separate

  const nextExtraImages = normalizeExtraImagesSettings(props.extraImagesSettings, sourceImages.value)
  draftExtraImages.aspectRatio = nextExtraImages.aspectRatio
  draftExtraImages.aspectLandscape = nextExtraImages.aspectLandscape
  draftExtraImages.displayOrder = nextExtraImages.displayOrder
  draftExtraImages.gapPx = nextExtraImages.gapPx
  draftExtraImages.roundedCorners = nextExtraImages.roundedCorners
  draftExtraImages.selectedUrls = nextExtraImages.selectedUrls
}

watch(
  () => props.show,
  (visible) => {
    if (!visible) return
    syncDraftFromProps()
  }
)

function handleSave() {
  const out = normalizeDesignSectionVisibility(draft)
  for (const key of DESIGN_PRINT_SECTION_KEYS) {
    if (!allowedKeys.value.includes(key)) out[key] = false
  }

  const extraImages = normalizeExtraImagesSettings(draftExtraImages, sourceImages.value)

  emit('save', {
    sectionVisibility: out,
    componentMode: normalizeDesignComponentMode(
      draftExportMultiple.value ? DESIGN_PRINT_COMPONENT_MODES.separate : DESIGN_PRINT_COMPONENT_MODES.combined
    ),
    extraImages
  })
  emit('update:show', false)
}
</script>

<style scoped>
.multi-export {
  margin: 0 0 1rem;
  padding: 0.75rem 0.75rem 0.5rem;
  border-radius: 12px;
  border: 1px solid rgba(17, 24, 39, 0.12);
  background: rgba(17, 24, 39, 0.02);
}

.settings-group-title {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  font-weight: 900;
  color: #111827;
}

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
</style>
