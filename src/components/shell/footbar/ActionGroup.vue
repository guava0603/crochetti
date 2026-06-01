<template>
  <div
    class="action-group"
    role="region"
    :aria-label="ariaLabel"
  >
    <div class="action-group__inner button-group" :style="{ justifyContent: justify }">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  ariaLabel: { type: String, required: true },
  justify: {
    type: String,
    default: 'space-between'
  },
  maxWidth: {
    type: [String, Number],
    default: 1000
  }
})

const maxWidthCss = computed(() => {
  if (typeof props.maxWidth === 'number' && Number.isFinite(props.maxWidth)) {
    return `${props.maxWidth}px`
  }
  const raw = String(props.maxWidth || '').trim()
  return raw || '1000px'
})
</script>

<style scoped>
.action-group {
  width: 100%;
  padding: 0.75rem 1.5rem;
}

.action-group__inner {
  max-width: v-bind(maxWidthCss);
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0;
}
</style>
