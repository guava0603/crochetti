<template>
  <ModalShell
    :show="show"
    :title="t('user.searchUser.title')"
    max-width="480px"
    z-level="high"
    show-save-footer
    :save-label="t('common.search')"
    :save-disabled="!canSubmit"
    @close="$emit('cancel')"
    @save="submit"
  >
    <p class="modal-hint">{{ t('user.searchUser.message') }}</p>

    <div class="modal-field">
      <label class="modal-label" for="search-user-id">{{ t('user.searchUser.userIdLabel') }}</label>
      <TextInput
        id="search-user-id"
        ref="inputRef"
        v-model="userId"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      />
    </div>
  </ModalShell>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ModalShell from '@/components/modals/shell/ModalShell/ModalShell.vue'
import TextInput from '@/components/shared/inputs/TextInput.vue'
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

const inputRef = ref(null)
const userId = ref('')

watch(
  () => props.show,
  async (open) => {
    if (!open) return
    userId.value = ''
    await nextTick()
    inputRef.value?.focus?.()
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
