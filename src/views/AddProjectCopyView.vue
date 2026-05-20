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
        <p class="copy-project__hint">{{ t('addProject.copy.hint') }}</p>

        <div class="copy-project__picker">
          <div class="copy-project__picker-title">{{ t('addProject.copy.selectLabel') }}</div>

          <div class="copy-project__picker-row">
            <SelectionInput
              v-model="selectedId"
              :disabled="loading || projectOptions.length === 0"
              :placeholder="t('addProject.copy.selectPlaceholder')"
              :options="projectOptions"
            />
          </div>
        </div>

        <div class="copy-project__actions">
          <button
            type="button"
            class="btn-cancel"
            @click="$router.back()"
          >
            {{ t('common.cancel') }}
          </button>

          <button
            type="button"
            class="btn-confirm"
            :disabled="!selectedId"
            @click="goNext"
          >
            {{ t('addProject.common.next') }}
          </button>
        </div>
      </div>
    </template>
  </ProjectWizardLayout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import ProjectWizardLayout from '@/components/projects/ProjectWizardLayout.vue'
import SelectionInput from '@/components/Selection/SelectionInput.vue'

import { auth } from '@/firebaseConfig'
import { fetchUserProjectSummaries } from '@/services/firestore/user'

defineOptions({ name: 'AddProjectCopyView' })

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()

const selectedId = ref('')
const projectSummaries = ref([])
const loading = ref(false)

const isDirty = computed(() => Boolean(String(selectedId.value || '').trim()))

const projectOptions = computed(() => {
  const list = Array.isArray(projectSummaries.value) ? projectSummaries.value : []
  return list.map((p) => ({
    value: String(p.id),
    label: String(p.name || p.id),
  }))
})

async function loadProjects() {
  const uid = auth.currentUser?.uid
  if (!uid) return

  loading.value = true
  try {
    projectSummaries.value = await fetchUserProjectSummaries({ userId: uid, includePrivate: true })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProjects()
})

function goNext() {
  const id = String(selectedId.value || '').trim()
  if (!id) return

  // Pass selected project id via query for AddProjectView to prefill.
  router.push({
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

.copy-project__actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 1rem;
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

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 0.5rem 0.9rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-confirm {
  background: var(--color-icon-add);
  color: white;
  border: none;
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
