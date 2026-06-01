<template>
  <ModalPromptShell
    :show="show"
    :title="t('user.searchUser.title')"
    :message="t('user.searchUser.message')"
    z-level="high"
    @close="$emit('cancel')"
  >
    <form id="search-user-form" class="search-form" @submit.prevent="submit">
      <div class="search-form__group">
        <label class="modal-label" for="search-user-id">{{ t('user.searchUser.userIdLabel') }}</label>
        <input
          id="search-user-id"
          ref="inputEl"
          v-model="userId"
          class="search-form__input"
          type="text"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          :placeholder="t('user.searchUser.userIdPlaceholder')"
        />
      </div>
    </form>

    <template #footer>
      <button class="search-form__btn search-form__btn--cancel" type="button" @click="$emit('cancel')">
        {{ t('common.cancel') }}
      </button>
      <button
        class="search-form__btn search-form__btn--submit"
        type="submit"
        form="search-user-form"
        :disabled="!canSubmit"
      >
        {{ t('common.search') }}
      </button>
    </template>
  </ModalPromptShell>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ModalPromptShell from '@/components/modals/shell/ModalShell/ModalPromptShell.vue'
import { openError } from '@/services/ui/error'
import { friendCodeUtils, searchUserByFriendCode } from '@/services/firestore/friendCode'

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

const submit = async () => {
  const raw = trimmedUserId.value
  if (!raw) {
    openError({ title: t('common.error'), message: t('user.searchUser.errors.userIdRequired') })
    return
  }

  if (friendCodeUtils.isLikelyFriendCode(raw)) {
    try {
      const result = await searchUserByFriendCode(raw)
      const uid = String(result?.uid || '').trim()
      if (!uid) {
        openError({ title: t('common.error'), message: t('user.searchUser.errors.friendCodeNotFound') })
        return
      }
      emit('confirm', uid)
      return
    } catch (err) {
      console.error('searchUserByFriendCode failed:', err)
      openError({ title: t('common.error'), message: t('user.searchUser.errors.searchFailed') })
      return
    }
  }

  emit('confirm', raw)
}
</script>

<style scoped>
.search-form {
  display: grid;
  gap: 0.75rem;
}

.search-form__group {
  display: grid;
  gap: 0.35rem;
}

.search-form__input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  font-size: 1rem;
}

.search-form__btn {
  border: none;
  border-radius: 999px;
  padding: 0.6rem 1.1rem;
  font-weight: 700;
  cursor: pointer;
}

.search-form__btn--cancel {
  background: #e5e7eb;
  color: #111827;
}

.search-form__btn--submit {
  background: #111827;
  color: #fff;
}

.search-form__btn--submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
