<template>
  <div class="text-count text-count--single-line" :class="wrapperClass">
    <input
      ref="inputRef"
      v-bind="inputAttrs"
      :class="controlClasses"
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      @input="handleInput"
      @blur="$emit('blur', $event)"
      @focus="$emit('focus', $event)"
    />

    <div
      v-if="showCounter"
      class="text-count__counter"
      :class="{ 'text-count__counter--error': isOverLimit }"
      aria-live="polite"
    >
      {{ count }}/{{ limit }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref, toRefs, useAttrs } from 'vue'
import { useTextCount } from '@/composables/useTextCount'

defineOptions({
  name: 'TextInput',
  inheritAttrs: false
})

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  limit: {
    type: Number,
    default: null
  },
  countMode: {
    type: String,
    default: 'wordsLike',
    validator: (v) => ['wordsLike', 'chars'].includes(v)
  },
  controlClass: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus'])

const attrs = useAttrs()
const inputRef = ref(null)

const { limit, countMode } = toRefs(props)
const { count, showCounter, isOverLimit } = useTextCount(
  () => props.modelValue,
  () => ({ limit: limit.value, countMode: countMode.value })
)

const inputAttrs = computed(() => {
  const out = { ...attrs }
  delete out.class
  return out
})

const wrapperClass = computed(() => attrs.class)

const controlClasses = computed(() => {
  const extra = String(props.controlClass || '').trim()
  const withCounter = showCounter.value ? 'text-count__control--with-counter' : ''
  return ['text-input__control', extra, withCounter].filter(Boolean)
})

function handleInput(e) {
  emit('update:modelValue', e?.target?.value ?? '')
}

function focus() {
  inputRef.value?.focus?.()
}

defineExpose({ focus, inputRef, count, isOverLimit, showCounter })
</script>
