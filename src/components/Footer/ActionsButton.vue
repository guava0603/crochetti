<template>
  <div
    class="actions-footer"
    role="region"
    :aria-label="ariaLabel"
  >
    <div class="actions-footer__inner button-group" :style="{ justifyContent: justify }">
      <button
        v-if="secondary"
        type="button"
        class="btn-secondary"
        :disabled="Boolean(secondary.disabled)"
        @click="secondary.onClick"
      >
        {{ secondary.label }}
      </button>

      <button
        v-if="primary"
        type="button"
        class="btn-primary"
        :disabled="Boolean(primary.disabled)"
        @click="primary.onClick"
      >
        {{ primary.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFooterContext } from '@/composables/footerContext'

defineOptions({ name: 'FooterActionsButton' })

const route = useRoute()
const footer = useFooterContext()

const actions = computed(() => footer.state.actions)

const ariaLabel = computed(() => {
  const fromState = actions.value?.ariaLabel
  if (typeof fromState === 'string' && fromState.trim()) return fromState.trim()
  return `Actions: ${String(route.name || '')}`
})

const primary = computed(() => actions.value?.primary || null)
const secondary = computed(() => actions.value?.secondary || null)

const justify = computed(() => {
  if (actions.value?.justify) return String(actions.value.justify)
  return secondary.value && primary.value ? 'space-between' : 'flex-end'
})
</script>

<style scoped>
.actions-footer {
  width: 100%;
  padding: 0.75rem 1.5rem;
}

.actions-footer__inner {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
</style>
