<template>
  <div
    :class="buttonClass"
    :disabled="disabled"
    @click="handleClick"
  >
    <img class="btn-delete__icon" :src="emptyIconUrl" alt="" aria-hidden="true" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { openConfirmation } from '@/services/ui/confirmation'
import emptyIconUrl from '@/assets/image/settings/086__empty.svg?url'

const props = defineProps({
  disabled: { type: Boolean, default: false },
  type: {
    type: [String, Object],
    default: 'deleteItem'
  },
  variant: {
    type: String,
    default: 'default'
  }
})

const emit = defineEmits(['click'])

const variant = computed(() => (props.variant === 'small' ? 'small' : 'default'))

const buttonClass = computed(() => [
  'btn-delete',
  variant.value === 'small' ? 'btn-delete--small' : null
])

async function handleClick() {
  if (props.disabled) return

  const ok = await openConfirmation({
    type: props.type,
    onConfirm: async () => {
      emit('click')
    }
  })

  return ok
}
</script>

<style scoped>
.btn-delete {
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: var(--color-warning);
  cursor: pointer;
  transition: background 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-delete--small {
  width: 28px;
  height: 28px;
  border-radius: 8px;
}

.btn-delete__icon {
  display: block;
  /* Convert the dark SVG fill to white without masks */
  filter: brightness(0) invert(1);
}

.btn-delete--small .btn-delete__icon {
  width: 16px;
  height: 16px;
}

.btn-delete:hover {
  background: rgb(var(--color-warning-rgb) / 0.12);
}

.btn-delete:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
