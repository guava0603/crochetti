<template>
  <template v-if="variant === 'small'">
    <svg @click="handleClick" width="20px" height="20px" stroke-width="2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#f25f5f"><path d="M9.17218 14.8284L12.0006 12M14.829 9.17157L12.0006 12M12.0006 12L9.17218 9.17157M12.0006 12L14.829 14.8284" stroke="#f25f5f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#f25f5f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
  </template>
  <button
    v-else
    :class="buttonClass"
    type="button"
    :disabled="disabled"
    :title="buttonText"
    :aria-label="buttonText"
    @click="handleClick"
  >
    {{ buttonText }}
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { openConfirmation } from '@/services/ui/confirmation'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  disabled: { type: Boolean, default: false },
  text: { type: String, default: '' },
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

function safeT(key, fallback) {
  const value = t(key)
  return value === key ? fallback : value
}

const buttonText = computed(() => props.text || safeT('common.delete', 'Delete'))

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
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.55rem 0.9rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 92px;
  height: 40px;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.btn-delete--small {
  width: 28px;
  height: 28px;
  min-width: 28px;
  padding: 0;
  border-radius: 999px;
  background: transparent;
  color: #f25f5f;
  border: 2px solid #f25f5f;
  font-size: 18px;
  font-weight: 900;
  line-height: 1;
}

.btn-delete__x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  transform: translateY(-1px);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.btn-delete:hover {
  background: #b91c1c;
  transform: translateY(-1px);
}

.btn-delete--small:hover {
  background: rgba(242, 95, 95, 0.12);
  transform: none;
}

.btn-delete:active {
  transform: translateY(0);
}

.btn-delete:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}
</style>
