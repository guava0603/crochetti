<template>
  <ComponentCardMaterialsSection
    :component="component"
    :is-editing="isEditing"
    :visible="visibilityResolved.materials !== false"
    :has-material-options="hasMaterialOptions"
    :hook-suggestions="hookSuggestions"
    :yarn-options="yarnOptions"
    :resolved-yarn-list="resolvedYarnList"
    :resolved-hook-list="resolvedHookList"
  />

  <ComponentCardComponentCrochet
    v-if="visibilityResolved.table !== false"
    v-model="rowListModel"
    v-model:row-groups="rowGroupsModel"
    :is-editing="isEditing"
  />

  <ComponentCardNotesSection
    :component="component"
    :is-editing="isEditing"
    :visible="visibilityResolved.notes !== false"
    :placeholder="t('common.noteDescriptionPlaceholder')"
  />

  <ComponentCardCountSection
    :is-editing="isEditing"
    :count-draft="countDraft"
    @update:count-draft="handleUpdateCountDraft"
    @commit-count="commitCountDraft"
  />
</template>

<script setup>
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ComponentCardComponentCrochet from './ComponentCrochet.vue'
import ComponentCardNotesSection from './ComponentCardNotesSection.vue'
import ComponentCardMaterialsSection from './ComponentCardMaterialsSection.vue'
import ComponentCardCountSection from './ComponentCardCountSection.vue'
import { useComponentCardVisibility } from '@/composables/useComponentCardVisibility'
import { useComponentCardMaterials } from '@/composables/useComponentCardMaterials'
import { useComponentCardCount } from '@/composables/useComponentCardCount'

const { t } = useI18n({ useScope: 'global' })

defineOptions({
  name: 'ComponentCardComponent'
})

const COMPONENT_VISIBILITY_DEFAULTS = {
  table: true,
  notes: true,
  materials: true
}

const props = defineProps({
  component: {
    type: Object,
    required: true
  },
  materials: {
    type: Object,
    default: null
  },
  isEditing: {
    type: Boolean,
    default: false
  },
  visibility: {
    type: Object,
    default: null
  }
})

const component = computed(() => props.component)
const isEditing = computed(() => props.isEditing)
const visibilityResolved = useComponentCardVisibility(
  () => props.visibility,
  COMPONENT_VISIBILITY_DEFAULTS
)

const {
  resolvedYarnList,
  resolvedHookList,
  yarnOptions,
  hookSuggestions,
  hasMaterialOptions
} = useComponentCardMaterials(
  () => props.component,
  () => props.materials
)

const { countDraft, handleUpdateCountDraft, commitCountDraft } = useComponentCardCount(() => props.component)

function ensureRowTableFields() {
  if (!component.value || typeof component.value !== 'object') return

  if (!component.value.content || typeof component.value.content !== 'object') {
    component.value.content = {}
  }

  if (!Array.isArray(component.value.content.row_list)) {
    if (Array.isArray(component.value.row_list)) {
      component.value.content.row_list = component.value.row_list
    } else {
      component.value.content.row_list = []
    }
  }

  if (!Array.isArray(component.value.content.row_groups)) {
    if (Array.isArray(component.value.row_groups)) {
      component.value.content.row_groups = component.value.row_groups
    } else {
      component.value.content.row_groups = []
    }
  }
}

watch(
  () => props.component,
  () => ensureRowTableFields(),
  { immediate: true }
)

const rowListModel = computed({
  get() {
    const list = component.value?.content?.row_list
    return Array.isArray(list) ? list : []
  },
  set(next) {
    ensureRowTableFields()
    component.value.content.row_list = Array.isArray(next) ? next : []
  }
})

const rowGroupsModel = computed({
  get() {
    const list = component.value?.content?.row_groups
    return Array.isArray(list) ? list : []
  },
  set(next) {
    ensureRowTableFields()
    component.value.content.row_groups = Array.isArray(next) ? next : []
  }
})

ensureRowTableFields()
</script>

<style scoped src="./componentCardShared.css"></style>
