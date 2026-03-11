<template>
  <div v-if="show" class="modal-overlay" @click="$emit('cancel')">
    <div class="modal-content" @click.stop>
      <h3 class="title">{{ titleText }}</h3>

      <template v-if="step === 'choice'">
        <p class="message">{{ t('user.addRecord.message') }}</p>

        <div class="choice-list">
          <button class="choice" type="button" @click="$emit('add-project')">
            {{ t('user.addRecord.actions.addProject') }}
          </button>
          <button class="choice" type="button" @click="step = 'select-project'">
            {{ t('user.addRecord.actions.selectProject') }}
          </button>
          <button class="choice choice--primary" type="button" @click="onQuickStart">
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

const emit = defineEmits(['cancel', 'add-project', 'select-project', 'quick-start'])

const step = ref('choice')
const selectedProjectId = ref('')

watch(
  () => props.show,
  (open) => {
    if (!open) return
    step.value = 'choice'
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

function onQuickStart() {
  emit('quick-start')
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
  z-index: var(--z-modal-high);
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
  border-color: rgb(var(--color-icon-add-rgb) / 0.6);
}

.form {
  display: block;
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
  background: var(--color-icon-add);
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
  /* keep for future layout tweaks */
}
</style>
