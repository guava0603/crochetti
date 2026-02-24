<template>
  <div v-if="show" class="modal-overlay" @click="$emit('cancel')">
    <div class="modal-content" @click.stop>
      <h3 class="title">{{ titleText }}</h3>

      <template v-if="step === 'choice'">
        <p class="message">{{ t('user.addRecord.message') }}</p>

        <div class="choice-list">
          <button class="choice" type="button" @click="step = 'select-project'">
            {{ t('user.addRecord.actions.selectProject') }}
          </button>
          <button class="choice" type="button" @click="$emit('add-project')">
            {{ t('user.addRecord.actions.addProject') }}
          </button>
          <button class="choice choice--primary" type="button" @click="step = 'quick-add'">
            {{ t('user.addRecord.actions.quickAddProject', { stitch: t('crochet.stitches.singleCrochet') }) }}
          </button>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" type="button" @click="$emit('cancel')">
            {{ t('common.cancel') }}
          </button>
        </div>
      </template>

      <template v-else-if="step === 'select-project'">
        <div class="form-group">
          <label>{{ t('user.addRecord.selectProjectLabel') }}</label>
          <select v-model="selectedProjectId" class="select" :disabled="loading || !projects.length">
            <option v-for="p in projects" :key="p.id" :value="p.id">
              {{ p.name || t('user.addRecord.untitledProject') }}
            </option>
          </select>
          <p v-if="!projects.length" class="hint">{{ t('user.addRecord.noProjects') }}</p>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" type="button" :disabled="loading" @click="step = 'choice'">
            {{ t('common.cancel') }}
          </button>
          <button
            class="btn-confirm"
            type="button"
            :disabled="loading || !projects.length || !selectedProjectId"
            @click="$emit('select-project', selectedProjectId)"
          >
            {{ t('user.addRecord.startRecord') }}
          </button>
        </div>
      </template>

      <template v-else-if="step === 'quick-add'">
        <form class="form" @submit.prevent="submitQuickAdd">
          <div class="form-group">
            <label>{{ t('addProject.info.projectNameLabel') }}</label>
            <input v-model="quick.name" class="input" type="text" :disabled="loading" />
          </div>

          <div class="form-group">
            <label>{{ t('addProject.info.descriptionLabel') }}</label>
            <input v-model="quick.description" class="input" type="text" :disabled="loading" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>{{ t('user.addRecord.quick.rowCount') }}</label>
              <input v-model.number="quick.rowCount" class="input" type="number" min="1" step="1" :disabled="loading" />
            </div>
            <div class="form-group">
              <label>{{ t('user.addRecord.quick.crochetCount', { stitch: t('crochet.stitches.singleCrochet') }) }}</label>
              <input v-model.number="quick.crochetCount" class="input" type="number" min="1" step="1" :disabled="loading" />
            </div>
          </div>

          <p class="hint">{{ t('user.addRecord.quick.hint', { rowCount: quick.rowCount, crochetCount: quick.crochetCount, stitch: t('crochet.stitches.singleCrochet') }) }}</p>

          <p v-if="error" class="error">{{ error }}</p>

          <div class="modal-actions">
            <button class="btn-cancel" type="button" :disabled="loading" @click="step = 'choice'">
              {{ t('common.cancel') }}
            </button>
            <button class="btn-confirm" type="submit" :disabled="loading">
              {{ loading ? t('common.loading') : t('user.addRecord.quick.createAndStart') }}
            </button>
          </div>
        </form>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

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
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['cancel', 'add-project', 'select-project', 'quick-add'])

const step = ref('choice')
const selectedProjectId = ref('')
const error = ref('')

const quick = ref({
  name: '',
  description: '',
  rowCount: 10,
  crochetCount: 6
})

watch(
  () => props.show,
  (open) => {
    if (!open) return
    step.value = 'choice'
    error.value = ''
    const first = props.projects?.[0]?.id
    selectedProjectId.value = first ? String(first) : ''
  }
)

watch(
  () => props.projects,
  (list) => {
    if (!props.show) return
    if (step.value !== 'select-project') return
    if (selectedProjectId.value) return
    const first = list?.[0]?.id
    selectedProjectId.value = first ? String(first) : ''
  },
  { deep: true }
)

const titleText = computed(() => t('user.addRecord.title'))

const submitQuickAdd = () => {
  error.value = ''

  const name = String(quick.value.name || '').trim()
  const description = String(quick.value.description || '').trim()
  const rowCount = Number(quick.value.rowCount)
  const crochetCount = Number(quick.value.crochetCount)

  if (!name) {
    error.value = t('addProject.info.errors.projectNameRequired')
    return
  }
  if (!Number.isFinite(rowCount) || rowCount < 1) {
    error.value = t('user.addRecord.quick.errors.rowCount')
    return
  }
  if (!Number.isFinite(crochetCount) || crochetCount < 1) {
    error.value = t('user.addRecord.quick.errors.crochetCount')
    return
  }

  // Use the validated payload.
  const payload = {
    name,
    description,
    rowCount: Math.floor(rowCount),
    crochetCount: Math.floor(crochetCount)
  }

  error.value = ''
  emit('quick-add', payload)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}

.modal-content {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  max-width: 520px;
  width: 92%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.title {
  margin: 0 0 0.75rem 0;
  color: #111827;
  font-size: 1.25rem;
}

.message {
  margin: 0 0 1rem 0;
  color: #6b7280;
  line-height: 1.5;
}

.choice-list {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.choice {
  width: 100%;
  text-align: left;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  font-weight: 700;
  cursor: pointer;
}

.choice--primary {
  border-color: rgba(66, 185, 131, 0.6);
}

.form {
  display: block;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.form-group {
  margin-bottom: 0.75rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.35rem;
  color: #374151;
  font-weight: 700;
}

.input,
.select {
  width: 100%;
  padding: 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  background: white;
}

.hint {
  margin: 0.25rem 0 0.75rem 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.error {
  margin: 0.25rem 0 0.75rem 0;
  color: #dc2626;
  font-weight: 700;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.btn-cancel {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 0.625rem 1.1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-confirm {
  background: #42b983;
  color: white;
  border: none;
  padding: 0.625rem 1.1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
}

.btn-cancel:disabled,
.btn-confirm:disabled,
.choice:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 420px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
