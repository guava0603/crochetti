<template>
  <div
    class="avatar-circle"
    :class="rootClass"
    :style="rootStyle"
    :aria-label="alt"
    role="img"
  >
    <img
      v-if="effectiveUrlWithBust"
      class="avatar-circle__img"
      :class="imgClass"
      :src="effectiveUrlWithBust"
      :alt="alt"
      loading="eager"
      decoding="async"
      referrerpolicy="no-referrer"
      crossorigin="anonymous"
      draggable="false"
      @error="handleImgError"
      @load="handleImgLoad"
    />
    <div v-else class="avatar-circle__fallback" aria-hidden="true">
      {{ fallbackLetter }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { avatarIdFromValue, avatarSrcFromId } from '@/constants/avatarPresets'

const props = defineProps({
  imageUrl: { type: String, default: '' },
  image_url: { type: String, default: '' },

  alt: { type: String, default: 'User avatar' },
  name: { type: String, default: '' },

  // Size can be a number (pixels) or any CSS length.
  size: { type: [Number, String], default: 40 },

  // Border and background are owned by this component.
  border: { type: String, default: '0.25rem solid var(--color-background-mute)' },
  background: { type: String, default: 'white' },
  color: { type: String, default: '#ffffff' },

  rootClass: { type: [String, Array, Object], default: '' }
})

const rawAvatarValue = computed(() => {
  const raw = props.imageUrl || props.image_url
  return typeof raw === 'string' ? raw.trim() : ''
})

const presetId = computed(() => avatarIdFromValue(rawAvatarValue.value))
const isPresetAvatar = computed(() => Boolean(presetId.value))

const resolvedUrl = computed(() => {
  if (presetId.value) {
    return avatarSrcFromId(presetId.value) || null
  }

  const url = rawAvatarValue.value
  return url || null
})

const imgClass = computed(() => {
  return {
    'avatar-circle__img--preset': isPresetAvatar.value,
    'avatar-circle__img--photo': !isPresetAvatar.value
  }
})

const imgFailed = ref(false)
const retryCount = ref(0)
const cacheBust = ref('')

watch(
  () => resolvedUrl.value,
  () => {
    imgFailed.value = false
    retryCount.value = 0
    cacheBust.value = ''
  }
)

const effectiveUrl = computed(() => {
  if (!resolvedUrl.value) return null
  return imgFailed.value ? null : resolvedUrl.value
})

const handleImgError = () => {
  if (retryCount.value < 1 && resolvedUrl.value) {
    retryCount.value += 1
    const joiner = resolvedUrl.value.includes('?') ? '&' : '?'
    cacheBust.value = `${joiner}cb=${Date.now()}`
    // keep showing the <img> to allow retry
    return
  }

  imgFailed.value = true
}

const handleImgLoad = () => {
  imgFailed.value = false
}

const effectiveUrlWithBust = computed(() => {
  if (!effectiveUrl.value) return null
  return `${effectiveUrl.value}${cacheBust.value}`
})

const fallbackLetter = computed(() => {
  const s = String(props.name || '').trim()
  if (s) return s.charAt(0).toUpperCase()
  return 'U'
})

const rootStyle = computed(() => {
  const size = typeof props.size === 'number' ? `${props.size}px` : String(props.size || '40px')
  const isFallback = !effectiveUrlWithBust.value
  return {
    width: size,
    height: size,
    border: props.border,
    background: isFallback ? 'var(--color-button-add)' : props.background,
    color: isFallback ? 'var(--color-white)' : props.color
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

.avatar-circle__img--preset {
  transform: scale(0.9);
  transform-origin: center;
}

.avatar-circle__img--photo {
  transform: none;
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
