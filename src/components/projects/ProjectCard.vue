<template>
  <div class="project-card" role="button" tabindex="0" @click="emitOpen" @keydown.enter.prevent="emitOpen">
    <div class="project-card__top">
      <h3 class="project-card__title">{{ project?.name || `Project ${project?.id || ''}` }}</h3>

      <div class="project-card__menu" @click.stop>
        <MoreMenu :disabled="disabled" :label="t('project.more')" :items="menuItems" />
      </div>
    </div>

    <p v-if="project?.description" class="project-card__desc">{{ project.description }}</p>
    <p v-else class="project-card__desc project-card__desc--empty">No description</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import MoreMenu from '@/components/buttons/MoreMenu.vue'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  project: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
  copying: { type: Boolean, default: false },
  showCopy: { type: Boolean, default: true },
  showShare: { type: Boolean, default: true },
  showDelete: { type: Boolean, default: true }
})

const emit = defineEmits(['open', 'copy', 'share', 'delete'])

const menuItems = computed(() => {
  const items = []

  if (props.showCopy) {
    items.push({
      action: 'copy',
      label: props.copying ? t('project.copying') : t('project.copyProject'),
      disabled: props.disabled || props.copying,
      onSelect: () => emit('copy', props.project)
    })
  }

  if (props.showShare) {
    items.push({
      action: 'share',
      label: t('project.shareLink'),
      disabled: props.disabled,
      onSelect: () => emit('share', props.project)
    })
  }

  if (props.showDelete) {
    items.push({
      action: 'delete',
      label: t('common.delete'),
      danger: true,
      disabled: props.disabled,
      onSelect: () => emit('delete', props.project)
    })
  }

  return items
})

const emitOpen = () => {
  if (props.disabled) return
  emit('open', props.project)
}
</script>

<style scoped>
.project-card {
  position: relative;
  z-index: 0;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  outline: none;
}

.project-card:hover {
  z-index: 5;
  border-color: #42b983;
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.15);
  cursor: pointer;
}

.project-card:focus-within {
  z-index: 5;
}

.project-card:focus-visible {
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.25);
}

.project-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.project-card__title {
  margin: 0;
  color: #111827;
  font-size: 1.125rem;
  font-weight: 800;
  line-height: 1.3;
}

.project-card__menu {
  flex: none;
  position: absolute;
  top: 10px;
  right: 10px;
}

.project-card__desc {
  margin: 0.5rem 0 0;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
}

.project-card__desc--empty {
  font-style: italic;
  color: #9ca3af;
}
</style>
