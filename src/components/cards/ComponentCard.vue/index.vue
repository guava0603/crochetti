<template>
  <div class="component-card">
    <div v-if="showStepBadge" class="component-card__step">
      {{ t('addProject.design.stepCounter', { n: stepBadgeN, m: stepBadgeM }) }}
    </div>

    <div class="card-header">
      <div class="card-title-row">
        <input
          v-if="isEditing"
          v-model="component.name"
          class="component-text component-title-row__name"
          type="text"
        />
        <h4 v-else class="component-title-row__name">{{ component.name }}</h4>

        <div
          v-if="isPartComponent(component)"
          class="component-title-row__cast-on"
        >
          <SelectionInput
            v-if="isEditing"
            v-model="component.content.type"
            :options="castOnOptions"
            :placeholder="t('project.castOnType')"
          />
          <div
            v-else-if="castOnLabel"
            class="component-cast-on-tag"
            :title="t('project.castOnType')"
          >
            {{ castOnLabel }}
          </div>
        </div>
      </div>

      <div class="card-actions">
        <slot name="actions"></slot>
      </div>
    </div>

    <ComponentCardComponent
      v-if="isPartComponent(component)"
      :component="component"
      :is-editing="isEditing"
    />
    <ComponentCardStitch
      v-else
      :component="component"
      :is-editing="isEditing"
      :component-list="componentList"
      :component-index="componentIndex"
    />

    <div v-if="isEditing" class="subsection">
      <ButtonDelete
        class="component-remove-btn"
        :text="t('project.removeComponentAction')"
        :type="{ id: 'removeComponent', params: { name: component?.name || '' } }"
        @click="$emit('remove')"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CastOn } from '@/constants/crochetData'
import ButtonDelete from '@/components/buttons/ButtonDelete.vue'
import SelectionInput from '@/components/tools/SelectionInput.vue'
import ComponentCardComponent from './Component.vue'
import ComponentCardStitch from './Stitch.vue'

const { t } = useI18n({ useScope: 'global' })

defineOptions({
  name: 'ComponentCard'
})

defineEmits(['remove', 'confirm', 'cancel', 'update:component'])

const props = defineProps({
  component: {
    type: Object,
    required: true
  },
  componentList: {
    type: Array,
    default: null
  },
  componentIndex: {
    type: Number,
    default: -1
  },
  isEditing: {
    type: Boolean,
    default: false
  },
  showEditActions: {
    type: Boolean,
    default: true
  }
})

const component = computed(() => props.component)
const componentList = computed(() => props.componentList)
const componentIndex = computed(() => props.componentIndex)
const isEditing = computed(() => props.isEditing)

function isPartComponent(c) {
  return !c?.type || c?.type === 'component'
}

const castOnOptions = computed(() => {
  return (CastOn || []).map((castOn) => ({
    value: castOn.index,
    label: t(castOn.nameKey)
  }))
})

const castOnLabel = computed(() => {
  const typeIndex = component.value?.content?.type
  if (typeIndex === null || typeIndex === undefined) return ''
  const option = castOnOptions.value.find((o) => o?.value === typeIndex)
  return option?.label || ''
})

const stepBadgeM = computed(() => {
  const list = Array.isArray(componentList.value) ? componentList.value : []
  return list.length
})

const stepBadgeN = computed(() => {
  const m = stepBadgeM.value
  if (m <= 0) return 0
  const idx = Number.isFinite(Number(componentIndex.value)) ? Number(componentIndex.value) : -1
  const safeIdx = Math.min(m - 1, Math.max(0, idx))
  return safeIdx + 1
})

const showStepBadge = computed(() => {
  return componentIndex.value != null && componentIndex.value >= 0 && stepBadgeM.value > 0
})
</script>

<style scoped>
.component-card {
  background: var(--color-surface-page);
  border: 1px solid var(--color-border-warm);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  position: relative;
}

.component-card__step {
  position: absolute;
  top: -1rem;
  left: 12px;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 900;
  color: #374151;
  background: rgba(17, 24, 39, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.card-title-row {
  flex: 1;
  min-width: 0;
  display: flex;
  grid-template-columns: minmax(0, 1fr) 110px;
  gap: 0.5rem;
  align-items: center;
}

.card-header h4 {
  margin: 0;
  color: #111827;
}

.component-title-row__name {
  min-width: 0;
  flex: 1;
  font-weight: 700;
}

.component-title-row__cast-on {
  min-width: 0;
}

.component-cast-on-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  border: 2px solid var(--color-warm-brown);
  background: var(--color-white);
  color: var(--color-warm-brown);
  font-size: 0.8rem;
  font-weight: 900;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.component-text {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  resize: vertical;
}

.component-text:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.12);
}

.subsection {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

:deep(.component-remove-btn) {
  min-width: 84px;
  height: 32px;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  border-radius: 8px;
}
</style>
