<template>
  <div v-if="show" class="modal-overlay" @click="$emit('cancel')">
    <div class="modal-content" @click.stop>
      <h3 v-if="title" class="modal-title">{{ title }}</h3>

      <div class="option-list" role="listbox">
        <button
          v-for="option in normalizedOptions"
          :key="option.id"
          type="button"
          class="option-item"
          role="option"
          @click="$emit('select', option.id)"
        >
          <span class="option-item__label">{{ option.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  }
})

defineEmits(['select', 'cancel'])

const normalizedOptions = computed(() => {
  const arr = Array.isArray(props.options) ? props.options : []
  return arr
    .map((o) => ({
      id: o?.id != null ? String(o.id) : '',
      label: o?.label != null ? String(o.label) : ''
    }))
    .filter((o) => o.id && o.label)
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
}

.modal-content {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  max-width: 520px;
  width: 92%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-title {
  margin: 0 0 0.75rem 0;
  color: #111827;
  font-size: 1.25rem;
}

.option-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-item {
  width: 100%;
  text-align: left;
  border: 1px solid rgba(209, 213, 219, 0.9);
  background: #fff;
  border-radius: 10px;
  padding: 0.75rem 0.9rem;
  cursor: pointer;
  transition: background 0.12s ease, transform 0.12s ease, border-color 0.12s ease;
}

.option-item:hover {
  background: rgba(243, 244, 246, 0.8);
}

.option-item:active {
  transform: translateY(1px);
}

.option-item__label {
  font-weight: 700;
  color: #111827;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>
