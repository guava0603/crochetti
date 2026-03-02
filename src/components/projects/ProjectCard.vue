<template>
  <div class="project-card" tabindex="0" @click="emitOpen" @keydown.enter.prevent="emitOpen">
    <div class="project-card__leaf" aria-hidden="true">🌿</div>

    <div class="project-card__date-box">{{ monthYearLabel }}</div>

    <h4 class="project-card__title">
      {{ project?.name || t('project.card.fallbackTitle', { id: project?.id || '' }) }}
    </h4>

    <p class="project-card__desc" :class="{ 'project-card__desc--empty': !project?.description }">
      {{ project?.description || t('project.card.noDescription') }}
    </p>

    <div class="project-card__stats">
      <span v-if="componentCount != null" class="project-card__stat-pill">
        {{ t('project.components') }}：{{ componentCount }}
      </span>
      <span v-if="hookSummary" class="project-card__stat-pill">
        {{ t('project.componentMetadata.hook') }}：{{ hookSummary }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n({ useScope: 'global' })

const props = defineProps({
  project: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
  copying: { type: Boolean, default: false },
  showCopy: { type: Boolean, default: true },
  showCopyLink: { type: Boolean, default: false },
  showShare: { type: Boolean, default: true },
  showDelete: { type: Boolean, default: false }
})

const emit = defineEmits(['open', 'copy', 'share', 'delete'])

function toMs(value) {
  if (value && typeof value.toMillis === 'function') {
    const ms = value.toMillis()
    return Number.isFinite(ms) ? ms : null
  }

  if (value instanceof Date) {
    const ms = value.getTime()
    return Number.isFinite(ms) ? ms : null
  }

  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string') {
    const s = value.trim()
    if (!s) return null
    const ms = new Date(s).getTime()
    return Number.isFinite(ms) ? ms : null
  }

  return null
}

function formatMonthYear(ms) {
  if (!Number.isFinite(ms)) return ''
  const d = new Date(ms)

  if (locale.value === 'zh-TW') {
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${d.getFullYear()}年${m}月`
  }

  const month = d.toLocaleString('en-US', { month: 'short' })
  const monthWithDot = month.endsWith('.') ? month : `${month}.`
  return `${monthWithDot} ${d.getFullYear()}`
}

const cardDateMs = computed(() => {
  const p = props.project || {}
  return (
    toMs(p.updated_at) ??
    toMs(p.updatedAt) ??
    toMs(p.created_at) ??
    toMs(p.createdAt) ??
    null
  )
})

const monthYearLabel = computed(() => formatMonthYear(cardDateMs.value))

const componentCount = computed(() => {
  const p = props.project || {}
  const list = Array.isArray(p.component_list) ? p.component_list : null
  return list ? list.length : null
})

const hookSummary = computed(() => {
  const p = props.project || {}
  const list = Array.isArray(p.component_list) ? p.component_list : []

  for (const c of list) {
    if (!c || typeof c !== 'object') continue

    const directHook = Array.isArray(c.hook) ? c.hook : null
    if (directHook) {
      const v = directHook.find((x) => typeof x === 'string' && x.trim())
      if (v) return v.trim()
    }

    const metaHook = Array.isArray(c?.metadata?.hook) ? c.metadata.hook : null
    if (metaHook) {
      const v = metaHook.find((x) => typeof x === 'string' && x.trim())
      if (v) return v.trim()
    }

    if (typeof c?.metadata?.hook === 'string' && c.metadata.hook.trim()) {
      return c.metadata.hook.trim()
    }
  }

  return ''
})

const emitOpen = () => {
  if (props.disabled) return
  emit('open', props.project)
}
</script>

<style scoped>
.project-card {
  background: var(--color-surface-sheet);
  border: 1.5px solid var(--color-text);
  padding: 1.25rem;
  border-radius: 0 0 2.5rem 0;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 9.5rem;
  box-shadow: 0 1px 6px -3px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  outline: none;
}

.project-card:hover {
  box-shadow: 0 10px 22px -14px rgba(0, 0, 0, 0.45);
  transform: translateY(-1px);
}

.project-card:focus-within {
  z-index: 5;
}

.project-card:focus-visible {
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.22), 0 10px 22px -14px rgba(0, 0, 0, 0.45);
}

.project-card__leaf {
  position: absolute;
  bottom: 0.65rem;
  right: 0.9rem;
  font-size: 1.5rem;
  opacity: 0.3;
  pointer-events: none;
}

.project-card__date-box {
  font-size: 0.7rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  border-bottom: 1px solid var(--color-text);
  padding-bottom: 0.35rem;
  width: fit-content;
  color: rgba(74, 68, 63, 0.85);
}

.project-card__title {
  margin: 0;
  font-size: 1.1rem;
  color: #4A443F;
  font-weight: 800;
  line-height: 1.3;
}

.project-card__desc {
  color: rgba(74, 68, 63, 0.75);
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
}

.project-card__desc--empty {
  font-style: italic;
  color: rgba(74, 68, 63, 0.55);
}

.project-card__stats {
  margin-top: 0.3rem;
  display: flex;
  gap: 0.6rem;
  font-size: 0.75rem;
  flex-wrap: wrap;
}

.project-card__stat-pill {
  background: rgba(17, 24, 39, 0.08);
  padding: 0.15rem 0.5rem;
  border-radius: 0.35rem;
  color: rgba(17, 24, 39, 0.75);
}

:deep(.more-menu__button) {
  background: none;
  width: 32px;
  height: 32px;
}
</style>
