<template>
  <DownloadDesignViewMain
    :current-user="currentUser"
    :profile="profile"
    :loading="loading"
    :permission-denied="permissionDenied"
    :project-data="projectData"
  />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import DownloadDesignViewMain from '@/components/DownloadDesignView/index.vue'
import { fetchProject } from '@/services/firestore/projects'
import { useCurrentUserProfile } from '@/composables/useCurrentUserProfile'

const route = useRoute()
const { currentUser, profile } = useCurrentUserProfile()

const projectData = ref(null)
const loading = ref(true)
const permissionDenied = ref(false)

const projectId = computed(() => {
  const raw = route.params?.project_id
  return raw != null ? String(raw).trim() : ''
})

let inflight = false
let lastFetchedProjectId = ''

async function loadProject() {
  if (inflight) return

  const pid = projectId.value
  if (!pid) {
    projectData.value = null
    permissionDenied.value = false
    loading.value = false
    return
  }

  if (lastFetchedProjectId === pid && projectData.value) return

  inflight = true
  loading.value = true
  permissionDenied.value = false
  projectData.value = null
  try {
    lastFetchedProjectId = pid
    projectData.value = await fetchProject(pid)
  } catch (error) {
    console.error('DownloadDesignView: fetchProject failed', error)
    permissionDenied.value = String(error?.code || '') === 'permission-denied'
  } finally {
    loading.value = false
    inflight = false
  }
}

watch(
  () => [currentUser.value, route.fullPath],
  () => {
    void loadProject()
  },
  { immediate: true }
)
</script>
