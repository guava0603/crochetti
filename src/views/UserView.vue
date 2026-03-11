<template>
  <UserViewMain
    :current-user="currentUser"
    :profile="profile"
    @api="handleApi"
  />
</template>

<script setup>
import UserViewMain from '@/components/UserView/index.vue'
import { useCurrentUserProfile } from '@/composables/useCurrentUserProfile'

import {
  createProject,
  fetchProject
} from '@/services/firestore/projects'
import { listPublicUserRecordSummaries, listUserRecordSummaries } from '@/services/firestore/records'
import {
  fetchUserProjectSummaries,
  fetchUsers,
  followUser,
  isCurrentUser,
  subscribeUserProfile,
  unfollowUser
} from '@/services/firestore/user'

const apiHandlers = {
  createProject,
  fetchProject,
  listPublicUserRecordSummaries,
  listUserRecordSummaries,
  fetchUserProjectSummaries,
  fetchUsers,
  followUser,
  isCurrentUser,
  subscribeUserProfile,
  unfollowUser
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

const { currentUser, profile } = useCurrentUserProfile()
</script>
