<template>
  <RecordPrintViewMain
    :current-user="currentUser"
    :profile="profile"
    @api="handleApi"
  />
</template>

<script setup>
import RecordPrintViewMain from '@/components/features/record/record-print/RecordPrintPage.vue'
import { useCurrentUserProfile } from '@/composables/useCurrentUserProfile'
import { fetchUserRecord } from '@/services/firestore/records'

const { currentUser, profile } = useCurrentUserProfile()

function handleApi({ name, args, resolve, reject }) {
  if (name !== 'fetchUserRecord') {
    reject?.(new Error(`Unknown api handler: ${String(name)}`))
    return
  }

  Promise.resolve(fetchUserRecord(...(Array.isArray(args) ? args : [])))
    .then((result) => resolve?.(result))
    .catch((error) => reject?.(error))
}
</script>
