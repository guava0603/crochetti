<template>
  <footer v-if="showFooter" class="app-footer">
    <FooterActionsButton v-if="footerType === 'actions'" />
    <FooterRecordOptions v-else-if="footerType === 'record-options'" />
  </footer>

  <!-- Floating right action (e.g. add button) sits above the dock inner. -->
  <div
    class="bottom-floating-right"
    :class="{ 'is-hidden': footerType !== 'record-options' || !showFooter }"
  >
    <div id="bottom-floating-right-slot" />
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'

import FooterRecordOptions from '@/components/Footer/RecordOptions.vue'
import FooterActionsButton from '@/components/Footer/ActionsButton.vue'

import { useFooterContext } from '@/composables/footerContext'

defineOptions({ name: 'FooterHost' })

const route = useRoute()
const footer = useFooterContext()

const footerType = computed(() => String(route.meta?.footer || 'none'))

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
  { immediate: true }
)
</script>

<style scoped>
:global(:root) {
  /* Base (non-safe-area) height of the bottom dock area.
     Used to position floating controls *above* the dock. */
  --bottom-footer-dock-base-height: 5rem;
  --bottom-footer-dock-side-width: 92px;
}

.app-footer {
  flex: none;
  border-top: 1px solid rgba(229, 231, 235, 0.9);
  background: var(--color-background-soft);
  min-height: calc(var(--app-footer-height) + var(--safe-area-bottom));
  padding-bottom: var(--safe-area-bottom);
  z-index: var(--z-bottom-toolbar);
}

/* Floating right anchor sits above the dock inner (not inside the dock). */
.bottom-floating-right {
  position: fixed;
  right: 1rem;
  width: 3rem;
  height: 3rem;
  bottom: calc(var(--safe-area-bottom) + var(--bottom-footer-dock-base-height) + 12px);
  z-index: var(--z-float);
  pointer-events: none;
}

.bottom-floating-right #bottom-floating-right-slot {
  pointer-events: auto;
}

.bottom-floating-right.is-hidden {
  visibility: hidden;
}
</style>
