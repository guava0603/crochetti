<template>
  <RecordViewMain
    :current-user="currentUser"
    :profile="profile"
    @api="handleApi"
  />
</template>

<script setup>
import RecordViewMain from '@/components/RecordView/index.vue'
import { useCurrentUserProfile } from '@/composables/useCurrentUserProfile'

import {
  deletePublicUserRecordSummary,
  mergeUserRecord,
  deleteUserRecord,
  fetchUserRecord,
  upsertPublicUserRecordSummary,
  listUserRecordSummaries
} from '@/services/firestore/records'
import { fetchProject } from '@/services/firestore/projects'

const { currentUser, profile } = useCurrentUserProfile()

const apiHandlers = {
  deletePublicUserRecordSummary,
  mergeUserRecord,
  deleteUserRecord,
  upsertPublicUserRecordSummary,
  fetchUserRecord,
  listUserRecordSummaries,
  fetchProject,
}

function handleApi({ name, args, resolve, reject }) {
  const fn = apiHandlers?.[name]
  if (typeof fn !== 'function') {
    reject?.(new Error(`Unknown api handler: ${String(name)}`))
    return
  }

  Promise.resolve(fn(...(Array.isArray(args) ? args : [])))
    .then((result) => resolve?.(result))
    .catch((error) => reject?.(error))
}
</script>
