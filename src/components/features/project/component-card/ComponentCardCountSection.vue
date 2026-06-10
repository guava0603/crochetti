<template>
  <div v-if="isEditing" class="subsection component-count-subsection">
    <div class="component-count-editor">
      <span class="component-count-text">{{ t('project.makeCountLabel') }}</span>
      <div class="component-count-number">
        <InputNumber
          v-model="countModel"
          size="sm"
          :min="1"
          :max="99"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from '@/components/shared/inputs/InputNumber.vue'
import {
  clampComponentCount,
  ensureComponentCountOnComponent
} from '@/composables/useComponentCardCount'

defineOptions({
  name: 'ComponentCardCountSection'
})

const props = defineProps({
  component: {
    type: Object,
    required: true
  },
  isEditing: {
    type: Boolean,
    default: false
  }
})

const { t } = useI18n({ useScope: 'global' })

watch(
  () => props.component,
  (component) => ensureComponentCountOnComponent(component),
  { immediate: true }
)

const countModel = computed({
  get() {
    const component = props.component
    if (!component || typeof component !== 'object') return 1
    if (component.count == null) return 1
    return clampComponentCount(component.count)
  },
  set(value) {
    const component = props.component
    if (!component || typeof component !== 'object') return
    component.count = clampComponentCount(value)
  }
})
</script>

<style scoped src="./componentCardShared.css"></style>
