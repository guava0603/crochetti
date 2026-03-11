<template>
  <ProjectWizardLayout
    :title="pageTitle"
    :show-steps="false"
    :is-dirty="isDirty"
    @last-page="$router.back()"
  >
    <template #step-fallback>
      <form class="quick-start" @submit.prevent="onSubmit">
        <div class="form-group">
          <div class="label-wrapper">
            <label>{{ t('addProject.info.projectNameLabel') }}</label>
            <span class="required-badge">{{ t('common.required') }}</span>
          </div>
          <input v-model="draft.name" type="text" :disabled="loading" required />
        </div>

        <div class="form-group">
          <label>{{ t('addProject.info.descriptionLabel') }}</label>
          <input v-model="draft.description" type="text" :disabled="loading" />
        </div>

        <div class="form-group">
          <div class="label-wrapper">
            <label>{{ t('user.addRecord.quick.groupsTitle') }}</label>
            <span class="required-badge">{{ t('common.required') }}</span>
          </div>

          <div class="quick-groups">
            <div v-if="draft.groups.length" class="quick-groups__list">
              <div v-for="(g, i) in draft.groups" :key="i" class="quick-group-row">
                <input
                  v-model.number="g.crochetCount"
                  class="quick-group-row__input"
                  type="number"
                  inputmode="numeric"
                  min="1"
                  max="9999"
                  step="1"
                  :placeholder="t('user.addRecord.quick.crochetCountShort')"
                  :aria-label="t('user.addRecord.quick.crochetCount', { stitch: t('crochet.stitches.singleCrochet') })"
                  :disabled="loading"
                  @blur="() => clampGroup(i)"
                />

                <span class="quick-group-row__mul" aria-hidden="true">針 ×</span>

                <input
                  v-model.number="g.rowCount"
                  class="quick-group-row__input"
                  type="number"
                  inputmode="numeric"
                  min="1"
                  max="999"
                  step="1"
                  :placeholder="t('user.addRecord.quick.rowCountShort')"
                  :aria-label="t('user.addRecord.quick.rowCount')"
                  :disabled="loading"
                  @blur="() => clampGroup(i)"
                />

                <span class="quick-group-row__unit" aria-hidden="true">行</span>
              </div>
            </div>

            <p v-if="draft.groups.length && totalRows > 0" class="hint">
              {{ t('user.addRecord.quick.hintRowsMade', { rowCount: totalRows }) }}
            </p>

            <button
              v-if="shouldShowAddGroupButton"
              class="quick-groups__add"
              type="button"
              :disabled="loading"
              @click="addGroup"
            >
              {{ t('user.addRecord.quick.addGroup') }}
            </button>
          </div>
        </div>

      </form>

      <!-- Footer actions are rendered by App (meta.footer = 'actions'). -->
    </template>
  </ProjectWizardLayout>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import ProjectWizardLayout from '@/components/projects/ProjectWizardLayout.vue'
import { useFooterContext } from '@/composables/footerContext'

import { auth } from '@/firebaseConfig'
import { createProject } from '@/services/firestore/projects'
import { startRecordForProject } from '@/services/records/startRecordForProject'
import { useAchievementStore } from '@/stores/achievementStore'
import { createPattern, createRow, updateRowStats } from '@/constants/crochetData'
import { openError } from '@/services/ui/notice'

defineOptions({ name: 'QuickStartRecordView' })

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const achievementStore = useAchievementStore()
const footer = useFooterContext()

const loading = ref(false)

const draft = ref({
  name: '',
  description: '',
  groups: []
})

const pageTitle = computed(() => t('user.addRecord.actions.quickAddProject', { stitch: t('crochet.stitches.singleCrochet') }))

const isDirty = computed(() => {
  const hasName = Boolean(String(draft.value?.name || '').trim())
  const hasDesc = Boolean(String(draft.value?.description || '').trim())
  const groups = Array.isArray(draft.value?.groups) ? draft.value.groups : []
  return hasName || hasDesc || groups.length > 0
})

watch(
  () => [loading.value],
  () => {
    footer.setActions({
      ariaLabel: t('user.addRecord.quick.submitBarAria'),
      justify: 'space-between',
      secondary: {
        label: t('common.cancel'),
        disabled: loading.value,
        onClick: () => router.back()
      },
      primary: {
        label: loading.value ? t('common.loading') : t('user.addRecord.quick.createAndStart'),
        disabled: loading.value,
        onClick: onSubmit
      }
    })
  },
  { immediate: true }
)

onBeforeUnmount(() => footer.clearActions())

const clampNullableInt = (value, { min = 1, max = Infinity } = {}) => {
  if (value == null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const floored = Math.floor(n)
  return Math.min(max, Math.max(min, floored))
}

const normalizeGroup = (g) => {
  const crochetCount = clampNullableInt(g?.crochetCount, { min: 1, max: 9999 })
  const rowCount = clampNullableInt(g?.rowCount, { min: 1, max: 999 })
  return { crochetCount, rowCount }
}

const isGroupComplete = (g) => {
  const { crochetCount, rowCount } = normalizeGroup(g)
  return Number.isFinite(crochetCount) && crochetCount >= 1 && Number.isFinite(rowCount) && rowCount >= 1
}

const shouldShowAddGroupButton = computed(() => {
  const groups = Array.isArray(draft.value.groups) ? draft.value.groups : []
  if (groups.length >= 499) return false
  if (!groups.length) return true
  return isGroupComplete(groups[groups.length - 1])
})

const addGroup = () => {
  const groups = Array.isArray(draft.value.groups) ? draft.value.groups : []
  if (groups.length >= 499) return

  const last = groups.length ? normalizeGroup(groups[groups.length - 1]) : null
  const crochetCount = last?.crochetCount && Number.isFinite(last.crochetCount) ? last.crochetCount : 1

  groups.push({
    crochetCount,
    rowCount: 1
  })
  draft.value.groups = groups
}

const clampGroup = (index) => {
  const groups = Array.isArray(draft.value.groups) ? draft.value.groups : []
  const g = groups[index]
  if (!g) return

  const normalized = normalizeGroup(g)
  g.crochetCount = normalized.crochetCount
  g.rowCount = normalized.rowCount
}

const totalRows = computed(() => {
  const groups = Array.isArray(draft.value.groups) ? draft.value.groups : []
  return groups.reduce((sum, g) => {
    const { rowCount } = normalizeGroup(g)
    return sum + (Number.isFinite(rowCount) ? rowCount : 0)
  }, 0)
})

const buildComponentList = (projectName, groups) => {
  const rows = []
  let rowIndex = 1
  for (const g of groups) {
    for (let i = 0; i < g.rowCount; i++) {
      const row = createRow(rowIndex, [createPattern(g.crochetCount, [{ type: 'stitch', stitch_id: 4 }])])
      updateRowStats(row)
      rows.push(row)
      rowIndex += 1
    }
  }

  return [
    {
      name: `${projectName} 1`,
      type: 'component',
      count: 1,
      yarn: [''],
      hook: [''],
      metadata: {
        yarn: [],
        hook: []
      },
      content: {
        type: 0,
        row_list: rows,
        row_groups: [],
        consume: 0,
        generate: 0
      }
    }
  ]
}

const onSubmit = async () => {
  const user = auth.currentUser
  if (!user) return

  const name = String(draft.value.name || '').trim()
  const description = String(draft.value.description || '').trim()
  const groupsRaw = Array.isArray(draft.value.groups) ? draft.value.groups : []

  if (!name) {
    await openError({ title: t('common.error'), message: t('addProject.info.errors.projectNameRequired'), confirmText: t('common.ok') })
    return
  }

  if (!groupsRaw.length) {
    await openError({ title: t('common.error'), message: t('user.addRecord.quick.errors.groupsRequired'), confirmText: t('common.ok') })
    return
  }

  const groups = groupsRaw.map(normalizeGroup)
  if (groups.some((g) => !isGroupComplete(g))) {
    await openError({ title: t('common.error'), message: t('user.addRecord.quick.errors.groupIncomplete'), confirmText: t('common.ok') })
    return
  }

  // Clamp once more (in case user didn't blur).
  draft.value.groups = groups

  loading.value = true
  try {
    const component_list = buildComponentList(name, groups)
    const projectData = {
      name,
      description,
      component_list,
      is_public: false,
      authorId: user.uid,
      createdAt: new Date().toISOString()
    }

    const projectId = await createProject(projectData)
    await achievementStore.scanAndAwardNow(user.uid)

    const { recordId } = await startRecordForProject({
      uid: user.uid,
      projectId,
      projectName: name,
      projectImage: '',
      componentList: component_list
    })

    await router.push(`/record/${recordId}`)
  } catch (error) {
    console.error('Quick start failed:', error)
    await openError({
      title: t('common.error'),
      message: t('user.addRecord.errors.quickAddFailed'),
      confirmText: t('common.ok')
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.quick-start {
  max-width: 45rem;
  margin: 0 auto;
}

.quick-groups__add {
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 0.0625rem dashed rgba(17, 24, 39, 0.28);
  background: rgba(17, 24, 39, 0.02);
  font-weight: 800;
  color: rgba(17, 24, 39, 0.88);
  cursor: pointer;
}

.quick-groups__add:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.quick-group-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.quick-group-row__mul,
.quick-group-row__unit {
  font-weight: 900;
  color: rgba(90, 82, 75, 0.8);
}

.quick-group-row__input {
  margin: 0;
}

.hint {
  margin-top: 0.75rem;
  color: #6b7280;
  font-size: 0.9rem;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 0.0625rem solid #d1d5db;
  padding: 0.75rem 1.1rem;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
}

.btn-primary {
  background: var(--color-icon-add);
  color: white;
  border: none;
  padding: 0.75rem 1.1rem;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  font-weight: 900;
  cursor: pointer;
}

.btn-secondary:disabled,
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
