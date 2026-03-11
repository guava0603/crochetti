<template>
  <div class="component-card">
    <div v-if="showStepBadge" class="component-card__step">
      {{ t('addProject.design.stepCounter', { n: stepBadgeN, m: stepBadgeM }) }}
    </div>

    <div class="card-header">
      <div class="card-actions">
        <slot name="actions"></slot>
      </div>
    </div>

    <div class="component-card-subsection component-card-subsection--first">
      <div class="component-name-row">
        <input
          v-if="isEditing"
          v-model="component.name"
          class="component-text component-title-row__name"
          type="text"
        />
        <div v-else class="component-name-display component-title-row__name">{{ component.name }}</div>

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
    </div>

    <ComponentCardComponent
      v-if="isPartComponent(component)"
      :component="component"
      :is-editing="isEditing"
      :materials="materials"
      :help-topic-id="helpTopicId"
      :help-topic-ids="helpTopicIds"
    />
    <ComponentCardStitch
      v-else
      :component="component"
      :is-editing="isEditing"
      :component-list="componentList"
      :component-index="componentIndex"
    />

    <div v-if="isEditing" class="component-card__bottom-actions">
      <button type="button" class="component-remove-bottom" @click="handleRemove">
        <span class="component-remove-bottom__text">{{ t('project.removeComponentAction') }}</span>
      </button>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CastOn } from '@/constants/crochetData'
import { openConfirmation } from '@/services/ui/confirmation'
import SelectionInput from '@/components/tools/SelectionInput.vue'
import ComponentCardComponent from './Component.vue'
import ComponentCardStitch from './Stitch.vue'

const { t } = useI18n({ useScope: 'global' })

defineOptions({
  name: 'ComponentCard'
})

const emit = defineEmits(['remove', 'confirm', 'cancel', 'update:component'])

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
  },
  helpTopicId: {
    type: String,
    default: ''
  },
  helpTopicIds: {
    type: Object,
    default: null
  },
  materials: {
    type: Object,
    default: null
  }
})

const component = computed(() => props.component)
const componentList = computed(() => props.componentList)
const componentIndex = computed(() => props.componentIndex)
const isEditing = computed(() => props.isEditing)
const helpTopicId = computed(() => props.helpTopicId)
const helpTopicIds = computed(() => props.helpTopicIds)

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

async function handleRemove() {
  return openConfirmation({
    type: { id: 'removeComponent', params: { name: component.value?.name || '' } },
    onConfirm: async () => {
      emit('remove')
    }
  })
}
</script>

<style scoped>
.component-card {
  --color-border-edit-project: var(--color-border-warm);

  background: var(--color-surface-page);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
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
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 1rem;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.component-title-row__name {
  min-width: 0;
  flex: 1;
  font-weight: 700;
}

.component-name-row {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
}

.component-card-subsection {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-hover);
}

.component-card-subsection--first {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.subsection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.subsection-header h5 {
  margin: 0;
  font-weight: 500;
  font-size: 1rem;
}

.component-name-display {
  color: #111827;
  font-size: 1.05rem;
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
  background: var(--color-warm-brown);
  color: var(--color-white);
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
  border-radius: 0.5rem;
  font-size: 0.95rem;
  resize: vertical;
}

.component-text:focus {
  outline: none;
  border-color: var(--color-icon-add);
  box-shadow: 0 0 0 2px rgb(var(--color-icon-add-rgb) / 0.12);
}


.component-card__bottom-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-hover);
  display: flex;
  align-items: center;
}

.component-remove-bottom {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 70%;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  border: none;
  background: var(--color-warning);
  color: white;
  font-weight: 900;
  cursor: pointer;
}

.component-remove-bottom:hover {
  background: rgb(var(--color-warning-rgb) / 0.18);
}

.component-remove-bottom__icon {
  width: 18px;
  height: 18px;
  filter: brightness(0) saturate(100%) invert(14%) sepia(76%) saturate(4916%) hue-rotate(356deg)
    brightness(92%) contrast(109%);
}

.component-remove-bottom__text {
  font-size: 0.95rem;
  font-weight: inherit;
}
</style>
