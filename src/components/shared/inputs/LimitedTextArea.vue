<template>
  <div class="text-count text-count--multiline" :class="wrapperClass">
    <textarea
      ref="textareaRef"
      v-bind="textareaAttrs"
      :class="controlClasses"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
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
import { computed, nextTick, onMounted, ref, toRefs, useAttrs, watch } from 'vue'
import { useTextCount } from '@/composables/useTextCount'

defineOptions({
  name: 'LimitedTextArea',
  inheritAttrs: false
})

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
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
  placeholder: {
    type: String,
    default: ''
  },
  rows: {
    type: [Number, String],
    default: 3
  },
  autosize: {
    type: Boolean,
    default: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  controlClass: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus'])

const attrs = useAttrs()
const textareaRef = ref(null)

const { limit, countMode } = toRefs(props)
const { count, showCounter, isOverLimit } = useTextCount(
  () => props.modelValue,
  () => ({ limit: limit.value, countMode: countMode.value })
)

const textareaAttrs = computed(() => {
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

function resizeToContent(el) {
  if (!props.autosize) return
  const target = el || textareaRef.value
  if (!target) return

  target.style.height = 'auto'
  target.style.height = `${target.scrollHeight}px`
}

function handleInput(e) {
  const next = e?.target?.value ?? ''
  emit('update:modelValue', next)
  resizeToContent(e?.target)
}

onMounted(() => {
  void nextTick(() => resizeToContent())
})

watch(
  () => props.modelValue,
  () => {
    void nextTick(() => resizeToContent())
  }
)

watch(
  () => props.rows,
  () => {
    void nextTick(() => resizeToContent())
  }
)

defineExpose({ textareaRef, count, isOverLimit, showCounter })
</script>

<style scoped>
.text-count--multiline {
  width: 100%;
}

.text-count--multiline :deep(textarea.text-input__control) {
  resize: none;
  overflow: hidden;
  line-height: 1.5;
}
</style>
