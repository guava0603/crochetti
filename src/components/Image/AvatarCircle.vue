<template>
  <div
    class="avatar-circle"
    :class="rootClass"
    :style="rootStyle"
    :aria-label="alt"
    role="img"
  >
    <img
      v-if="resolvedUrl"
      class="avatar-circle__img"
      :src="resolvedUrl"
      :alt="alt"
      loading="lazy"
      draggable="false"
    />
    <div v-else class="avatar-circle__fallback" aria-hidden="true">
      {{ fallbackLetter }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  imageUrl: { type: String, default: '' },
  image_url: { type: String, default: '' },

  alt: { type: String, default: 'User avatar' },
  name: { type: String, default: '' },

  // Size can be a number (pixels) or any CSS length.
  size: { type: [Number, String], default: 40 },

  // Border and background are owned by this component.
  border: { type: String, default: '2px solid #e5e7eb' },
  background: { type: String, default: '#42b983' },
  color: { type: String, default: '#ffffff' },

  rootClass: { type: [String, Array, Object], default: '' }
})

const resolvedUrl = computed(() => {
  const raw = props.imageUrl || props.image_url
  const url = typeof raw === 'string' ? raw.trim() : ''
  return url || null
})

const fallbackLetter = computed(() => {
  const s = String(props.name || '').trim()
  if (s) return s.charAt(0).toUpperCase()
  return 'U'
})

const rootStyle = computed(() => {
  const size = typeof props.size === 'number' ? `${props.size}px` : String(props.size || '40px')
  return {
    width: size,
    height: size,
    border: props.border,
    background: props.background,
    color: props.color
  }
})
</script>

<style scoped>
.avatar-circle {
  border-radius: 9999px;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.avatar-circle__img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.avatar-circle__fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  line-height: 1;
  user-select: none;
}
</style>
