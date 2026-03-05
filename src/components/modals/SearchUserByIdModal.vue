<template>
  <div v-if="show" class="modal-overlay" @click="$emit('cancel')">
    <div class="modal-content" @click.stop>
      <h3 class="title">{{ t('user.searchUser.title') }}</h3>
      <p class="message">{{ t('user.searchUser.message') }}</p>

      <form class="form" @submit.prevent="submit">
        <div class="form-group">
          <label class="label" for="search-user-id">{{ t('user.searchUser.userIdLabel') }}</label>
          <input
            id="search-user-id"
            ref="inputEl"
            v-model="userId"
            class="input"
            type="text"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :placeholder="t('user.searchUser.userIdPlaceholder')"
          />
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" type="button" @click="$emit('cancel')">
            {{ t('common.cancel') }}
          </button>
          <button class="btn-confirm" type="submit" :disabled="!canSubmit">
            {{ t('common.search') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { openError } from '@/services/ui/error'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['cancel', 'confirm'])

const inputEl = ref(null)
const userId = ref('')

watch(
  () => props.show,
  async (open) => {
    if (!open) return
    userId.value = ''
    await nextTick()
    inputEl.value?.focus?.()
  }
)

const trimmedUserId = computed(() => String(userId.value || '').trim())
const canSubmit = computed(() => Boolean(trimmedUserId.value))

const submit = () => {
  const id = trimmedUserId.value
  if (!id) {
    openError({ title: t('common.error'), message: t('user.searchUser.errors.userIdRequired') })
    return
  }

  emit('confirm', id)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}

.modal-content {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  max-width: 520px;
  width: 92%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.title {
  margin: 0 0 0.75rem 0;
  color: #111827;
  font-size: 1.25rem;
}

.message {
  margin: 0 0 1rem 0;
  color: #6b7280;
  line-height: 1.5;
}

.form {
  display: grid;
  gap: 0.75rem;
}

.form-group {
  display: grid;
  gap: 0.35rem;
}

.label {
  font-weight: 700;
  color: #111827;
}

.input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  font-size: 1rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.btn-cancel,
.btn-confirm {
  border: none;
  border-radius: 999px;
  padding: 0.6rem 1.1rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-cancel {
  background: #e5e7eb;
  color: #111827;
}

.btn-confirm {
  background: #111827;
  color: white;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
