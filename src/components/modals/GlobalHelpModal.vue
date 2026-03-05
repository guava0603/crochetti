<template>
  <Teleport to="body">
    <div
      v-if="state.show"
      class="help-modal-overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="t('help.modal.aria')"
      @click="handleOverlayClick"
    >
      <div class="help-modal" @click.stop="handleCardClick">
        <div class="help-modal__body">
          <component :is="currentPage" v-if="currentPage" v-bind="state.props || {}" />
        </div>

        <button
          type="button"
          class="help-modal__skip"
          @click.stop="closeHelp"
        >
          {{ t('help.modal.skip') }}
        </button>

        <div class="help-modal__dots" role="tablist" :aria-label="t('help.modal.pagesAria')">
          <button
            v-for="(_, i) in pages"
            :key="i"
            type="button"
            class="help-modal__dot"
            :class="{ 'help-modal__dot--active': i === state.pageIndex }"
            :aria-label="t('help.modal.pageNAria', { n: i + 1 })"
            @click.stop="goHelpPage(i)"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { HELP_TOPICS } from '@/help'
import {
  closeHelp,
  goHelpPage,
  nextHelpPage,
  useHelpState
} from '@/services/ui/help'

const { t } = useI18n({ useScope: 'global' })

const state = useHelpState()

const pages = computed(() => {
  const topic = HELP_TOPICS?.[state.topicId]
  return Array.isArray(topic?.pages) ? topic.pages : []
})

const currentPage = computed(() => {
  const list = pages.value
  if (list.length === 0) return null
  return list[Math.min(list.length - 1, Math.max(0, state.pageIndex))]
})

function handleOverlayClick() {
  nextHelpPage()
}

function handleCardClick() {
  nextHelpPage()
}

function handleKeydown(e) {
  if (!state.show) return
  const target = e.target
  const isInteractive =
    target &&
    typeof target === 'object' &&
    typeof target.closest === 'function' &&
    target.closest('button, a, input, textarea, select, [role="button"]')

  if (e.key === 'Escape') closeHelp()
  if (!isInteractive && (e.key === 'Enter' || e.key === ' ')) nextHelpPage()
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<style scoped>
.help-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0.75rem 1rem 1rem;
  background: rgb(0 0 0 / 0.45);
}

.help-modal {
  position: relative;
  width: min(560px, 92vw);
  min-height: 240px;
  max-height: calc(100vh - 1.75rem);
  overflow: auto;
  background: var(--color-surface-page, #fff);
  border: 1px solid rgb(0 0 0 / 0.10);
  border-radius: 16px;
  box-shadow: 0 22px 40px rgb(0 0 0 / 0.20);
  padding: 1.25rem 1.25rem 3.25rem;
}

.help-modal__body :deep(.help-page__title) {
  margin: 0 0 0.75rem;
  font-size: 1.15rem;
  font-weight: 900;
  color: #111827;
}

.help-modal__body :deep(.help-page__text) {
  margin: 0 0 0.75rem;
  color: #4b5563;
  line-height: 1.6;
  white-space: pre-line;
}

.help-modal__body :deep(.help-page__list) {
  margin: 0;
  padding-left: 1.1rem;
  color: #374151;
  line-height: 1.6;
}

.help-modal__skip {
  position: absolute;
  right: 14px;
  bottom: 12px;
  background: transparent;
  border: 1px solid rgb(0 0 0 / 0.12);
  color: #374151;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  font-weight: 800;
  cursor: pointer;
}

.help-modal__skip:hover {
  background: rgb(0 0 0 / 0.04);
}

.help-modal__dots {
  position: absolute;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  align-items: center;
}

.help-modal__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 1px solid rgb(0 0 0 / 0.25);
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.help-modal__dot--active {
  background: rgb(0 0 0 / 0.55);
  border-color: transparent;
}
</style>
