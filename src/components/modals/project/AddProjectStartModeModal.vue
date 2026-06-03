<template>
  <ModalShell
    :show="show"
    :title="titleText"
    max-width="560px"
    z-level="high"
    show-save-footer
    :step="step"
    :step-count="2"
    :save-disabled="saveDisabled"
    @close="handleCancel"
    @back="handleBack"
    @next="handleNext"
    @save="handleConfirm"
  >
    <template v-if="step === 1">
      <p class="modal-message">{{ messageText }}</p>
      <div class="modal-choice-list">
        <div
          class="modal-choice"
          role="button"
          tabindex="0"
          @click="mode = 'new'"
          @keydown.enter.prevent="mode = 'new'"
          @keydown.space.prevent="mode = 'new'"
        >
          {{ t('addProject.startMode.new') }}
        </div>
        <div
          class="modal-choice"
          role="button"
          tabindex="0"
          @click="mode = 'copy'"
          @keydown.enter.prevent="mode = 'copy'"
          @keydown.space.prevent="mode = 'copy'"
        >
          {{ t('addProject.startMode.copy') }}
        </div>
        <div
          class="modal-choice"
          role="button"
          tabindex="0"
          @click="mode = 'draft'"
          @keydown.enter.prevent="mode = 'draft'"
          @keydown.space.prevent="mode = 'draft'"
        >
          {{ t('addProject.startMode.draft') }}
        </div>
      </div>
    </template>

    <template v-else>
      <p class="copy-hint">{{ pickerHintText }}</p>
      <div class="copy-picker">
        <SelectionInputCombineList
          v-model="selectedProjectText"
          :disabled="loading || projectSuggestions.length === 0"
          :placeholder="pickerPlaceholderText"
          :suggestions="projectSuggestions"
          :strict="true"
        />
      </div>
    </template>
  </ModalShell>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { auth } from '@/firebaseConfig'
import ModalShell from '@/components/modals/shell/ModalShell/ModalShell.vue'
import SelectionInputCombineList from '@/components/shared/inputs/SelectionInputCombineList.vue'
import { fetchProjectSummariesByIds, fetchUserDraftSummaries } from '@/services/firestore/projects'
import { fetchUserProfile, fetchUserProjectSummaries, fetchUsers } from '@/services/firestore/user'
import { filterNonDraftProjects } from '@/utils/projectDraft'

const { t } = useI18n({ useScope: 'global' })

defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['cancel', 'new', 'copy', 'draft'])

const titleText = computed(() => t('confirmation.addProjectStartMode.title'))
const messageText = computed(() => t('confirmation.addProjectStartMode.message'))

const step = ref(1)
const mode = ref('new') // 'new' | 'copy' | 'draft'

const selectedProjectText = ref('')
const createdProjectSummaries = ref([])
const savedProjectSummaries = ref([])
const draftProjectSummaries = ref([])
const authorNameById = ref({})
const loading = ref(false)

const pickerHintText = computed(() => {
  if (mode.value === 'draft') return t('addProject.draft.hint')
  return t('addProject.copy.hint')
})

const pickerPlaceholderText = computed(() => {
  if (mode.value === 'draft') return t('addProject.draft.selectPlaceholder')
  return t('addProject.copy.selectPlaceholder')
})

function handleCancel() {
  step.value = 1
  mode.value = 'new'
  selectedProjectText.value = ''
  emit('cancel')
}

function handleBack() {
  step.value = 1
  selectedProjectText.value = ''
}

const combinedProjectSummaries = computed(() => {
  if (mode.value === 'draft') {
    return (Array.isArray(draftProjectSummaries.value) ? draftProjectSummaries.value : [])
      .map((p) => ({ ...p, __kind: 'draft' }))
  }

  const created = filterNonDraftProjects(
    Array.isArray(createdProjectSummaries.value) ? createdProjectSummaries.value : []
  )
  const saved = filterNonDraftProjects(
    Array.isArray(savedProjectSummaries.value) ? savedProjectSummaries.value : []
  )
  const seen = new Set()
  const out = []

  for (const p of created) {
    const id = String(p?.id || '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({ ...p, __kind: 'created' })
  }

  for (const p of saved) {
    const id = String(p?.id || '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    const authorId = String(p?.authorId || '').trim()
    const authorName = authorId ? String(authorNameById.value?.[authorId] || '').trim() : ''
    out.push({ ...p, __kind: 'saved', __authorName: authorName })
  }

  return out
})

function labelForSummary(p) {
  const id = String(p?.id || '').trim()
  const name = String(p?.name || '').trim()
  if (!id || !name) return null

  if (p.__kind === 'draft') {
    return { label: t('addProject.draft.listLabel', { name }), id }
  }

  if (p.__kind === 'saved') {
    const authorName = String(p.__authorName || '').trim()
    if (authorName) return { label: `${name} (${authorName})`, id }
    return { label: name, id }
  }

  return { label: `[自創] ${name}`, id }
}

const projectSuggestions = computed(() => {
  const list = Array.isArray(combinedProjectSummaries.value) ? combinedProjectSummaries.value : []
  const raw = list.map(labelForSummary).filter(Boolean)

  const used = new Map()
  return raw.map((item) => {
    const base = String(item.label || '').trim()
    if (!base) return ''
    const count = (used.get(base) || 0) + 1
    used.set(base, count)
    return count === 1 ? base : `${base} ·${count}`
  }).filter(Boolean)
})

const suggestionIdByLabel = computed(() => {
  const list = Array.isArray(combinedProjectSummaries.value) ? combinedProjectSummaries.value : []
  const raw = list.map(labelForSummary).filter(Boolean)

  const used = new Map()
  const out = {}
  for (const item of raw) {
    const base = String(item.label || '').trim()
    if (!base) continue
    const count = (used.get(base) || 0) + 1
    used.set(base, count)
    const label = count === 1 ? base : `${base} ·${count}`
    out[label] = String(item.id || '').trim()
  }
  return out
})

const selectedProjectId = computed(() => {
  const label = String(selectedProjectText.value || '').trim()
  if (!label) return ''
  return String(suggestionIdByLabel.value?.[label] || '').trim()
})

const saveDisabled = computed(() => {
  if (step.value === 1) return !mode.value
  return !selectedProjectId.value || loading.value
})

function handleNext() {
  if (step.value !== 1) return
  if (mode.value === 'new') {
    emit('new')
    return
  }
  step.value = 2
}

function handleConfirm() {
  if (step.value !== 2) return
  const id = String(selectedProjectId.value || '').trim()
  if (!id) return
  if (mode.value === 'draft') {
    emit('draft', id)
    return
  }
  emit('copy', id)
}

async function loadProjects() {
  const uid = auth.currentUser?.uid
  if (!uid) {
    createdProjectSummaries.value = []
    savedProjectSummaries.value = []
    draftProjectSummaries.value = []
    authorNameById.value = {}
    return
  }

  loading.value = true
  try {
    const [created, profile, drafts] = await Promise.all([
      fetchUserProjectSummaries({ userId: uid, includePrivate: true }),
      fetchUserProfile({ userId: uid }),
      fetchUserDraftSummaries({ userId: uid })
    ])
    createdProjectSummaries.value = created
    draftProjectSummaries.value = drafts

    const ids = Array.isArray(profile?.save_project_list) ? profile.save_project_list : []
    savedProjectSummaries.value = ids.length ? await fetchProjectSummariesByIds(ids) : []

    const authorIds = Array.from(new Set(
      (Array.isArray(savedProjectSummaries.value) ? savedProjectSummaries.value : [])
        .map((p) => String(p?.authorId || '').trim())
        .filter(Boolean)
    ))

    if (authorIds.length) {
      const users = await fetchUsers({ userIds: authorIds })
      const nextMap = {}
      for (const u of Array.isArray(users) ? users : []) {
        const id = String(u?.id || '').trim()
        if (!id) continue
        const name = String(u?.name || '').trim()
        if (!name) continue
        nextMap[id] = name
      }
      authorNameById.value = nextMap
    } else {
      authorNameById.value = {}
    }
  } finally {
    loading.value = false
  }
}

watch(
  () => step.value,
  (s) => {
    if (s !== 2) return
    if (
      createdProjectSummaries.value.length ||
      savedProjectSummaries.value.length ||
      draftProjectSummaries.value.length
    ) {
      return
    }
    loadProjects()
  }
)

watch(
  () => mode.value,
  () => {
    selectedProjectText.value = ''
  }
)

onMounted(() => {
  loadProjects()
})
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

.copy-hint {
  margin: 0 0 0.75rem 0;
  color: #6b7280;
}

.copy-picker {
  min-height: 30vh;
}
</style>
