<template>
  <div class="top-banner" :class="{ 'top-banner--fixed': fixed }">
    <div class="top-banner__inner">
      <div class="top-banner__side" aria-hidden="false">
        <LastPage v-if="showBack" @click="$emit('last-page')" />
        <div v-else class="top-banner__placeholder" />
      </div>

      <div class="top-banner__title">
        <slot name="title">
          <span class="top-banner__title-text">{{ title }}</span>
        </slot>
      </div>

      <div class="top-banner__side top-banner__side--right" @click.stop>
        <slot name="right">
          <MoreMenu
            v-if="showMore"
            :disabled="moreDisabled"
            :label="moreLabel"
            :items="moreItems"
          />
          <div v-else class="top-banner__placeholder" />
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import LastPage from '@/components/buttons/LastPage.vue'
import MoreMenu from '@/components/buttons/MoreMenu.vue'

defineProps({
  title: { type: String, default: '' },
  fixed: { type: Boolean, default: false },
  showBack: { type: Boolean, default: true },
  showMore: { type: Boolean, default: true },
  moreDisabled: { type: Boolean, default: false },
  moreLabel: { type: String, default: 'More' },
  moreItems: {
    type: Array,
    default: () => []
  }
})

defineEmits(['last-page'])

</script>

<style scoped>
.top-banner {
  width: 100%;
}

.top-banner--fixed {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: calc(5rem + var(--safe-area-top));
  padding: 1rem;
  padding-top: calc(1rem + var(--safe-area-top));
  background: transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  z-index: 101;
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
  font-size: 1.5rem;
  font-weight: 900;
  display: block;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
