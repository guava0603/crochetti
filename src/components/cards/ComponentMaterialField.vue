<template>
  <div class="component-material-field" :class="variant ? `component-material-field--${variant}` : ''">
    <div v-if="label" class="component-material-field__label">{{ label }}</div>

    <div class="component-material-input-list">
      <div
        v-for="(item, idx) in items"
        :key="itemKey ? itemKey(item, idx) : idx"
        :class="rowClass"
      >
        <div class="component-material-input-cell">
          <SelectionInput
            v-if="inputType === 'dropdown'"
            :model-value="getTextValue(item)"
            :placeholder="placeholder"
            :options="options"
            @update:modelValue="(v) => updateTextAt(idx, v)"
          />

          <SelectionInputCombineList
            v-else-if="inputType === 'selection'"
            :model-value="getTextValue(item)"
            :placeholder="placeholder"
            :suggestions="suggestions"
            @update:modelValue="(v) => updateTextAt(idx, v)"
            @blur="() => $emit('item-blur', idx)"
          />

          <textarea
            v-else
            :value="getTextValue(item)"
            :placeholder="placeholder"
            :class="inputClass || undefined"
            :rows="rows"
            @input="(e) => updateTextAt(idx, e?.target?.value ?? '')"
            @blur="() => $emit('item-blur', idx)"
          />
        </div>
      </div>
    </div>

    <AddNew v-if="canAddComputed" variant="row" size="md" @click="$emit('add')" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AddNew from '@/components/buttons/AddNew.vue'
import SelectionInput from '@/components/tools/SelectionInput.vue'
import SelectionInputCombineList from '@/components/Input/SelectionInputCombineList.vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  variant: {
    type: String,
    default: 'material',
    validator: (v) => ['material', 'notes'].includes(v)
  },
  inputType: {
    type: String,
    default: 'selection',
    validator: (v) => ['selection', 'textarea', 'dropdown'].includes(v)
  },
  label: {
    type: String,
    default: ''
  },
  removable: {
    type: Boolean,
    default: true
  },
  placeholder: {
    type: String,
    default: ''
  },
  suggestions: {
    type: Array,
    default: () => []
  },
  options: {
    type: Array,
    default: () => []
  },
  rows: {
    type: [Number, String],
    default: 2
  },
  inputClass: {
    type: String,
    default: ''
  },
  getText: {
    type: Function,
    default: (item) => item
  },
  setText: {
    type: Function,
    default: (_item, nextText) => nextText
  },
  itemKey: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['add', 'remove', 'item-blur', 'update:items'])

function getTextValue(item) {
  return String((props.getText ? props.getText(item) : item) ?? '')
}

function updateTextAt(idx, nextText) {
  const list = Array.isArray(props.items) ? props.items : []
  const next = list.slice()
  next[idx] = props.setText ? props.setText(next[idx], nextText) : nextText
  emit('update:items', next)
}

const rowClass = computed(() => {
  return props.variant === 'notes' ? 'list-item' : 'component-material-input-row'
})

const canAddComputed = computed(() => {
  const list = Array.isArray(props.items) ? props.items : []
  if (list.length === 0) return true
  return getTextValue(list[list.length - 1]).trim().length > 0
})
</script>

<style scoped>
.component-material-field {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.75rem;
}

.component-material-field__label {
  font-size: 0.85rem;
  font-weight: 800;
  color: #6b7280;
}

.component-material-input-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.3rem;
}

.component-material-input-row {
  display: flex;
  align-items: stretch;
}

.list-item {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.component-material-input-cell {
  position: relative;
  flex: 1;
  min-width: 0;
}

.component-material-input-delete {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
  line-height: 0;
}

.component-material-input-cell :deep(.btn-delete__icon) {
  cursor: pointer;
}

.list-item-input {
  flex: 1;
  min-width: 0;
}
</style>
