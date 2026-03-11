<template>
  <HomeViewMain
    :current-user="currentUser"
    :profile="profile"
    :loading="loading"
    @api="handleApi"
  />
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useCurrentUserProfile } from '@/composables/useCurrentUserProfile'

import HomeViewMain from '@/components/HomeView/index.vue'

import {
  createProject,
  deleteProject as deleteProjectDoc,
  fetchProject,
  fetchProjectSummariesByIds
} from '@/services/firestore/projects'
import {
  listUserRecordSummaries,
  fetchUserRecord,
  mergeUserRecord
} from '@/services/firestore/records'
import {
  fetchUserProjectSummaries,
  fetchUsers,
  subscribeUserProfile,
  updateUserProfile as updateUserProfileDoc
} from '@/services/firestore/user'

const { t } = useI18n({ useScope: 'global' })

const { currentUser, profile, loading } = useCurrentUserProfile({
  anonymousLabel: t('user.anonymous')
})

const apiHandlers = {
  createProject,
  deleteProjectDoc,
  fetchProject,
  fetchProjectSummariesByIds,
  listUserRecordSummaries,
  fetchUserRecord,
  mergeUserRecord,
  fetchUserProjectSummaries,
  fetchUsers,
  subscribeUserProfile,
  updateUserProfileDoc
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

<style scoped>
.home-banner-actions {
  display: flex;
  align-items: center;
}

.home-latest-record-dock {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.625rem;
}

.home-latest-record-panel {
  position: absolute;
  left: 0;
  bottom: calc(4rem + 0.625rem);
  width: 100%;
  z-index: 1;
}

.home-latest-record-panel.is-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
</style>
