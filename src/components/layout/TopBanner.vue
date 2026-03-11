<template>
  <header
    class="app-banner"
    :class="{
      'app-banner--overlay': bannerOverlay,
      'app-banner--transparent': bannerTransparent,
      'app-banner--glass': bannerVariant === 'glass'
    }"
  >
    <div class="top-banner" :class="{ 'top-banner--fixed': bannerOverlay }">
      <div class="top-banner__inner">
        <div class="top-banner__side" aria-hidden="false">
          <LastPage v-if="bannerShowBack" @click="handleBannerBack" />
          <div v-else class="top-banner__placeholder" />
        </div>

        <div class="top-banner__title">
          <span v-if="bannerVariant !== 'glass'" class="top-banner__title-text">{{ bannerTitle }}</span>
          <span v-else class="top-banner__title-text" aria-hidden="true">&nbsp;</span>
        </div>

        <!-- Teleport target: pages can Teleport to `.top-banner__side--right` -->
        <div class="top-banner__side top-banner__side--right" @click.stop />
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import LastPage from '@/components/buttons/LastPage.vue'
import { provideAppBanner } from '@/composables/appBanner'

defineOptions({ name: 'TopBanner' })

const route = useRoute()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

const appBanner = provideAppBanner()

function applyRouteBannerDefaults(r) {
  const meta = r?.meta || {}

  let title = ''
  if (typeof meta.bannerTitle === 'string') {
    title = meta.bannerTitle
  } else if (typeof meta.bannerTitleKey === 'string') {
    title = t(meta.bannerTitleKey)
  }

  const showBack =
    typeof meta.bannerShowBack === 'boolean'
      ? meta.bannerShowBack
      : String(r?.name || '') !== 'home'

  const overlay = typeof meta.bannerOverlay === 'boolean' ? meta.bannerOverlay : false
  const transparent = typeof meta.bannerTransparent === 'boolean' ? meta.bannerTransparent : false
  const variant = typeof meta.bannerVariant === 'string' ? meta.bannerVariant : 'default'

  // Banner is always visible; routes only define its *type* (title/back/overlay/transparent).
  appBanner.setBanner({ visible: true, variant, title, showBack, overlay, transparent })
  // Never carry back handlers across routes.
  appBanner.resetHandlers()
}

watch(
  () => route.fullPath,
  () => {
    applyRouteBannerDefaults(route)
  },
  { immediate: true }
)

const bannerTitle = computed(() => appBanner.state.title)
const bannerShowBack = computed(() => appBanner.state.showBack)
const bannerOverlay = computed(() => Boolean(appBanner.state.overlay))
const bannerTransparent = computed(() => Boolean(appBanner.state.transparent))
const bannerVariant = computed(() => String(appBanner.state.variant || 'default'))

async function handleBannerBack() {
  const handler = appBanner.state.onBack
  if (typeof handler === 'function') {
    await handler()
    return
  }
  router.back()
}

</script>

<style scoped>
.app-banner {
  flex: none;
  height: calc(var(--app-banner-height) + var(--safe-top));
  background: var(--color-background-soft);
  border-bottom: 1px solid rgba(17, 24, 39, 0.08);
  /* Fill the notch area with the banner background. */
  padding: var(--safe-top) 0.75rem 0;
}

.app-banner--overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-fixed);
  height: 0;
  padding: 0;
  border-bottom: 0;
  background: transparent;
  overflow: visible;
  pointer-events: none;
}

.app-banner--overlay :deep(.top-banner--fixed) {
  pointer-events: auto;
}

.app-banner--transparent :deep(.top-banner--fixed) {
  background: transparent;
  box-shadow: none;
}

.app-banner--glass {
  background: transparent;
  border-bottom: 0;
}

/* Keep the title column, but hide text for glass. */
.app-banner--glass :deep(.top-banner__title-text) {
  opacity: 0;
}

.app-banner--glass :deep(.top-banner__inner) {
  grid-template-columns: 60px 1fr 60px;
}

.app-banner--glass :deep(.top-banner__side),
.app-banner--glass :deep(.top-banner__placeholder) {
  width: 60px;
  height: 60px;
}

/* Glass button styling (ProjectView only) */
.app-banner--glass :deep(.btn-back),
.app-banner--glass :deep(.more-menu__button) {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--glass-border);
  outline: none;
  -webkit-tap-highlight-color: transparent;

  /* Frosted glass */
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  /* Float above image */
  box-shadow: 0 0.5rem 2rem 0 rgba(31, 38, 135, 0.15);

  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  /* SVG stroke/fill color */
  color: var(--color-icon-base);
}

.app-banner--glass :deep(.btn-back__icon) {
  width: 1.5rem;
  height: 1.5rem;
  filter: drop-shadow(0 0.125rem 0.25rem rgba(0, 0, 0, 0.1));
}

.app-banner--glass :deep(.more-menu__icon) {
  filter: drop-shadow(0 0.125rem 0.25rem rgba(0, 0, 0, 0.1));
}

.app-banner--glass :deep(.btn-back:hover),
.app-banner--glass :deep(.more-menu__button:hover) {
  background: rgba(255, 255, 255, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.app-banner--glass :deep(.btn-back:active),
.app-banner--glass :deep(.more-menu__button:active) {
  background: var(--glass-active);
  transform: scale(0.95) translateY(0.125rem);
  box-shadow:
    inset 0.25rem 0.25rem 0.5rem rgba(0, 0, 0, 0.1),
    inset -0.125rem -0.125rem 0.375rem rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(1rem);
  -webkit-backdrop-filter: blur(1rem);
}

.app-banner :deep(.top-banner),
.app-banner :deep(.top-banner__inner) {
  height: 100%;
}

.app-banner--overlay :deep(.top-banner),
.app-banner--overlay :deep(.top-banner__inner) {
  height: auto;
}

.top-banner {
  width: 100%;
}

.top-banner--fixed {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  padding: 1rem;
  padding-top: calc(1rem + var(--safe-top));
  background: var(--color-surface-sheet);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  z-index: var(--z-fixed);
}

.top-banner__inner {
  height: 100%;
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  gap: 0.75rem;
}

.top-banner__side {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.top-banner__placeholder {
  width: 44px;
  height: 44px;
}

.top-banner__title {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

:deep(.top-banner__title-text) {
  margin: 0;
  text-align: center;
  font-size: 1rem;
  font-weight: 900;
  display: block;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

@media (min-width: 1024px) {
  .app-banner {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }
}
</style>
