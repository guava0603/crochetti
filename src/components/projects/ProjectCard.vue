<template>
  <div class="project-card" tabindex="0" @click="emitOpen" @keydown.enter.prevent="emitOpen">
    <div class="project-card__content">
      <div class="project-card__date-box">{{ monthYearLabel }}</div>

      <h4 class="project-card__title text-clamp-2">
        {{ project?.name || t('project.card.fallbackTitle', { id: project?.id || '' }) }}
      </h4>

      <p v-if="project?.description" class="project-card__desc text-clamp-2" :class="{ 'project-card__desc--empty': !project?.description }">
        {{ project?.description }}
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

    <div class="project-card__thumb" aria-hidden="true">
      <img
        v-if="projectImageUrl"
        class="project-card__thumb-img"
        :src="projectImageUrl"
        :alt="projectImageAlt"
        loading="lazy"
        decoding="async"
      />
      <DefaultImage v-else :src="defaultMediaUrl" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDateTimeCompact } from '@/utils/dateTime'
import { toMs } from '@/utils/toMs'
import DefaultImage from '@/components/Image/DefaultImage.vue'

const { t } = useI18n({ useScope: 'global' })

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

const defaultMediaUrl = '/assets/image/achievement/noun-crochet-5351977-FFFFFF.svg'

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

const monthYearLabel = computed(() => formatDateTimeCompact(cardDateMs.value))

const projectImageUrl = computed(() => {
  const p = props.project || {}
  const images = Array.isArray(p.images) ? p.images : []
  const urls = images
    .filter((x) => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean)

  if (urls.length) return urls[0]
  if (typeof p.image === 'string' && p.image.trim()) return p.image.trim()
  return ''
})

const projectImageAlt = computed(() => {
  const name = props.project?.name
  return name ? String(name) : ''
})

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
  background: var(--color-surface-page);
  border: 1.5px solid var(--color-surface-accent);
  padding: 0.8rem 0.8rem 0.8rem 1.2rem;
  border-radius: 0 0 2.5rem 0;
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 1rem;
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
  box-shadow: 0 0 0 3px rgb(var(--color-icon-add-rgb) / 0.22), 0 10px 22px -14px rgba(0, 0, 0, 0.45);
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
  padding-bottom: 0.2rem;
  width: fit-content;
  color: rgba(74, 68, 63, 0.85);
  opacity: 0.7;
}

.project-card__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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
  margin-top: auto;
  display: flex;
  gap: 0.6rem;
  font-size: 0.75rem;
  flex-wrap: wrap;
}

.project-card__thumb {
  flex: 0 0 92px;
  width: 92px;
  aspect-ratio: 1 / 1;
  align-self: center;
  border-radius: 0 0 1.5rem 0;
  overflow: hidden;
  background: rgba(17, 24, 39, 0.06);
  display: grid;
  place-items: center;
  border: 1px solid var(--color-border-warm);
}

.project-card__thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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
