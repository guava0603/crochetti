<template>
  <LoginViewMain
    :current-user="currentUser"
    :profile="profile"
  />
</template>

<script setup>
import LoginViewMain from '@/components/LoginView/index.vue'
import { useCurrentUserProfile } from '@/composables/useCurrentUserProfile'

const { currentUser, profile } = useCurrentUserProfile()
</script>
