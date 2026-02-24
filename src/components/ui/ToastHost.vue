<template>
  <Transition name="toast-fade">
    <div v-if="toast.show" class="toast-host" role="status" aria-live="polite">
      <div class="toast-box">
        {{ toast.message }}
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { useToastState } from '@/services/ui/toast'

const toast = useToastState()
</script>

<style scoped>
.toast-host {
  position: fixed;
  top: calc(12px + env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  z-index: 3000;
  pointer-events: none;
}

.toast-box {
  max-width: min(92vw, 520px);
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(17, 24, 39, 0.55);
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}
</style>
