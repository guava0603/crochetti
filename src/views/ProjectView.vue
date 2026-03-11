<template>
  <ProjectViewMain
    :current-user="currentUser"
    :profile="profile"
    @api="handleApi"
  />
</template>

<script setup>
import ProjectViewMain from '@/components/ProjectView/index.vue'
import { useCurrentUserProfile } from '@/composables/useCurrentUserProfile'

import { fetchProject, updateProject } from '@/services/firestore/projects'
import { listUserRecordsByProjectId } from '@/services/firestore/records'
import { startRecordForProject } from '@/services/records/startRecordForProject'
import {
  saveProjectToSaveList,
  subscribeUserProfile,
  unsaveProjectFromSaveList
} from '@/services/firestore/user'

const { currentUser, profile } = useCurrentUserProfile()

const apiHandlers = {
  fetchProject,
  updateProject,
  listUserRecordsByProjectId,
  startRecordForProject,
  saveProjectToSaveList,
  subscribeUserProfile,
  unsaveProjectFromSaveList
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
