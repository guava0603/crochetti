<template>
  <div
    v-if="resolvedUrl"
    class="image-box"
    :class="rootClass"
    :role="isOpenable ? 'button' : undefined"
    :tabindex="isOpenable ? 0 : -1"
    :aria-label="isOpenable ? ariaLabel : undefined"
    @click="handleClick"
  >
    <div class="image-box__cut">
      <img
        class="image-box__img"
        :src="resolvedUrl"
        :alt="alt"
        :loading="lazy ? 'lazy' : 'eager'"
        draggable="false"
      />
    </div>

    <div
      v-if="showDelete"
      class="image-box__delete"
      @click.stop="emitDelete"
    >
      <ButtonDeleteLight variant="small" />
    </div>

    <Teleport to="body">
      <div
        v-if="isOpen"
        class="image-box__overlay"
        role="dialog"
        aria-modal="true"
        @click="close"
      >
        <div class="image-box__dialog">
          <img class="image-box__dialog-img" :src="resolvedUrl" :alt="alt" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import ButtonDeleteLight from '@/components/buttons/ButtonDeleteLight.vue'

const props = defineProps({
  // Prefer `image-url`, but also accept `image_url` to match existing conventions.
  imageUrl: { type: String, default: '' },
  image_url: { type: String, default: '' },

  alt: { type: String, default: '' },
  ariaLabel: { type: String, default: 'Open image' },

  openable: { type: Boolean, default: true },
  stopPropagation: { type: Boolean, default: false },

  showDelete: { type: Boolean, default: false },
  deleteAriaLabel: { type: String, default: 'Delete image' },

  disabled: { type: Boolean, default: false },
  lazy: { type: Boolean, default: true },

  // Optional extra class applied to the root wrapper.
  rootClass: { type: [String, Array, Object], default: '' }
})

const emit = defineEmits(['open', 'close', 'delete', 'click'])

const resolvedUrl = computed(() => {
  const raw = props.imageUrl || props.image_url
  const url = typeof raw === 'string' ? raw.trim() : ''
  return url || null
})

const isOpenable = computed(() => props.openable && !props.disabled)

const isOpen = ref(false)

function open() {
  if (!props.openable || props.disabled || !resolvedUrl.value) return
  isOpen.value = true
  emit('open', resolvedUrl.value)
}

function close() {
  if (!isOpen.value) return
  isOpen.value = false
  emit('close')
}

function emitDelete() {
  if (props.disabled) return
  emit('delete')
}

function handleClick(e) {
  if (!isOpenable.value) return

  emit('click', e)
  if (props.stopPropagation) e?.stopPropagation?.()
  open()
}

function onKeyDown(e) {
  if (!isOpen.value) return
  if (e.key === 'Escape') close()
}

watch(
  isOpen,
  (openNow) => {
    if (typeof window === 'undefined') return
    if (openNow) window.addEventListener('keydown', onKeyDown)
    else window.removeEventListener('keydown', onKeyDown)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<style scoped>
.image-box {
  position: relative;
  display: block;
}

.image-box__cut {
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: inherit;
}

.image-box__img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  border-radius: inherit;
}

.image-box__delete {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.image-box__delete:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.image-box__overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: var(--z-modal-high);
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 24px;
}

.image-box__dialog {
  max-width: min(900px, 92vw);
  margin: auto;
}

.image-box__dialog-img {
  max-width: 100%;
  height: auto;
  display: block;
  border-radius: 12px;
  background: #fff;
}
</style>
