<template>
  <Transition name="ach-toast">
    <div
      v-if="show"
      class="ach-toast-host"
      :class="hostClass"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div class="ach-toast-card" @click="emitClose">
        <div class="ach-toast-illus" :class="tierClass" aria-hidden="true">
          <img
            class="ach-toast-icon__img"
            :src="achievementIconUrl(resolvedAchievement)"
            alt=""
            loading="eager"
            draggable="false"
          />
        </div>

        <div class="ach-toast-main">
          <div class="ach-toast-title-row">
            <div class="ach-toast-title">{{ resolvedName }}</div>
          </div>

          <div v-if="resolvedDescription" class="ach-toast-desc">
            {{ resolvedDescription }}
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, onBeforeUnmount, watch } from 'vue'

import { getLocalAchievementById } from '@/services/achievements/catalog'
import { achievementIconUrl } from '@/services/achievements/icons'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  achievementId: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  iconUrl: {
    type: String,
    default: ''
  },
  illustrationUrl: {
    type: String,
    default: ''
  },
  position: {
    type: String,
    default: 'top' // 'top' | 'center'
  },
  kicker: {
    type: String,
    default: ''
  },
  autoHideMs: {
    type: Number,
    default: 2400
  }
})

const emit = defineEmits(['close'])

const resolvedName = computed(() => {
  const s = String(props.name || '').trim()
  return s || 'Achievement unlocked'
})

const resolvedDescription = computed(() => {
  const s = String(props.description || '').trim()
  return s || ''
})

const resolvedAchievement = computed(() => {
  const id = String(props.achievementId || '').trim()
  if (!id) return null
  return getLocalAchievementById(id) || { id }
})

const tierClass = computed(() => {
  const id = String(props.achievementId || '').trim()
  if (!id) return ''
  const a = getLocalAchievementById(id)
  const tier = a?.tier != null ? String(a.tier).trim().toLowerCase() : ''
  if (tier === 'brown' || tier === 'silver' || tier === 'gold' || tier === 'special') return `tier--${tier}`
  return ''
})

const hostClass = computed(() => {
  const p = String(props.position || 'top')
  return p === 'center' ? 'ach-toast-host--center' : 'ach-toast-host--top'
})

let hideTimer = null

function emitClose() {
  emit('close')
}

watch(
  () => props.show,
  (open) => {
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }

    if (!open) return

    const ms = Number(props.autoHideMs)
    if (!Number.isFinite(ms) || ms <= 0) return

    hideTimer = setTimeout(() => {
      hideTimer = null
      emitClose()
    }, ms)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = null
})
</script>

<style scoped>
.ach-toast-host {
  position: fixed;
  left: 50%;
  z-index: 3100;
  pointer-events: none;
  transform: translateX(-50%);
  width: min(92vw, 520px);
}

.ach-toast-host--top {
  top: calc(12px + env(safe-area-inset-top));
}

.ach-toast-host--center {
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
}

.ach-toast-card {
  pointer-events: auto;
  cursor: pointer;
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 12px;
  padding: 14px 14px;
  border-radius: 18px;

  /* Japanese healing vibe */
  background: rgba(245, 235, 218, 0.96); /* soft beige */
  color: #5a3f2a; /* warm brown */

  /* hand-drawn border */
  border: 2.5px solid rgba(122, 90, 58, 0.85);
  box-shadow:
    0 12px 26px rgba(0, 0, 0, 0.12),
    0 2px 0 rgba(122, 90, 58, 0.35) inset;

  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  position: relative;
}

.ach-toast-card::before {
  content: '';
  position: absolute;
  inset: 7px;
  border-radius: 14px;
  border: 1.5px dashed rgba(122, 90, 58, 0.38);
  pointer-events: none;
}

.ach-toast-illus {
  width: 96px;
  height: 96px;
  padding: 12px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.45);
  border: 7px solid rgba(122, 90, 58, 0.22);
}

.ach-toast-illus__img,
.ach-toast-illus__svg {
  width: 78px;
  height: 78px;
  display: block;
}

.ach-toast-main {
  min-width: 0;
  display: grid;
  gap: 6px;
  align-content: center;
}

.ach-toast-kicker {
  font-weight: 900;
  letter-spacing: 0.02em;
  font-size: 0.82rem;
  opacity: 0.9;
}

.ach-toast-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ach-toast-title {
  font-weight: 950;
  font-size: 1.05rem;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ach-toast-desc {
  font-weight: 700;
  font-size: 0.92rem;
  line-height: 1.25;
  opacity: 0.92;
  overflow: hidden;
  display: -webkit-box;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.ach-toast-icon {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(122, 90, 58, 0.22);
  flex: none;
}

.ach-toast-illus.tier--brown {
  background-color: var(--tier-brown);
}

.ach-toast-illus.tier--silver {
  background-color: var(--tier-silver);
}

.ach-toast-illus.tier--gold {
  background-color: var(--tier-gold);
}

.ach-toast-illus.tier--special {
  background-color: var(--tier-special);
}

.ach-toast-icon__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

/* Motion */
.ach-toast-enter-active {
  animation: ach-toast-in 420ms cubic-bezier(0.22, 1.25, 0.36, 1) both;
}

.ach-toast-leave-active {
  animation: ach-toast-out 180ms ease both;
}

@keyframes ach-toast-in {
  0% {
    opacity: 0;
    transform: translateY(-18px) scale(0.98);
  }
  60% {
    opacity: 1;
    transform: translateY(0px) scale(1.02);
  }
  82% {
    transform: translateY(2px) scale(0.995);
  }
  100% {
    opacity: 1;
    transform: translateY(0px) scale(1);
  }
}

@keyframes ach-toast-out {
  0% {
    opacity: 1;
    transform: translateY(0px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ach-toast-enter-active,
  .ach-toast-leave-active {
    animation: none;
    transition: opacity 0.12s ease;
  }
}
</style>
