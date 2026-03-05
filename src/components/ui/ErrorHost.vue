<template>
  <Transition name="error-fade">
    <div v-if="err.show" class="error-host" role="alert" aria-live="assertive">
      <div class="error">
        <div v-if="err.title" class="error__title">{{ err.title }}</div>
        <div v-if="err.message" class="error__message">{{ err.message }}</div>
        <button class="error__close" type="button" aria-label="Close" @click="closeError">×</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { closeError, useErrorState } from '@/services/ui/error'

const err = useErrorState()
</script>

<style scoped>
.error-host {
  z-index: 3500;
  pointer-events: none;
}

.error {
  pointer-events: auto;
  position: fixed;
  top: calc(12px + env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  max-width: min(94vw, 720px);
  border-radius: 14px;
  padding: 10px 44px 10px 14px;
  background: rgba(185, 28, 28, 0.92);
  color: #ffffff;
  line-height: 1.25;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  position: relative;
}

.error__title {
  font-weight: 900;
  margin-bottom: 2px;
}

.error__message {
  font-weight: 700;
}

.error__close {
  position: absolute;
  top: 6px;
  right: 10px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.error__close:hover {
  background: rgba(255, 255, 255, 0.26);
}

.error-fade-enter-active,
.error-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.error-fade-enter-from,
.error-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}
</style>
