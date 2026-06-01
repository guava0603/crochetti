<template>
  <FormSubsection
    v-if="visible && isEditing"
    wrapper-class="subsection"
    kind="multi-select"
    :title="t('addProject.design.relatedComponentsLabel')"
    v-model="relatedComponentIds"
    :options="relatedComponentOptions"
    :placeholder="t('addProject.design.relatedComponentsPlaceholder')"
    :aria-label="t('addProject.design.relatedComponentsLabel')"
  />

  <FormSubsection
    v-else-if="visible && relatedComponentNames.length"
    wrapper-class="view-section view-section--related"
    kind="slot"
    :show-header="false"
  >
    <div class="related-components-line">
      <span class="related-components-label">{{ t('project.stitchCard.seamPartsLabel') }}</span>
      <span class="related-components-value">{{ relatedComponentNames.join('、') }}</span>
    </div>
  </FormSubsection>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import FormSubsection from '@/components/features/add-project/form/FormSubsection.vue'

defineOptions({
  name: 'ComponentCardRelatedComponentsSection'
})

defineProps({
  isEditing: {
    type: Boolean,
    default: false
  },
  visible: {
    type: Boolean,
    default: true
  },
  relatedComponentOptions: {
    type: Array,
    default: () => []
  },
  relatedComponentNames: {
    type: Array,
    default: () => []
  }
})

const relatedComponentIds = defineModel('relatedComponentIds', {
  type: Array,
  default: () => []
})

const { t } = useI18n({ useScope: 'global' })
</script>

<style scoped src="./componentCardShared.css"></style>
