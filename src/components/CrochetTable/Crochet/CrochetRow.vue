<template>
  <div class="row-main">
    <div
      class="row"
      :class="rowRootClasses"
      @click="handleRowNumberClick"
    >
      <div class="row-table">
        <div class="row-table-cell row-number">
          <strong :class="{ clickable: isEditing }">
            {{ rowNumberDisplay }}
          </strong>
        </div>

        <div
          class="row-table-cell row-stitches"
          :class="rowStitchesClasses"
          @click="handleRowStitchesClick"
        >
          <CrochetDisplay
            ref="crochetDisplayRef"
            :table-type="tableType"
            :stitch-node-list="props.row.content.stitch_node_list"
            @update:stitchNodeList="handleUpdateContent"
            @selection-change="handleDisplaySelectionChange"
          />
        </div>

        <div class="row-table-cell row-generate" :class="[validationClass, { 'view-mode': tableType !== 'edit' }]">
          {{ props.row.content.generate }}
        </div>
      </div>
    </div>
  </div>

  <div v-if="props.row.count > 1" class="repeat-reminder">
    {{ t('common.repeatDo') }}{{ props.row.count }}{{ t('common.rowUnit') }}
  </div>
  <div v-else-if="props.groupReminder" class="repeat-reminder">
    {{ t('common.repeatRowGroup', props.groupReminder) }}
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CrochetDisplay from './CrochetDisplay.vue'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  row: {
    type: Object,
    required: true
  },
  groupReminder: {
    type: Object,
    default: null
  },
  previousGenerate: {
    type: Number,
    default: 0
  },
  isEditing: {
    type: Boolean,
    default: false
  },
  tableType: {
    type: String,
    required: true,
    validator: (value) => ['edit', 'record', 'view'].includes(value)
  }
})

const emit = defineEmits([
  'update:row',
  'edit-row',
  'selection-change',
  'open-edit-row'
])

const crochetDisplayRef = ref(null)
const callDisplay = (method, ...args) => {
  const inst = crochetDisplayRef.value
  const fn = inst?.[method]
  if (typeof fn !== 'function') return
  return fn.apply(inst, args)
}

const handleDisplaySelectionChange = (nextSelectionList) => {
  const safeList = Array.isArray(nextSelectionList) ? nextSelectionList : []
  emit('selection-change', props.row.row_index, safeList)
}

const rowRootClasses = computed(() => {
  return {
    'row-editor': props.isEditing,
    'row-card': !props.isEditing,
    clickable: !props.isEditing && props.tableType === 'edit'
  }
})

const rowStitchesClasses = computed(() => {
  return {
    editable: props.isEditing,
    'record-mode': props.tableType === 'record'
  }
})

const handleRowStitchesClick = (event) => {
  if (props.tableType !== 'edit') return
  if (event && typeof event.stopPropagation === 'function') {
    event.stopPropagation()
  }
  emit('edit-row', props.row.row_index)
}

const handleRowNumberClick = () => {
  emit('open-edit-row', props.row.row_index)
}

const clearSelection = () => {
  callDisplay('clearSelection')
}

const setSelection = (nextSelectionList) => {
  callDisplay('setSelection', nextSelectionList)
}

const addInnerSelection = (nextSelection) => {
  callDisplay('addInnerSelection', nextSelection)
}

// Validate if row consume matches previous row generate
const validationClass = computed(() => {
  if (props.previousGenerate === 0) return 'valid'

  if (props.row.content.consume < props.previousGenerate) return 'less'
  if (props.row.content.consume === props.previousGenerate) return 'valid'
  return 'invalid'
})

// Get row number display
const rowNumberDisplay = computed(() => `${props.row.row_index}`)

const addStitch = (payload) => {
  callDisplay('addStitch', payload)
}

const addBundle = (bundle) => {
  callDisplay('addBundle', bundle)
}

const deleteSelected = () => {
  callDisplay('deleteSelected')
}

const createPatternFromRange = (count) => {
  callDisplay('createPatternFromRange', count)
}

const updateNodeCount = (count) => {
  callDisplay('updateNodeCount', count)
}

const changeSelectedStitch = (payload) => {
  callDisplay('changeSelectedStitch', payload)
}

const updateNodePattern = (pattern) => {
  callDisplay('updateNodePattern', pattern)
}

const replaceSelectedNode = (nextNode) => {
  callDisplay('replaceSelectedNode', nextNode)
}

const setStitchNodeList = (nextList) => {
  callDisplay('setStitchNodeList', nextList)
}

const createPatternFromWholeRow = (count) => {
  callDisplay('createPatternFromWholeRow', count)
}

const handleUpdateContent = (updatedContent) => {
  if (!props.isEditing || props.tableType !== 'edit') return
  emit('update:row', {
    ...props.row,
    content: updatedContent
  })
}

defineExpose({
  addStitch,
  addBundle,
  clearSelection,
  setSelection,
  addInnerSelection,
  deleteSelected,
  createPatternFromRange,
  createPatternFromWholeRow,
  updateNodeCount,
  changeSelectedStitch,
  updateNodePattern,
  replaceSelectedNode,
  setStitchNodeList
})
</script>
  if (!props.isEditing || props.tableType !== 'edit') return

