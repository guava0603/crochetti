<template>
  <div
    class="btn-delete"
    :disabled="disabled"
    @click="handleClick"
  >
    <img class="btn-delete__icon" :src="emptyIconSrc" alt="" aria-hidden="true" />
  </div>
</template>

<script setup>
import { openConfirmation } from '@/services/ui/confirmation'
import { resolveSettingsIconUrl } from '@/utils/settingsIcon'

const emptyIconSrc = resolveSettingsIconUrl('086__empty')

const props = defineProps({
  disabled: { type: Boolean, default: false },
  type: {
    type: [String, Object],
    default: 'deleteItem'
  }
})

const emit = defineEmits(['click'])

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

.btn-delete__icon {
  display: block;
  /* The SVG has no intrinsic size (150px default) and iOS WebKit won't always shrink it
     inside a flex button, so size it to the button explicitly. The 40×40 viewBox has
     padding built in, so the trash glyph ends up about 40% of the button. */
  flex: none;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  object-fit: contain;
  /* Convert the dark SVG fill to white without masks */
  filter: brightness(0) invert(1);
}

.btn-delete:hover {
  background: rgb(var(--color-warning-rgb) / 0.12);
}

.btn-delete:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
