<template>
  <FormSubsectionList
    v-if="visible && isEditing && hasMaterialOptions"
    wrapper-class="subsection component-metadata-subsection"
    kind="component-material-options"
    :title="t('project.componentMetadata.title')"
    :show-hook="true"
    :show-needle="false"
    v-model:hook="component.hook"
    v-model:needle="component.needle"
    v-model:yarn="component.yarn"
    :component-hook-suggestions="hookSuggestions"
    :component-yarn-options="yarnOptions"
  />

  <FormSubsection
    v-if="visible && !isEditing && (resolvedYarnList.length > 0 || resolvedHookList.length > 0)"
    wrapper-class="view-section"
    kind="slot"
    :show-header="false"
  >
    <div class="component-metadata-view">
      <div v-if="resolvedHookList.length > 0" class="component-metadata-row">
        <span class="component-metadata-label">{{ t('project.componentMetadata.hook') }}</span>
        <span class="component-metadata-value summary-highlight">{{ resolvedHookList.join('\n') }}</span>
      </div>
      <div v-if="resolvedYarnList.length > 0" class="component-metadata-row">
        <span class="component-metadata-label">{{ t('project.componentMetadata.yarn') }}</span>
        <span class="component-metadata-value summary-highlight">{{ resolvedYarnList.join('\n') }}</span>
      </div>
    </div>
  </FormSubsection>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import FormSubsection from '@/components/features/add-project/form/FormSubsection.vue'
import FormSubsectionList from '@/components/features/add-project/form/FormSubsectionList.vue'

defineOptions({
  name: 'ComponentCardMaterialsSection'
})

defineProps({
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
  hasMaterialOptions: {
    type: Boolean,
    default: false
  },
  hookSuggestions: {
    type: Array,
    default: () => []
  },
  yarnOptions: {
    type: Array,
    default: () => []
  },
  resolvedYarnList: {
    type: Array,
    default: () => []
  },
  resolvedHookList: {
    type: Array,
    default: () => []
  }
})

const { t } = useI18n({ useScope: 'global' })
</script>

<style scoped src="./componentCardShared.css"></style>
