<template>
  <ModalShell
    :show="show"
    :title="titleText"
    max-width="560px"
    z-level="high"
    show-save-footer
    :step="step"
    :step-count="2"
    :saving="loading"
    :save-disabled="saveDisabled"
    :save-label="saveLabelText"
    @close="handleCancel"
    @back="handleBack"
    @next="handleNext"
    @save="handleConfirm"
  >
    <template v-if="step === 1">
      <p class="modal-message">{{ t('user.addRecord.message') }}</p>

      <div class="modal-choice-list">
        <div
          class="modal-choice"
          role="button"
          tabindex="0"
          @click="mode = 'add-project'"
          @keydown.enter.prevent="mode = 'add-project'"
          @keydown.space.prevent="mode = 'add-project'"
        >
          {{ t('user.addRecord.actions.addProject') }}
        </div>
        <div
          class="modal-choice"
          role="button"
          tabindex="0"
          @click="mode = 'select-project'"
          @keydown.enter.prevent="mode = 'select-project'"
          @keydown.space.prevent="mode = 'select-project'"
        >
          {{ t('user.addRecord.actions.selectProject') }}
        </div>
        <div
          class="modal-choice"
          role="button"
          tabindex="0"
          @click="mode = 'quick-start'"
          @keydown.enter.prevent="mode = 'quick-start'"
          @keydown.space.prevent="mode = 'quick-start'"
        >
          {{ t('user.addRecord.actions.quickAddProject', { stitch: t('crochet.stitches.singleCrochet') }) }}
        </div>
      </div>
    </template>

    <template v-else>
      <p class="picker-hint">{{ t('user.addRecord.selectProjectLabel') }}</p>
      <div class="picker-toolbar">
        <SelectionButtonGroup
          v-model="projectFilter"
          type="multiple"
          :options="projectFilterOptions"
          :aria-label="t('user.addRecord.selectProjectFilterAria')"
          :disabled="loading"
        />
      </div>
      <SelectableScrollList
        v-if="projectPickerItems.length"
        v-model="selectedProjectId"
        :options="projectPickerItems"
        :disabled="loading"
        :aria-label="t('user.addRecord.selectProjectLabel')"
      />
      <p v-else class="picker-empty">{{ t('user.addRecord.noProjects') }}</p>
    </template>
  </ModalShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ModalShell from '@/components/modals/shell/ModalShell/ModalShell.vue'
import SelectionButtonGroup from '@/components/shared/selection/ButtonGroup.vue'
import SelectableScrollList from '@/components/shared/selection/SelectableScrollList.vue'
import { filterNonDraftProjects } from '@/utils/projectDraft'

defineOptions({
  name: 'AddRecordFromUserModal',
  components: { SelectionButtonGroup }
})

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  projects: {
    type: Array,
    default: () => []
  },
  savedProjects: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['cancel', 'add-project', 'select-project', 'quick-start'])

const step = ref(1)
const mode = ref('select-project') // 'add-project' | 'select-project' | 'quick-start'
const DEFAULT_PROJECT_FILTERS = ['created', 'saved']
const projectFilter = ref([...DEFAULT_PROJECT_FILTERS])
const selectedProjectId = ref('')

const projectFilterOptions = computed(() => [
  { id: 'created', label: t('user.tabs.createdDesigns') },
  { id: 'saved', label: t('user.tabs.savedDesigns') }
])

const activeProjectFilters = computed(() => {
  const raw = Array.isArray(projectFilter.value) ? projectFilter.value : []
  const set = new Set(raw.map((v) => String(v || '').trim()).filter(Boolean))
  if (!set.size) return new Set(DEFAULT_PROJECT_FILTERS)
  return set
})

const activeProjectList = computed(() => {
  const filters = activeProjectFilters.value
  const created = filterNonDraftProjects(Array.isArray(props.projects) ? props.projects : [])
  const saved = filterNonDraftProjects(Array.isArray(props.savedProjects) ? props.savedProjects : [])
  const seen = new Set()
  const out = []

  if (filters.has('created')) {
    for (const p of created) {
      const id = String(p?.id || '').trim()
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push(p)
    }
  }

  if (filters.has('saved')) {
    for (const p of saved) {
      const id = String(p?.id || '').trim()
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push(p)
    }
  }

  return out
})

const titleText = computed(() => t('user.addRecord.title'))

const saveLabelText = computed(() => {
  if (step.value === 2) return t('user.addRecord.startRecord')
  return ''
})

const projectPickerItems = computed(() => {
  const list = activeProjectList.value
  return list
    .map((p) => {
      const id = String(p?.id || '').trim()
      if (!id) return null
      const name = String(p?.name || '').trim()
      return {
        id,
        label: name || t('user.addRecord.untitledProject')
      }
    })
    .filter(Boolean)
})

const saveDisabled = computed(() => {
  if (step.value === 1) return !mode.value
  return props.loading || !projectPickerItems.value.length || !String(selectedProjectId.value || '').trim()
})

function resetState() {
  step.value = 1
  mode.value = 'select-project'
  projectFilter.value = [...DEFAULT_PROJECT_FILTERS]
  selectedProjectId.value = ''
}

function handleCancel() {
  resetState()
  emit('cancel')
}

function handleBack() {
  step.value = 1
  selectedProjectId.value = ''
}

function handleNext() {
  if (step.value !== 1) return
  if (mode.value === 'add-project') {
    emit('add-project')
    return
  }
  if (mode.value === 'quick-start') {
    emit('quick-start')
    return
  }
  step.value = 2
  primeSelectedProject()
}

function handleConfirm() {
  if (step.value !== 2) return
  const id = String(selectedProjectId.value || '').trim()
  if (!id) return
  emit('select-project', id)
}

function primeSelectedProject() {
  const items = projectPickerItems.value
  const current = String(selectedProjectId.value || '').trim()
  if (current && items.some((item) => String(item?.id) === current)) return
  const first = items?.[0]?.id
  selectedProjectId.value = first ? String(first) : ''
}

watch(
  () => props.show,
  (open) => {
    if (!open) return
    resetState()
    primeSelectedProject()
  }
)

watch(
  () => [props.projects, props.savedProjects],
  () => {
    if (!props.show) return
    if (step.value !== 2) return
    primeSelectedProject()
  },
  { deep: true }
)

watch(
  projectFilter,
  (next) => {
    const filters = Array.isArray(next) ? next.map((v) => String(v || '').trim()).filter(Boolean) : []
    if (!filters.length) {
      projectFilter.value = [...DEFAULT_PROJECT_FILTERS]
      return
    }
    if (!props.show) return
    if (step.value !== 2) return
    selectedProjectId.value = ''
    primeSelectedProject()
  },
  { deep: true }
)

watch(
  () => step.value,
  (s) => {
    if (s !== 2) return
    primeSelectedProject()
  }
)
</script>

<style scoped>
.modal-message {
  margin: 0 0 0.85rem;
  color: #6b7280;
  font-size: 0.95rem;
  line-height: 1.45;
}

.modal-choice-list {
  display: grid;
  gap: 0.75rem;
}

.modal-choice {
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

.modal-choice:hover {
  border-color: rgb(var(--color-icon-add-rgb) / 0.55);
  background: rgb(var(--color-icon-add-rgb) / 0.12);
}

.picker-hint {
  margin: 0 0 0.75rem;
  color: #6b7280;
}

.picker-toolbar {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 0.75rem;
}

.picker-empty {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
}
</style>
