<template>
  <div class="limited-textarea">
    <textarea
      ref="textareaRef"
      v-bind="textareaAttrs"
      :class="[attrs.class, 'limited-textarea__control', { 'limited-textarea__control--with-counter': showCounter }]"
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
      class="limited-textarea__counter"
      :class="{ 'limited-textarea__counter--error': isOverLimit }"
      aria-live="polite"
    >
      {{ count }}/{{ limit }}
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, useAttrs, watch } from 'vue'
import { countChars, countWordsLike } from '@/utils/textCount'

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
  }
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus'])

const attrs = useAttrs()
const textareaRef = ref(null)

const textareaAttrs = computed(() => {
  const out = { ...attrs }
  delete out.class
  return out
})

const count = computed(() => {
  return props.countMode === 'chars'
    ? countChars(props.modelValue)
    : countWordsLike(props.modelValue)
})

const showCounter = computed(() => Number.isFinite(Number(props.limit)) && Number(props.limit) > 0)
const isOverLimit = computed(() => showCounter.value && count.value > Number(props.limit))

function resizeToContent(el) {
  if (!props.autosize) return
  const target = el || textareaRef.value
  if (!target) return

  // Reset first so shrink works.
  target.style.height = 'auto'
  target.style.height = `${target.scrollHeight}px`
}

function handleInput(e) {
  const next = e?.target?.value ?? ''
  // Don't enforce; just report. Parents decide whether to block submit.
  // Still trim nothing here to avoid surprising edits.
  emit('update:modelValue', next)
  // Resize immediately for snappy UX.
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
</script>

<style scoped>
.limited-textarea {
  position: relative;
  width: 100%;
}

.limited-textarea__control {
  width: 100%;
  box-sizing: border-box;
  resize: none;
  overflow: hidden;
}

.limited-textarea__control--with-counter {
  padding-bottom: 2rem;
}

.limited-textarea__counter {
  position: absolute;
  right: 0.85rem;
  bottom: 0.6rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-font-invisible);
  opacity: 0.85;
  pointer-events: none;
}

.limited-textarea__counter--error {
  color: #b91c1c;
  opacity: 0.95;
}
</style>
