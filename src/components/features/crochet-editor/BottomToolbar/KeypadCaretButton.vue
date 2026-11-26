<template>
  <!-- Moves the keypad's insertion point one step within the current pattern / bundle / row.
       ◀ sits left of the input display, ▶ right of it. -->
  <ThinIconButton
    class="keypad-caret-button"
    :class="{ 'keypad-caret-button--right': direction === 'right' }"
    src="001__arrow_left"
    size="m"
    background="transparent"
    :disabled="disabled"
    :aria-label="label"
    :title="label"
    @click="$emit('move', direction === 'right' ? 1 : -1)"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ThinIconButton from '@/components/shared/buttons/ThinIconButton.vue'

defineOptions({ name: 'KeypadCaretButton' })

const props = defineProps({
  direction: {
    type: String,
    required: true,
    validator: (v) => ['left', 'right'].includes(v)
  },
  disabled: { type: Boolean, default: false }
})

defineEmits(['move'])

const { t } = useI18n({ useScope: 'global' })

const label = computed(() => t(`toolbar.editCrochet.caret.${props.direction}`))
</script>

<style scoped>
/* Narrower than the delete button (2rem square) with a smaller glyph; same height and
   centered on the input row, so all controls line up. */
.keypad-caret-button.thin-icon-button {
  flex: none;
  align-self: center;
  width: 1.5rem;
  height: 2rem;
  border-radius: 0.5rem;
  /* The icon box is scaled past the button; keep it from widening the row. */
  overflow: hidden;
}

.keypad-caret-button.thin-icon-button :deep(.thin-icon-button__icon) {
  width: 1.75rem;
  height: 1.75rem;
  transform: scale(1.15);
}

/* There is only a left-arrow icon; mirror it for "right". */
.keypad-caret-button--right :deep(.thin-icon-button__icon) {
  scale: -1 1;
}
</style>
