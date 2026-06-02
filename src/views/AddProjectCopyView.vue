<template>
  <ProjectWizardLayout
    :title="t('addProject.copy.title')"
    :show-banner="true"
    :show-steps="false"
    :is-dirty="isDirty"
    @last-page="$router.back()"
  >
    <template #step-fallback>
      <div class="copy-project">
        <div class="copy-project__picker">
          <div class="copy-project__picker-row">
            <SelectionInputCombineList
              v-model="selectedProjectText"
              :disabled="loading || projectOptions.length === 0"
              :placeholder="t('addProject.copy.selectPlaceholder')"
              :suggestions="projectSuggestions"
              :strict="true"
            />
          </div>
        </div>

      </div>
    </template>
  </ProjectWizardLayout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import ProjectWizardLayout from '@/components/features/project/ProjectWizardLayout.vue'
import SelectionInputCombineList from '@/components/shared/inputs/SelectionInputCombineList.vue'

import { auth } from '@/firebaseConfig'
import { fetchProjectSummariesByIds } from '@/services/firestore/projects'
import { fetchUserProfile, fetchUserProjectSummaries, fetchUsers } from '@/services/firestore/user'
import { useFooterContext } from '@/composables/footerContext'

defineOptions({ name: 'AddProjectCopyView' })

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const footer = useFooterContext()

const selectedProjectText = ref('')
const createdProjectSummaries = ref([])
const savedProjectSummaries = ref([])
const authorNameById = ref({})
const loading = ref(false)

const isDirty = computed(() => Boolean(String(selectedProjectText.value || '').trim()))

const projectOptions = computed(() => {
  const list = Array.isArray(createdProjectSummaries.value) ? createdProjectSummaries.value : []
  return list.map((p) => ({
    value: String(p.id),
    label: String(p.name || p.id),
  }))
})

const combinedProjectSummaries = computed(() => {
  const created = Array.isArray(createdProjectSummaries.value) ? createdProjectSummaries.value : []
  const saved = Array.isArray(savedProjectSummaries.value) ? savedProjectSummaries.value : []
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

const projectSuggestions = computed(() => {
  const list = Array.isArray(combinedProjectSummaries.value) ? combinedProjectSummaries.value : []
  const raw = list
    .map((p) => {
      const id = String(p?.id || '').trim()
      const name = String(p?.name || '').trim()
      if (!id) return null
      if (!name) return null

      if (p.__kind === 'saved') {
        const authorName = String(p.__authorName || '').trim()
        if (authorName) return { label: `${name} (${authorName})`, id }
        return { label: name, id }
      }

      return { label: `[自創] ${name}`, id }
    })
    .filter(Boolean)

  // Ensure the labels are unique so we can map them back to IDs without showing IDs.
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
  const raw = list
    .map((p) => {
      const id = String(p?.id || '').trim()
      const name = String(p?.name || '').trim()
      if (!id) return null
      if (!name) return null

      if (p.__kind === 'saved') {
        const authorName = String(p.__authorName || '').trim()
        if (authorName) return { label: `${name} (${authorName})`, id }
        return { label: name, id }
      }

      return { label: `[自創] ${name}`, id }
    })
    .filter(Boolean)

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

async function loadProjects() {
  const uid = auth.currentUser?.uid
  if (!uid) return

  loading.value = true
  try {
    const [created, profile] = await Promise.all([
      fetchUserProjectSummaries({ userId: uid, includePrivate: true }),
      fetchUserProfile({ userId: uid })
    ])

    createdProjectSummaries.value = created

    const ids = Array.isArray(profile?.save_project_list) ? profile.save_project_list : []
    if (ids.length) {
      savedProjectSummaries.value = await fetchProjectSummariesByIds(ids)
    } else {
      savedProjectSummaries.value = []
    }

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

onMounted(() => {
  loadProjects()
})

watch(
  () => [loading.value, selectedProjectId.value],
  () => {
    footer?.setActions?.({
      ariaLabel: t('addProject.copy.title'),
      justify: 'space-between',
      secondary: {
        label: t('common.cancel'),
        disabled: Boolean(loading.value),
        onClick: () => router.back()
      },
      primary: {
        label: t('addProject.common.next'),
        disabled: Boolean(loading.value) || !String(selectedProjectId.value || '').trim(),
        onClick: goNext
      }
    })
  },
  { immediate: true }
)

onBeforeUnmount(() => footer?.clearActions?.())

function goNext() {
  const id = String(selectedProjectId.value || '').trim()
  if (!id) return

  // Pass selected project id via query for AddProjectView to prefill.
  router.replace({
    name: 'add-project',
    query: { copyFrom: id }
  })
}
</script>

<style scoped>
.copy-project {
  padding: 1rem;
  max-width: 820px;
  margin: 0 auto;
}

.copy-project__hint {
  color: #6b7280;
  margin: 0 0 1rem 0;
}

.copy-project__picker {
  padding: 0.75rem 0;
}

.copy-project__picker-title {
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.copy-project__picker-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

</style>
