<template>
  <FloatDockedButton
    class="user-fab"
    image-src="assets/image/settings/015__circle_plus.svg"
    :invert-icon="true"
    :aria-label="t('user.fab.searchUser')"
    @click="showModal = true"
  />

  <SearchUserByIdModal
    :show="showModal"
    @cancel="showModal = false"
    @confirm="handleConfirm"
  />
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import FloatDockedButton from '@/components/buttons/FloatDockedButton.vue'
import SearchUserByIdModal from '@/components/modals/SearchUserByIdModal.vue'

const props = defineProps({
  activeTab: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['open-user'])

const { t } = useI18n({ useScope: 'global' })

const showModal = ref(false)

watch(
  () => props.activeTab,
  () => {
    // Avoid leaving the modal open when switching tabs.
    showModal.value = false
  }
)

const handleConfirm = (id) => {
  const userId = id != null ? String(id).trim() : ''
  if (!userId) return

  showModal.value = false
  emit('open-user', userId)
}
</script>
