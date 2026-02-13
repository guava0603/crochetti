<template>
  <button
    class="show-btn"
    type="button"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :title="title || ariaLabel"
    @click="$emit('click')"
  >
    <svg
      class="show-icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  </button>
</template>

<script setup>
defineProps({
  ariaLabel: {
    type: String,
    default: 'Show'
  },
  title: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])
</script>

<style scoped>
.show-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #111827;
  cursor: pointer;
  transition: background 0.15s, transform 0.05s, opacity 0.15s;
}

.show-btn:hover {
  background: #f9fafb;
}

.show-btn:active {
  transform: translateY(1px);
}

.show-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.show-icon {
  width: 20px;
  height: 20px;
}
</style>
