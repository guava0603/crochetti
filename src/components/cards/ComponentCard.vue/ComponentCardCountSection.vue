<template>
  <div v-if="isEditing" class="subsection component-count-subsection">
    <div class="component-count-editor">
      <span class="component-count-text">{{ t('project.makeCountLabel') }}</span>
      <div class="component-count-number">
        <InputNumber
          :model-value="countDraft"
          :auto-focus="false"
          size="sm"
          :min="1"
          :max="99"
          @update:model-value="(v) => emit('update:countDraft', v)"
          @close="emit('commitCount')"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import InputNumber from '@/components/Input/InputNumber.vue'

defineOptions({
  name: 'ComponentCardCountSection'
})

defineProps({
  isEditing: {
    type: Boolean,
    default: false
  },
  countDraft: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['update:countDraft', 'commitCount'])

const { t } = useI18n({ useScope: 'global' })
</script>

<style scoped src="./componentCardShared.css"></style>
