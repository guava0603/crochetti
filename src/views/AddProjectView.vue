<template>
  <AddProjectView @api="handleApi" />
</template>

<script setup>
import AddProjectView from '@/components/features/add-project/AddProjectPage.vue'
import { createProject, fetchUserDraftSummaries, updateProject } from '@/services/firestore/projects'

const apiHandlers = {
  createProject,
  updateProject,
  fetchUserDraftSummaries
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
