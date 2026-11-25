<template>
  <div class="app-footer__inner">
    <div class="app-footer__side app-footer__side--left">
      <ToolbarButton
        class="footer-button-l"
        icon-src="101__home"
        :aria-label="leftAriaLabel"
        :title="leftAriaLabel"
        size="md"
        @click="onLeftClick"
      />
    </div>

    <div class="app-footer__center">
      <FooterRecordOptions />
    </div>

    <div class="app-footer__side app-footer__side--right">
      <ToolbarButton
        class="footer-button-r"
        icon-src="048__chat"
        :aria-label="rightAriaLabel"
        :title="rightAriaLabel"
        size="md"
        @click="onRightClick"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import ToolbarButton from '@/components/shell/layout/ToolbarButton.vue'
import FooterRecordOptions from '@/components/shell/Footer/RecordOptions.vue'

defineOptions({ name: 'FooterBar' })

const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

const leftAriaLabel = computed(() => t('common.home'))

function onLeftClick() {
  router.push({ name: 'home' })
}

const rightAriaLabel = computed(() => t('wishPool.title'))

function onRightClick() {
  router.push({ name: 'wish-pool' })
}
</script>

<style scoped>
.app-footer__inner {
  max-width: 1200px;
  height: inherit;
  width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  position: relative;
}

/* The box grows by the safe-area inset and pads it away at the bottom,
   so the icon stays centered in the 4rem square above the home indicator. */
.app-footer__side {
  flex: 0 0 var(--bottom-footer-dock-side-width);
  width: var(--bottom-footer-dock-side-width);
  height: calc(var(--bottom-footer-dock-side-width) + var(--bottom-footer-padding-bottom));
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding-bottom: var(--bottom-footer-padding-bottom);
}

.app-footer__center {
  width: 100%;
  min-width: 0;
  align-self: flex-end;
}
</style>
