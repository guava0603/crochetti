<template>
  <div
    v-if="hasVisibleContent"
    class="project-description"
    :class="`project-description--${variant}`"
  >
    <p v-if="showDescriptionResolved" class="project-description-text">
      {{ description }}
    </p>

    <div
      v-if="showMaterialsResolved"
      class="project-materials"
      :aria-label="t('project.componentMetadata.title')"
    >
      <div v-if="showMaterialsTitle" class="project-materials__title">
        {{ t('project.componentMetadata.title') }}
      </div>

      <div v-if="hookLines.length > 0" class="project-materials__row">
        <span class="project-materials__label">{{ t('project.componentMetadata.hook') }}</span>
        <span class="project-materials__value summary-highlight">{{ hookLines.join('\n') }}</span>
      </div>

      <div v-if="yarnLines.length > 0" class="project-materials__row">
        <span class="project-materials__label">{{ t('project.componentMetadata.yarn') }}</span>
        <span class="project-materials__value summary-highlight">{{ yarnLines.join('\n') }}</span>
      </div>
    </div>

    <div
      v-if="showSelfDefinedStitchesResolved"
      class="project-stitch-intro"
      :aria-label="t('project.stitchIntroduction.title')"
    >
      <div class="project-stitch-intro__title">{{ t('project.stitchIntroduction.title') }}</div>
      <ul class="project-stitch-intro__list">
        <li
          v-for="stitch in stitchIntroductions"
          :key="stitch.stitch_id"
          class="project-stitch-intro__item"
        >
          <div class="project-stitch-intro__name">{{ stitch.name }}</div>
          <p class="project-stitch-intro__description">{{ stitch.description }}</p>
        </li>
      </ul>
    </div>

    <slot />
  </div>
</template>

<script setup>
import { computed, useSlots } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'ProjectMetaSections' })

const props = defineProps({
  description: {
    type: String,
    default: ''
  },
  hookLines: {
    type: Array,
    default: () => []
  },
  yarnLines: {
    type: Array,
    default: () => []
  },
  stitchIntroductions: {
    type: Array,
    default: () => []
  },
  showDescription: {
    type: Boolean,
    default: undefined
  },
  showMaterials: {
    type: Boolean,
    default: undefined
  },
  showSelfDefinedStitches: {
    type: Boolean,
    default: undefined
  },
  showMaterialsTitle: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: 'page',
    validator: (v) => ['page', 'print'].includes(v)
  }
})

const { t } = useI18n({ useScope: 'global' })
const slots = useSlots()

const descriptionText = computed(() => String(props.description || '').trim())

const showDescriptionResolved = computed(() => {
  if (props.showDescription !== undefined) return props.showDescription
  return descriptionText.value.length > 0
})

const showMaterialsResolved = computed(() => {
  if (props.showMaterials !== undefined) return props.showMaterials
  return props.hookLines.length > 0 || props.yarnLines.length > 0
})

const showSelfDefinedStitchesResolved = computed(() => {
  if (props.showSelfDefinedStitches !== undefined) return props.showSelfDefinedStitches
  return props.stitchIntroductions.length > 0
})

const hasVisibleContent = computed(
  () =>
    showDescriptionResolved.value ||
    showMaterialsResolved.value ||
    showSelfDefinedStitchesResolved.value ||
    Boolean(slots.default)
)
</script>

<style scoped>
.project-description {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.project-description--page {
  margin: 1rem 0;
  padding: 0 1rem;
}

.project-materials {
  width: min(680px, 100%);
  padding: 0;
}

.project-materials__title {
  font-weight: 900;
  color: #111827;
  margin-bottom: 0.5rem;
}

.project-materials__row {
  display: grid;
  grid-template-columns: 0.2fr 1.3fr;
  gap: 0.75rem;
  align-items: start;
  padding: 0.35rem 0;
}

.project-materials__label {
  font-size: 0.85rem;
  font-weight: 900;
  color: #6b7280;
}

.project-materials__value {
  font-size: 0.9rem;
  white-space: pre-wrap;
  width: fit-content;
}

.project-stitch-intro {
  width: min(680px, 100%);
  padding: 1rem;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(17, 24, 39, 0.06);
}

.project-stitch-intro__title {
  font-weight: 900;
  color: #111827;
  margin-bottom: 0.5rem;
}

.project-stitch-intro__name {
  font-weight: 900;
  color: #111827;
}

.project-stitch-intro__description {
  font-weight: 700;
  color: #374151;
  line-height: 1.55;
  white-space: pre-wrap;
}

/* Project page */
.project-description--page .project-description-text {
  width: min(680px, 100%);
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.55;
  white-space: pre-wrap;
  padding: 1.5rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.5);
  font-weight: 800;
  border: 0.3rem solid var(--color-surface-page);
}

.project-description--page .project-stitch-intro__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.75rem;
}

.project-description--page .project-stitch-intro__item {
  padding: 0.5rem 0;
  border-top: 1px solid rgba(17, 24, 39, 0.06);
}

.project-description--page .project-stitch-intro__item:first-child {
  border-top: none;
  padding-top: 0;
}

.project-description--page .project-stitch-intro__name {
  font-size: 0.95rem;
}

.project-description--page .project-stitch-intro__description {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
}

/* Design print export */
.project-description--print .project-description-text {
  width: min(680px, 100%);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  color: #111827;
  font-weight: 800;
}

.project-description--print .project-stitch-intro__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.project-description--print .project-stitch-intro__description {
  margin: 0.15rem 0 0;
}
</style>
