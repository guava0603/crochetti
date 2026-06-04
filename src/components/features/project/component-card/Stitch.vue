<template>
  <ComponentCardRelatedComponentsSection
    v-model:related-component-ids="relatedComponentIdsModel"
    :is-editing="isEditing"
    :visible="visibilityResolved.relatedComponents !== false"
    :related-component-options="relatedComponentOptions"
    :related-component-names="relatedComponentNames"
  />

  <ComponentCardNotesSection
    :component="component"
    :is-editing="isEditing"
    :visible="visibilityResolved.notes !== false"
    :placeholder="t('addProject.design.stitchNotesPlaceholder')"
  />
</template>

<script setup>
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ComponentCardNotesSection from './ComponentCardNotesSection.vue'
import ComponentCardRelatedComponentsSection from './ComponentCardRelatedComponentsSection.vue'
import { useComponentCardVisibility } from '@/composables/useComponentCardVisibility'
import { useStitchRelatedComponents } from '@/composables/useStitchRelatedComponents'

const { t } = useI18n({ useScope: 'global' })

defineOptions({
  name: 'ComponentCardStitch'
})

const STITCH_VISIBILITY_DEFAULTS = {
  notes: true,
  relatedComponents: true
}

const props = defineProps({
  component: {
    type: Object,
    required: true
  },
  componentList: {
    type: Array,
    default: null
  },
  componentIndex: {
    type: Number,
    default: -1
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
const componentList = computed(() => props.componentList)
const componentIndex = computed(() => props.componentIndex)
const isEditing = computed(() => props.isEditing)
const visibilityResolved = useComponentCardVisibility(
  () => props.visibility,
  STITCH_VISIBILITY_DEFAULTS
)

const {
  stitchOrderN,
  relatedComponentOptions,
  relatedComponentNames,
  relatedComponentIdsModel,
  ensureStitchComponentFields
} = useStitchRelatedComponents(component, componentList, componentIndex)

watch(
  () => props.isEditing,
  (editing) => {
    if (editing) ensureStitchComponentFields()
  }
)

watch(
  () => [props.componentList, props.componentIndex, props.isEditing],
  () => {
    const currentName = String(component.value?.name || '').trim()
    if (currentName) return
    component.value.name = t('addProject.design.stitchDefaultName', { n: stitchOrderN.value })
  },
  { immediate: true }
)
</script>

<style scoped src="./componentCardShared.css"></style>
