<template>
  <div class="filter-group" role="group" :aria-label="ariaLabel">
    <button
      v-for="(opt, i) in normalizedOptions"
      :key="String(opt.value)"
      type="button"
      class="filter-group__btn"
      :class="{
        'filter-group__btn--active': selectedSet.has(opt.value),
        'filter-group__btn--first': i === 0,
        'filter-group__btn--last': i === normalizedOptions.length - 1,
      }"
      :aria-pressed="selectedSet.has(opt.value)"
      @click="toggle(opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: null
  },
  options: {
    type: Array,
    required: true
  },
  ariaLabel: {
    type: String,
    default: 'filters'
  },
  defaultSelectAll: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const normalizedOptions = computed(() => {
  const raw = Array.isArray(props.options) ? props.options : []
  return raw
    .map((o) => {
      if (o == null) return null
      if (typeof o === 'string' || typeof o === 'number') {
        return { label: String(o), value: o }
      }
      if (typeof o === 'object') {
        const label = 'label' in o ? String(o.label) : String(o.value)
        return { label, value: o.value }
      }
      return null
    })
    .filter(Boolean)
})

const allValues = computed(() => normalizedOptions.value.map((o) => o.value))

const selected = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []))
const selectedSet = computed(() => new Set(selected.value))

const emitValue = (next) => {
  emit('update:modelValue', next)
  emit('change', next)
}

const toggle = (value) => {
  const set = new Set(selected.value)
  if (set.has(value)) set.delete(value)
  else set.add(value)
  emitValue(Array.from(set))
}

onMounted(() => {
  if (!props.defaultSelectAll) return
  const current = Array.isArray(props.modelValue) ? props.modelValue : null
  if (current && current.length) return
  if (!allValues.value.length) return
  emitValue([...allValues.value])
})
</script>

<style scoped>
.filter-group {
  display: inline-flex;
  align-items: stretch;
  border-radius: 999px;
  overflow: hidden;
  border: 0.0625rem solid rgba(90, 82, 75, 0.28);
}

.filter-group__btn {
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0.55rem 0.9rem;
  font-weight: 900;
  font-size: 0.8rem;
  line-height: 1;
  color: rgba(90, 82, 75, 0.9);
  cursor: pointer;
  user-select: none;
}

.filter-group__btn + .filter-group__btn {
  border-left: 0.0625rem solid rgba(90, 82, 75, 0.22);
}

.filter-group__btn--active {
  background: rgba(138, 118, 80, 0.16);
  color: rgba(90, 82, 75, 1);
}

.filter-group__btn:focus-visible {
  outline: 0.125rem solid rgba(66, 185, 131, 0.55);
  outline-offset: -0.125rem;
}
</style>
