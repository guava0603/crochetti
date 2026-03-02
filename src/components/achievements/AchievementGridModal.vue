<template>
  <Teleport to="body">
    <Transition name="ach-grid-modal">
      <div
        v-if="open"
        class="ach-grid-modal"
        role="dialog"
        aria-modal="true"
        @click="emit('close')"
      >
        <div class="ach-grid-modal__card" :class="tierClass(achievement)">
          <div class="ach-grid-modal__image">
            <img
              v-if="achievement?.id && !brokenIcon"
              class="ach-grid-modal__image-img"
              :src="achievementIconUrl(achievement)"
              :alt="title"
              draggable="false"
              @error="markBroken"
            />
          </div>
          <div class="ach-grid-modal__content">
            <div class="ach-grid-modal__title">{{ title }}</div>
            <div class="ach-grid-modal__desc">{{ description }}</div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

import { achievementIconUrl } from '@/services/achievements/icons'

defineOptions({
  name: 'AchievementGridModal'
})

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  achievement: {
    type: Object,
    default: null
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close'])

const brokenIcon = ref(false)

function markBroken() {
  brokenIcon.value = true
}

watch(
  () => [props.open, props.achievement?.id],
  () => {
    brokenIcon.value = false
  }
)

function tierClass(a) {
  const tier = a?.tier != null ? String(a.tier).trim().toLowerCase() : ''
  if (tier === 'brown' || tier === 'silver' || tier === 'gold' || tier === 'special') return `tier--${tier}`
  return ''
}
</script>

<style scoped>
.ach-grid-modal {
  position: fixed;
  inset: 0;
  /* Keep above cabinet-full and in-page tab UI, but below app-level 9999 modals. */
  z-index: 9991;
  display: grid;
  place-items: center;
  background: rgba(17, 24, 39, 0.35);
}

.ach-grid-modal__card {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  position: relative;
  width: min(92vw, 520px);
  padding: 14px 14px;
  border-radius: 16px;
  background: rgba(245, 235, 218, 0.96);
  border: 2px solid rgba(122, 90, 58, 0.65);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.16);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.ach-grid-modal__content {
  display: flex;
  flex-direction: column;
}

.ach-grid-modal__card.tier--brown {
  background-color: var(--tier-brown);
}

.ach-grid-modal__card.tier--silver {
  background-color: var(--tier-silver);
}

.ach-grid-modal__card.tier--gold {
  background-color: var(--tier-gold);
}

.ach-grid-modal__card.tier--special {
  background-color: var(--tier-special);
}

.ach-grid-modal__card.tier--brown .ach-grid-modal__title,
.ach-grid-modal__card.tier--brown .ach-grid-modal__desc,
.ach-grid-modal__card.tier--special .ach-grid-modal__title,
.ach-grid-modal__card.tier--special .ach-grid-modal__desc {
  color: rgba(255, 255, 255, 0.95);
}

.ach-grid-modal__close {
  position: absolute;
  right: 10px;
  top: 8px;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid rgba(122, 90, 58, 0.25);
  background: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-size: 22px;
  font-weight: 900;
  color: #5a3f2a;
}

.ach-grid-modal__image {
  display: grid;
  place-items: center;
  padding: 12px;
  border-radius: 14px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.48);
  border: 5px solid rgba(122, 90, 58, 0.18);
}

.tier--brown .ach-grid-modal__image {
  background-color: var(--tier-brown);
}

.tier--silver .ach-grid-modal__image {
  background-color: var(--tier-silver);
}

.tier--gold .ach-grid-modal__image {
  background-color: var(--tier-gold);
}

.tier--special .ach-grid-modal__image {
  background-color: var(--tier-special);
}

.ach-grid-modal__image-img {
  width: min(240px, 20vw);
  max-height: 240px;
  height: auto;
  object-fit: contain;
  display: block;
}

.ach-grid-modal__image-fallback {
  width: 140px;
  height: 140px;
  display: grid;
  place-items: center;
  font-size: 54px;
  color: rgba(122, 90, 58, 0.9);
}

.ach-grid-modal__title {
  margin-top: 5px;
  font-size: 1.05rem;
  font-weight: 950;
  color: #5a3f2a;
}

.ach-grid-modal__desc {
  margin-top: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.3;
  color: rgba(90, 63, 42, 0.92);
  white-space: pre-wrap;
}

.ach-grid-modal-enter-active {
  transition: opacity 0.16s ease;
}

.ach-grid-modal-leave-active {
  transition: opacity 0.14s ease;
}

.ach-grid-modal-enter-from,
.ach-grid-modal-leave-to {
  opacity: 0;
}
</style>
