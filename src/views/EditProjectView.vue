<template>
  <EditProjectView @api="handleApi" />
</template>

<script setup>
import EditProjectView from '@/components/EditProjectView/index.vue'
import { fetchProject, updateProject } from '@/services/firestore/projects'
import { isCurrentUser } from '@/services/firestore/user'

const apiHandlers = {
  fetchProject,
  updateProject,
  isCurrentUser
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
