<template>
  <div class="row-main">
    <slot name="leading" />
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
          @click.stop="handleRowClick"
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
  groupStart: {
    type: Boolean,
    default: false
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

const handleRowClick = () => {
  if (props.tableType !== 'edit') return
  emit('edit-row', props.row.row_index)
}

const handleRowNumberClick = () => {
  emit('open-edit-row', props.row.row_index)
}

const clearSelection = () => {
  if (crochetDisplayRef.value && typeof crochetDisplayRef.value.clearSelection === 'function') {
    crochetDisplayRef.value.clearSelection()
  }
}

const setSelection = (nextSelectionList) => {
  if (crochetDisplayRef.value && typeof crochetDisplayRef.value.setSelection === 'function') {
    crochetDisplayRef.value.setSelection(nextSelectionList)
  }
}

const addInnerSelection = (nextSelection) => {
  if (crochetDisplayRef.value && typeof crochetDisplayRef.value.addInnerSelection === 'function') {
    crochetDisplayRef.value.addInnerSelection(nextSelection)
  }
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
  if (!crochetDisplayRef.value) return
  crochetDisplayRef.value.addStitch(payload)
}

const addBundle = (bundle) => {
  if (crochetDisplayRef.value) {
    crochetDisplayRef.value.addBundle(bundle)
  }
}

const deleteSelected = () => {
  if (crochetDisplayRef.value && typeof crochetDisplayRef.value.deleteSelected === 'function') {
    crochetDisplayRef.value.deleteSelected()
  }
}


const createPatternFromRange = (count) => {
  if (crochetDisplayRef.value && typeof crochetDisplayRef.value.createPatternFromRange === 'function') {
    crochetDisplayRef.value.createPatternFromRange(count)
  }
}

const updateNodeCount = (count) => {
  if (crochetDisplayRef.value && typeof crochetDisplayRef.value.updateNodeCount === 'function') {
    crochetDisplayRef.value.updateNodeCount(count)
  }
}

const changeSelectedStitch = (stitchId) => {
  if (crochetDisplayRef.value && typeof crochetDisplayRef.value.changeSelectedStitch === 'function') {
    crochetDisplayRef.value.changeSelectedStitch(stitchId)
  }
}

const updateNodePattern = (pattern) => {
  if (crochetDisplayRef.value && typeof crochetDisplayRef.value.updateNodePattern === 'function') {
    crochetDisplayRef.value.updateNodePattern(pattern)
  }
}

const replaceSelectedNode = (nextNode) => {
  if (crochetDisplayRef.value && typeof crochetDisplayRef.value.replaceSelectedNode === 'function') {
    crochetDisplayRef.value.replaceSelectedNode(nextNode)
  }
}

const setStitchNodeList = (nextList) => {
  if (crochetDisplayRef.value && typeof crochetDisplayRef.value.setStitchNodeList === 'function') {
    crochetDisplayRef.value.setStitchNodeList(nextList)
  }
}

const createPatternFromWholeRow = (count) => {
  if (crochetDisplayRef.value && typeof crochetDisplayRef.value.createPatternFromWholeRow === 'function') {
    crochetDisplayRef.value.createPatternFromWholeRow(count)
  }
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

