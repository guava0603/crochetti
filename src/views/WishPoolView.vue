<template>
  <WishPoolViewMain
    :current-user="currentUser"
    :profile="profile"
    @api="handleApi"
  />
</template>

<script setup>
import WishPoolViewMain from '@/components/WishPoolView/index.vue'
import { useCurrentUserProfile } from '@/composables/useCurrentUserProfile'
import { createWish } from '@/services/firestore/wishes'

const apiHandlers = {
  createWish
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
