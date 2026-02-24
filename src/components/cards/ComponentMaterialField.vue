<template>
  <div class="component-material-field" :class="variant ? `component-material-field--${variant}` : ''">
    <div v-if="label" class="component-material-field__label">{{ label }}</div>

    <div class="component-material-input-list">
      <div
        v-for="(item, idx) in items"
        :key="itemKey ? itemKey(item, idx) : idx"
        :class="rowClass"
      >
        <SelectionInputCombineList
          v-if="inputType === 'selection'"
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

        <ButtonDelete
          v-if="removable && isNonEmpty(item)"
          variant="small"
          type="deleteItem"
          @click="$emit('remove', idx)"
        />
      </div>
    </div>

    <AddNew v-if="canAddComputed" variant="icon" @click="$emit('add')" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AddNew from '@/components/buttons/AddNew.vue'
import ButtonDelete from '@/components/buttons/ButtonDelete.vue'
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
    validator: (v) => ['selection', 'textarea'].includes(v)
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

function isNonEmpty(item) {
  return getTextValue(item).trim().length > 0
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
  gap: 0.5rem;
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
  gap: 0.5rem;
}

.component-material-input-row {
  display: flex;
  gap: 0.2rem;
  align-items: center;
}

.list-item {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  align-items: center;
}

.list-item-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  font-family: inherit;
  line-height: 1.25rem;
  resize: vertical;
}

.list-item-input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.1);
}
</style>
