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

    <div class="badge-container">
      <span v-if="isMyPage" class="my-page-badge">{{ badgeText }}</span>
    </div>

    <div v-if="false && fansCount > 0" class="fans-container">
      <span class="fans-count">{{ t('user.fansCount', { count: fansCount }) }}</span>
    </div>
  </div>
</template>

<script setup>
import AvatarCircle from '@/components/Image/AvatarCircle.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({
  name: 'UserDataDisplay'
})

const props = defineProps({
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

const { t } = useI18n({ useScope: 'global' })

const fansCount = computed(() => {
  const list = props.fanList
  return Array.isArray(list) ? list.filter(Boolean).length : 0
})
</script>

<style scoped>
.profile-avatar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
}

.profile-avatar {
  flex: none;
  margin: 0;
}

.badge-container {
  display: flex;
  justify-content: center;
  width: 100%;
}

.my-page-badge {
  display: inline-block;
  background: #dbeafe;
  color: #1e40af;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.fans-container {
  display: flex;
  justify-content: center;
  width: 100%;
}

.fans-count {
  color: var(--color-icon-base);
  font-size: 0.875rem;
}
</style>
