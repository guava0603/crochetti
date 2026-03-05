<template>
  <button
    type="button"
    class="add-new"
    :class="[`add-new--${size}`, `add-new--${variant}`, { 'add-new--block': block }]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <span class="add-new__icon" aria-hidden="true">+</span>
    <span v-if="label" class="add-new__label">{{ label }}</span>
    <slot />
  </button>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'row', 'icon'].includes(v)
  },
  size: {
    type: String,
    default: 'fab',
    validator: (v) => ['sm', 'md', 'fab'].includes(v)
  },
  block: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])
</script>

<style scoped>
.add-new {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 1px solid var(--color-icon-add);
  background: #fff;
  color: var(--color-icon-add);
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
  font-weight: 600;
}

.add-new:hover {
  background: var(--color-icon-add);
  color: #fff;
}

/* Icon-only, tiny add button (no border / no margin) */
.add-new--icon {
  border: none;
  background: transparent;
  color: var(--color-icon-add);
  padding: 0;
  margin: 0;
  gap: 0;
}

.add-new--icon:hover {
  background: transparent;
  color: #2f9e6f;
}

.add-new--icon .add-new__icon {
  font-size: 1.25rem;
  line-height: 1;
}

.add-new:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Floating add-row style */
.add-new--fab {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  padding: 0;
  font-size: 1.2rem;
  line-height: 1;
}

/* Match legacy `.btn-add-row` styling from crochet-table.css */
.add-new--row {
  width: 100%;
  padding: 0.7rem;
  background: rgb(var(--color-icon-add-rgb) / 0.12);
  border: 1px dashed var(--color-icon-add);
  border-radius: 8px;
  font-size: 1.2rem;
  color: var(--color-icon-add);
  margin-top: 0.5rem;
}

.add-new--row:hover {
  background: rgb(var(--color-icon-add-rgb) / 0.2);
  color: var(--color-icon-add);
}

.add-new--sm {
  padding: 0;
  border-radius: 6px;
  font-size: 0.75rem;
}

.add-new--md {
  padding: 0.45rem 0.9rem;
  border-radius: 10px;
  font-size: 0.875rem;
}

.add-new__icon {
  font-weight: 900;
}

.add-new__label {
  font-weight: 600;
}

.add-new--block {
  width: 100%;
}
</style>
