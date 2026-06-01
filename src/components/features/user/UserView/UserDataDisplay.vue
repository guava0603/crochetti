<template>
  <div class="profile-avatar-container">
    <AvatarCircle
      class="profile-avatar"
      :image-url="avatar"
      alt="User avatar"
      :name="name"
      size="7rem"
      border="0.4rem solid white"
    />
  </div>
</template>

<script setup>
import AvatarCircle from '@/components/shared/image/AvatarCircle.vue'

defineOptions({
  name: 'UserDataDisplay'
})

defineProps({
  name: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: null
  },
  fanList: {
    type: Array,
    default: null
  },
  isMyPage: {
    type: Boolean,
    default: false
  },
  badgeText: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.profile-avatar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.profile-avatar {
  flex: none;
  margin: 0;
}
</style>
