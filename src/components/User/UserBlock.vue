<template>
  <button class="user-block" type="button" @click="$emit('select', user?.id)">
    <AvatarCircle
      class="user-block__avatar"
      :image-url="user?.avatar || null"
      :name="displayName"
      alt="User avatar"
      size="3rem"
      border="0.2rem solid white"
    />

    <div class="user-block__content">
      <div class="user-block__name">{{ displayName }}</div>
    </div>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AvatarCircle from '@/components/Image/AvatarCircle.vue'

defineOptions({
  name: 'UserBlock'
})

const props = defineProps({
  user: {
    type: Object,
    default: null
  }
})

defineEmits(['select'])

const { t } = useI18n({ useScope: 'global' })

const displayName = computed(() => {
  const raw = props.user?.name != null ? String(props.user.name).trim() : ''
  return raw || t('user.anonymous')
})
</script>

<style scoped>
.user-block {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  cursor: pointer;
  text-align: left;
}

.user-block:active {
  transform: scale(0.99);
}

.user-block__avatar {
  flex: none;
}

.user-block__content {
  flex: 1;
  min-width: 0;
}

.user-block__name {
  color: #111827;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
