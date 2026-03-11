<template>
  <AddProjectView @api="handleApi" />
</template>

<script setup>
import AddProjectView from '@/components/AddProjectView/index.vue'
import { createProject, updateProject } from '@/services/firestore/projects'

const apiHandlers = {
  createProject,
  updateProject
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
