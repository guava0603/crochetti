<template>
  <div
    class="app-shell"
    :class="{
      'app-shell--bottom-dock': footerType === 'record-options' && !isRecordResultSharing
    }"
  >
    <TopBanner />

    <main class="app-page">
      <RouterView />
    </main>

    <FooterHost />
  </div>

  <AchievementToastHost />
  <ToastHost />
  <ErrorHost />

  <GlobalHelpModal />

  <GlobalConfirmationModal />
</template>

<script setup>
import { computed } from 'vue'
import GlobalConfirmationModal from '@/components/modals/GlobalConfirmationModal.vue'
import GlobalHelpModal from '@/components/modals/GlobalHelpModal.vue'
import AchievementToastHost from '@/components/ui/AchievementToastHost.vue'
import ToastHost from '@/components/ui/ToastHost.vue'
import ErrorHost from '@/components/ui/ErrorHost.vue'
import TopBanner from '@/components/layout/TopBanner.vue'
import { RouterView, useRoute } from 'vue-router'
import { provideFooterContext } from '@/composables/footerContext'
import FooterHost from '@/components/Footer/FooterHost.vue'

const route = useRoute()
provideFooterContext()

const isRecordResultSharing = computed(() => {
  if (route.name !== 'record') return false
  return Object.prototype.hasOwnProperty.call(route.query || {}, 'result-sharing')
})

const footerType = computed(() => String(route.meta?.footer || 'none'))
</script>

<style scoped>
/*
  App shell layout:
  - Safe-area padding at top/bottom so content doesn't go under notch / home indicator.
  - Fixed banner/footer heights so page body is stable even if a route doesn't render its own.
*/
.app-shell {
  --safe-top: env(safe-area-inset-top);
  --safe-bottom: env(safe-area-inset-bottom);

  /* App shell fixed regions */
  --app-banner-height: 4rem;
  --app-footer-height: 5rem;

  height: 100vh;
  height: 100svh;
  height: 100dvh;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  /* Default: bottom sheets hug the screen bottom. */
  --bottom-sheet-bottom: 0px;
}

.app-shell--bottom-dock {
  /* Keep fixed BottomSheetScroll content above the global footer dock. */
  --bottom-sheet-bottom: calc(var(--app-footer-height) + var(--safe-area-bottom));
}

.app-page {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain; */
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
