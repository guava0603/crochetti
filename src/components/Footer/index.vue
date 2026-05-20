<template>
  <footer
    v-if="showFooter"
    class="app-footer"
    :class="{ 'app-footer--bar': footerType === 'bar' }"
  >
    <FooterActions v-if="footerType === 'action'" />
    <FooterBar v-else-if="footerType === 'bar'" />
  </footer>

  <!-- Floating right action (e.g. add button) sits above the dock inner. -->
  <div
    class="bottom-floating-right"
    :class="{ 'is-hidden': footerType !== 'bar' || !showFooter }"
  >
    <div id="bottom-floating-right-slot" />
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'

import FooterActions from '@/components/Footer/FooterActions.vue'
import FooterBar from '@/components/Footer/FooterBar.vue'

import { useFooterContext } from '@/composables/footerContext'

defineOptions({ name: 'AppFooter' })

const route = useRoute()
const footer = useFooterContext()

const footerType = computed(() => {
  const raw = String(route.meta?.footer || 'none')
  if (raw === 'record-options') return 'bar'
  if (raw === 'actions') return 'action'
  return raw
})

const isRecordResultSharing = computed(() => {
  if (route.name !== 'record') return false
  return Object.prototype.hasOwnProperty.call(route.query || {}, 'result-sharing')
})

const showFooter = computed(() => {
  if (isRecordResultSharing.value) return false
  return footerType.value !== 'none'
})

watch(
  () => route.fullPath,
  () => {
    footer.clearActions()
  },
  { flush: 'sync' }
)
</script>

<style scoped>
:global(:root) {
  /* Base (non-safe-area) height of the bottom dock area.
     Used to position floating controls *above* the dock. */
  --bottom-footer-dock-side-width: 4rem;
  --bottom-footer-padding-bottom: var(--safe-area-bottom);
}

.app-footer {
  flex: none;
  border-top: 1px solid rgba(229, 231, 235, 0.9);
  background: var(--color-background-soft);
  height: calc(var(--app-footer-height) + var(--bottom-footer-padding-bottom));
  padding-bottom: var(--bottom-footer-padding-bottom);
  z-index: var(--z-bottom-toolbar);
}

/* Bar footer: let the dock itself manage safe-area padding
   so the shadowed pill can visually reach the bottom edge. */
.app-footer.app-footer--bar {
  padding-bottom: 0;
}

/* Floating right anchor sits above the dock inner (not inside the dock). */
.bottom-floating-right {
  position: fixed;
  right: 0;
  width: var(--bottom-footer-dock-side-width);
  height: var(--bottom-footer-dock-side-width);
  bottom: calc(var(--app-footer-height) + var(--bottom-footer-padding-bottom));
  z-index: var(--z-float);
  pointer-events: none;

  display: flex;
  justify-content: center;
  align-items: center;
}

.bottom-floating-right #bottom-floating-right-slot {
  pointer-events: auto;
}

.bottom-floating-right.is-hidden {
  visibility: hidden;
}
</style>
