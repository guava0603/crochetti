<template>
  <FormSubsection
    v-if="visible && isEditing"
    wrapper-class="subsection"
    kind="notes"
    :title="t('common.notes')"
    v-model="component.notes"
    :placeholder="placeholder"
    :notes-rows="2"
    notes-input-class="list-item-input"
  />
  <FormSubsection
    v-else-if="visible && displayNotes.length > 0"
    wrapper-class="view-section"
    kind="slot"
    :show-header="false"
  >
    <ul class="view-list">
      <li v-for="(note, nIndex) in displayNotes" :key="nIndex">
        {{ note }}
      </li>
    </ul>
  </FormSubsection>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FormSubsection from '@/components/AddProject/FormSubsection.vue'
import { componentNotesDisplayLines } from '@/utils/componentCardNotes'

defineOptions({
  name: 'ComponentCardNotesSection'
})

const props = defineProps({
  component: {
    type: Object,
    required: true
  },
  isEditing: {
    type: Boolean,
    default: false
  },
  visible: {
    type: Boolean,
    default: true
  },
  placeholder: {
    type: String,
    required: true
  }
})

const { t } = useI18n({ useScope: 'global' })

const displayNotes = computed(() => componentNotesDisplayLines(props.component?.notes))
</script>

<style scoped src="./componentCardShared.css"></style>
