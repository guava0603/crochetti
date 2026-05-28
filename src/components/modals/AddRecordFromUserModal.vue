<template>
  <ModalPromptShell
    :show="show"
    :title="titleText"
    z-level="high"
    @close="$emit('cancel')"
  >
    <template v-if="step === 'choice'">
      <p class="modal-prompt__message">{{ t('user.addRecord.message') }}</p>

      <div class="modal-choice-list">
        <div
          class="modal-choice"
          role="button"
          tabindex="0"
          @click="$emit('add-project')"
          @keydown.enter.prevent="$emit('add-project')"
          @keydown.space.prevent="$emit('add-project')"
        >
          {{ t('user.addRecord.actions.addProject') }}
        </div>
        <div
          class="modal-choice"
          role="button"
          tabindex="0"
          @click="step = 'select-project'"
          @keydown.enter.prevent="step = 'select-project'"
          @keydown.space.prevent="step = 'select-project'"
        >
          {{ t('user.addRecord.actions.selectProject') }}
        </div>
        <div
          class="modal-choice modal-choice--primary"
          role="button"
          tabindex="0"
          @click="onQuickStart"
          @keydown.enter.prevent="onQuickStart"
          @keydown.space.prevent="onQuickStart"
        >
          {{ t('user.addRecord.actions.quickAddProject', { stitch: t('crochet.stitches.singleCrochet') }) }}
        </div>
      </div>
    </template>

    <template v-else-if="step === 'select-project'">
      <div class="modal-form-group">
        <label>{{ t('user.addRecord.selectProjectLabel') }}</label>
        <select v-model="selectedProjectId" class="modal-form-select" :disabled="loading || !projects.length">
          <option v-for="p in projects" :key="p.id" :value="p.id">
            {{ p.name || t('user.addRecord.untitledProject') }}
          </option>
        </select>
        <p v-if="!projects.length" class="modal-form-hint">{{ t('user.addRecord.noProjects') }}</p>
      </div>
    </template>

    <template #footer>
      <template v-if="step === 'choice'">
        <button type="button" class="modal-btn-cancel" @click="$emit('cancel')">
          {{ t('common.cancel') }}
        </button>
      </template>
      <template v-else-if="step === 'select-project'">
        <button type="button" class="modal-btn-cancel" :disabled="loading" @click="step = 'choice'">
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="modal-btn-confirm"
          :disabled="loading || !projects.length || !selectedProjectId"
          @click="$emit('select-project', selectedProjectId)"
        >
          {{ t('user.addRecord.startRecord') }}
        </button>
      </template>
    </template>
  </ModalPromptShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ModalPromptShell from '@/components/modals/ModalShell/ModalPromptShell.vue'

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
