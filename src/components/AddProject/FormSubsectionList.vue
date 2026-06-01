<template>
  <div v-if="shouldRenderSubsection" :class="wrapperClass">
    <div
      class="subsection-header"
      :class="headerClass || undefined"
    >
      <div class="label-wrapper">
        <div v-if="resolvedTitle" class="subsection-title">{{ resolvedTitle }}</div>
        <span v-if="required" class="required-badge">必填</span>
      </div>
    </div>

    <!-- Project materials (hook/needle lists + yarn meta rows) -->
    <div class="materials-wrapper" v-if="resolvedKind === 'materials'">
      <div v-if="showHookComputed" class="materials-input">
        <div class="label-wrapper">
          <label>{{ t('project.componentMetadata.hook') }}</label>
        </div>

        <FormSubsectionInputContent
          repeatable
          :items="hookItemsModel"
          :show-delete="!disabled"
          :show-add="canAddHook"
          :disabled="disabled"
          :add-aria-label="t('common.add')"
          :delete-aria-label="t('common.delete')"
          @add="addHookRow"
          @delete="removeHookAt"
        >
          <template #item="{ item, idx }">
            <SelectionInputCombineList
              :model-value="String(item ?? '')"
              :placeholder="t('project.componentMetadata.hookPlaceholder')"
              :suggestions="hookSuggestions"
              :disabled="disabled"
              @update:modelValue="(v) => updateHookAt(idx, v)"
              @blur="() => handleHookBlur(idx)"
            />
          </template>
        </FormSubsectionInputContent>
      </div>

      <div v-if="showNeedleComputed" class="materials-input">
        <div class="label-wrapper">
          <label>{{ t('project.componentMetadata.needle') }}</label>
        </div>

        <FormSubsectionInputContent
          repeatable
          :items="needleItemsModel"
          :show-delete="!disabled"
          :show-add="canAddNeedle"
          :disabled="disabled"
          :add-aria-label="t('common.add')"
          :delete-aria-label="t('common.delete')"
          @add="addNeedleRow"
          @delete="removeNeedleAt"
        >
          <template #item="{ item, idx }">
            <SelectionInputCombineList
              :model-value="String(item ?? '')"
              :placeholder="t('project.componentMetadata.needlePlaceholder')"
              :suggestions="needleSuggestions"
              :disabled="disabled"
              @update:modelValue="(v) => updateNeedleAt(idx, v)"
              @blur="() => handleNeedleBlur(idx)"
            />
          </template>
        </FormSubsectionInputContent>
      </div>

      <div class="label-wrapper">
        <label>{{ t('project.componentMetadata.yarn') }}</label>
      </div>

      <div class="yarn-meta">
        <div class="yarn-meta__rows">
          <FormSubsectionInputContent
            v-for="(item, idx) in yarnItems"
            :key="String(item?.id || idx)"
            row-class="yarn-meta__row"
            :wrap-input="false"
            :show-delete="true"
            :disabled="disabled"
            :delete-aria-label="t('common.delete')"
            @delete="removeYarnMetaAt(idx)"
          >
            <div class="yarn-meta__cell yarn-meta__cell--type">
              <SelectionInputCombineList
                :model-value="String(item?.type || '')"
                :placeholder="t('project.componentMetadata.yarnTypePlaceholder')"
                :suggestions="yarnTypeSuggestions"
                @update:modelValue="(v) => updateYarnTypeAt(idx, v)"
                @blur="() => handleYarnTypeBlur(idx)"
              />
            </div>

            <div class="yarn-meta__cell yarn-meta__cell--amount">
              <SelectionInputCombineList
                :model-value="String(item?.amount || '')"
                :placeholder="t('project.componentMetadata.yarnAmountPlaceholder')"
                :suggestions="yarnAmountSuggestions"
                @update:modelValue="(v) => updateYarnAmountAt(idx, v)"
                @blur="() => handleYarnAmountBlur(idx)"
              />
            </div>
          </FormSubsectionInputContent>
        </div>

        <FormSubsectionInputContent
          :wrap-input="false"
          :show-add="canAddYarnMeta"
          :disabled="disabled"
          :add-aria-label="t('common.add')"
          @add="addYarnMetaRow"
        />
      </div>
    </div>

    <!-- Component card material options (hook/yarn selection) -->
    <div
      v-else-if="resolvedKind === 'component-material-options'"
      class="component-material-row"
      :class="{ 'component-material-row--single': isSingleComponentMaterialField }"
    >
      <div
        v-if="showHookComputed && componentHookSuggestionsResolved.length"
        class="component-material-field component-material-field--inline"
      >
        <div class="component-material-field__label">{{ t('project.componentMetadata.hook') }}</div>
        <AddableMultiSelectionList
          :model-value="hookModel"
          :suggestions="componentHookSuggestionsResolved"
          :placeholder="t('addProject.design.hookSelectPlaceholder')"
          :disabled="disabled"
          @update:modelValue="(v) => emit('update:hook', Array.isArray(v) ? v : [])"
        />
      </div>

      <div
        v-if="showNeedleComputed && componentNeedleSuggestionsResolved.length"
        class="component-material-field component-material-field--inline"
      >
        <div class="component-material-field__label">{{ t('project.componentMetadata.needle') }}</div>
        <AddableMultiSelectionList
          :model-value="needleModel"
          :suggestions="componentNeedleSuggestionsResolved"
          :placeholder="t('addProject.design.needleSelectPlaceholder')"
          :disabled="disabled"
          @update:modelValue="(v) => emit('update:needle', Array.isArray(v) ? v : [])"
        />
      </div>

      <div v-if="componentYarnOptionsResolved.length" class="component-material-field component-material-field--inline">
        <div class="component-material-field__label">{{ t('project.componentMetadata.yarn') }}</div>
        <AddableMultiSelectionList
          :model-value="yarnModel"
          :options="componentYarnOptionsResolved"
          :placeholder="t('addProject.design.yarnSelectPlaceholder')"
          :disabled="disabled"
          @update:modelValue="(v) => emit('update:yarn', Array.isArray(v) ? v : [])"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import FormSubsectionInputContent from '@/components/AddProject/FormSubsectionInputContent.vue'
import AddableMultiSelectionList from '@/components/Selection/AddableMultiSelectionList.vue'
import SelectionInputCombineList from '@/components/Input/SelectionInputCombineList.vue'

import { openConfirmation } from '@/services/ui/confirmation'
import { v4 as uuidv4 } from '@lukeed/uuid'
import {
  removeYarnMetaFromComponents,
  stripComponentYarnAmountMetadata,
  yarnMetaUsageCount
} from '@/utils/yarnMeta'
import { toTrimmedText as toText, uniqueTrimmedStrings as uniqueList } from '@/utils/text'

defineOptions({ name: 'FormSubsectionList' })

const props = defineProps({
  wrapperClass: { type: String, default: 'form-group' },
  headerClass: { type: String, default: '' },

  title: { type: String, default: '' },

  required: { type: Boolean, default: false },

  kind: {
    type: String,
    default: 'materials',
    validator: (v) => ['materials', 'component-material-options'].includes(v)
  },

  disabled: { type: Boolean, default: false },

  // materials visibility
  showHook: { type: Boolean, default: true },
  showNeedle: { type: Boolean, default: true },

  // materials (v-model)
  modelValue: { type: Object, default: null },
  componentList: { type: Array, default: null },

  // component-material-options
  hook: { type: Array, default: () => [] },
  needle: { type: Array, default: () => [] },
  yarn: { type: Array, default: () => [] },
  componentHookSuggestions: { type: Array, default: () => [] },
  componentNeedleSuggestions: { type: Array, default: () => [] },
  componentYarnOptions: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'update:component-list', 'update:hook', 'update:needle', 'update:yarn'])

const { t } = useI18n({ useScope: 'global' })

const resolvedKind = computed(() => String(props.kind || 'materials'))

const showHookComputed = computed(() => Boolean(props.showHook))
const showNeedleComputed = computed(() => Boolean(props.showNeedle))

const resolvedTitle = computed(() => {
  return String(props.title || '').trim()
})

const shouldRenderSubsection = computed(() => {
  if (resolvedKind.value !== 'component-material-options') return true
  return (showHookComputed.value && componentHookSuggestionsResolved.value.length > 0)
    || (showNeedleComputed.value && componentNeedleSuggestionsResolved.value.length > 0)
    || componentYarnOptionsResolved.value.length > 0
})

function cleanupTrailingEmptyStrings(value) {
  const list = Array.isArray(value) ? value.slice() : []
  while (list.length > 1 && !toText(list[list.length - 1]) && !toText(list[list.length - 2])) {
    list.pop()
  }
  return list
}

function normalizeStringListKeepEmpty(value) {
  const list = Array.isArray(value) ? value : []
  return list.map((v) => toText(v))
}

function normalizeStringListNonEmpty(value) {
  return normalizeStringListKeepEmpty(value).filter(Boolean)
}

function normalizeYarnMetaDraftList(rawList) {
  const list = Array.isArray(rawList) ? rawList : []
  const out = []

  for (const item of list) {
    if (typeof item === 'string') {
      const type = toText(item)
      if (!type) continue
      out.push({ id: uuidv4(), type, amount: '' })
      continue
    }

    if (!item || typeof item !== 'object') continue

    const id = toText(item.id) || uuidv4()
    const type = toText(item.type)
    const amount = toText(item.amount)
    out.push({ id, type, amount })
  }

  return out
}

const materialsModel = computed({
  get() {
    const v = props.modelValue
    if (!v || typeof v !== 'object' || Array.isArray(v)) return { hook: [], needle: [], yarn: [] }
    const hook = cleanupTrailingEmptyStrings(normalizeStringListKeepEmpty(v.hook))
    const needle = cleanupTrailingEmptyStrings(normalizeStringListKeepEmpty(v.needle))
    const yarn = normalizeYarnMetaDraftList(v.yarn)
    return { hook, needle, yarn }
  },
  set(next) {
    const v = next && typeof next === 'object' && !Array.isArray(next) ? next : { hook: [], needle: [], yarn: [] }
    const hook = cleanupTrailingEmptyStrings(normalizeStringListKeepEmpty(v.hook))
    const needle = cleanupTrailingEmptyStrings(normalizeStringListKeepEmpty(v.needle))
    const yarn = normalizeYarnMetaDraftList(v.yarn)
    emit('update:modelValue', { hook, needle, yarn })
  }
})

const hookItemsModel = computed({
  get: () => (Array.isArray(materialsModel.value.hook) ? materialsModel.value.hook : ['']),
  set: (next) => {
    const list = Array.isArray(next) ? next : []
    materialsModel.value = { ...materialsModel.value, hook: list }
  }
})

const hookSuggestions = computed(() => {
  const list = Array.isArray(materialsModel.value.hook) ? materialsModel.value.hook : []
  return uniqueList(normalizeStringListNonEmpty(list))
})

function addHookRow() {
  const list = Array.isArray(hookItemsModel.value) ? hookItemsModel.value : []
  if (list.length > 0 && !toText(list[list.length - 1])) return
  hookItemsModel.value = [...list, '']
}

const canAddHook = computed(() => {
  const list = Array.isArray(hookItemsModel.value) ? hookItemsModel.value : []
  if (list.length === 0) return true
  return toText(list[list.length - 1]).length > 0
})

function updateHookAt(idx, nextValue) {
  const list = Array.isArray(hookItemsModel.value) ? hookItemsModel.value : []
  const i = Number(idx)
  if (!Number.isFinite(i) || i < 0 || i >= list.length) return
  const next = list.slice()
  next[i] = String(nextValue ?? '')
  hookItemsModel.value = next
}

function removeHookAt(idx) {
  const list = Array.isArray(hookItemsModel.value) ? hookItemsModel.value : []
  const i = Number(idx)
  if (!Number.isFinite(i) || i < 0 || i >= list.length) return
  const next = list.slice()
  next.splice(i, 1)
  hookItemsModel.value = next
}

function handleHookBlur(idx) {
  const list = Array.isArray(hookItemsModel.value) ? hookItemsModel.value : []
  if (list.length === 0) return
  const i = Number(idx)
  if (!Number.isFinite(i) || i !== list.length - 1) return
  const last = toText(list[list.length - 1])
  if (last) return
  hookItemsModel.value = list.slice(0, -1)
}

const needleItemsModel = computed({
  get: () => (Array.isArray(materialsModel.value.needle) ? materialsModel.value.needle : ['']),
  set: (next) => {
    const list = Array.isArray(next) ? next : []
    materialsModel.value = { ...materialsModel.value, needle: list }
  }
})

const needleSuggestions = computed(() => {
  const list = Array.isArray(materialsModel.value.needle) ? materialsModel.value.needle : []
  return uniqueList(normalizeStringListNonEmpty(list))
})

function addNeedleRow() {
  const list = Array.isArray(needleItemsModel.value) ? needleItemsModel.value : []
  if (list.length > 0 && !toText(list[list.length - 1])) return
  needleItemsModel.value = [...list, '']
}

const canAddNeedle = computed(() => {
  const list = Array.isArray(needleItemsModel.value) ? needleItemsModel.value : []
  if (list.length === 0) return true
  return toText(list[list.length - 1]).length > 0
})

function updateNeedleAt(idx, nextValue) {
  const list = Array.isArray(needleItemsModel.value) ? needleItemsModel.value : []
  const i = Number(idx)
  if (!Number.isFinite(i) || i < 0 || i >= list.length) return
  const next = list.slice()
  next[i] = String(nextValue ?? '')
  needleItemsModel.value = next
}

function removeNeedleAt(idx) {
  const list = Array.isArray(needleItemsModel.value) ? needleItemsModel.value : []
  const i = Number(idx)
  if (!Number.isFinite(i) || i < 0 || i >= list.length) return
  const next = list.slice()
  next.splice(i, 1)
  needleItemsModel.value = next
}

function handleNeedleBlur(idx) {
  const list = Array.isArray(needleItemsModel.value) ? needleItemsModel.value : []
  if (list.length === 0) return
  const i = Number(idx)
  if (!Number.isFinite(i) || i !== list.length - 1) return
  const last = toText(list[list.length - 1])
  if (last) return
  needleItemsModel.value = list.slice(0, -1)
}

const yarnItems = computed(() => {
  return Array.isArray(materialsModel.value.yarn) ? materialsModel.value.yarn : []
})

function isYarnMetaEmpty(item) {
  return !toText(item?.type) && !toText(item?.amount)
}

const canAddYarnMeta = computed(() => {
  const list = yarnItems.value
  if (list.length === 0) return true
  return !isYarnMetaEmpty(list[list.length - 1])
})

const yarnTypeSuggestions = computed(() => {
  const types = yarnItems.value.map((x) => toText(x?.type)).filter(Boolean)
  return uniqueList(types)
})

const yarnAmountSuggestions = computed(() => {
  const amounts = yarnItems.value.map((x) => toText(x?.amount)).filter(Boolean)
  return uniqueList(amounts)
})

function setYarnList(next) {
  materialsModel.value = { ...materialsModel.value, yarn: Array.isArray(next) ? next : [] }
}

function addYarnMetaRow() {
  const list = yarnItems.value
  if (list.length > 0 && isYarnMetaEmpty(list[list.length - 1])) return
  setYarnList([...list, { id: uuidv4(), type: '', amount: '' }])
}

function updateYarnTypeAt(idx, nextType) {
  const list = yarnItems.value
  const i = Number(idx)
  if (!Number.isFinite(i) || i < 0 || i >= list.length) return
  const next = list.slice()
  next[i] = { ...next[i], id: toText(next[i]?.id) || uuidv4(), type: String(nextType ?? '') }
  setYarnList(next)
}

function updateYarnAmountAt(idx, nextAmount) {
  const list = yarnItems.value
  const i = Number(idx)
  if (!Number.isFinite(i) || i < 0 || i >= list.length) return
  const next = list.slice()
  next[i] = { ...next[i], id: toText(next[i]?.id) || uuidv4(), amount: String(nextAmount ?? '') }
  setYarnList(next)
}

function normalizeTypeKey(type) {
  return toText(type).toLowerCase()
}

function remapComponentYarnIds(componentList, idMap) {
  const list = Array.isArray(componentList) ? componentList : []
  return list.map((c) => {
    if (!c || typeof c !== 'object') return c
    if (c.type && c.type !== 'component') return c

    const prev = Array.isArray(c.yarn) ? c.yarn : []
    let changed = false
    const mapped = prev.map((raw) => {
      const v = toText(raw)
      const next = idMap.get(v)
      if (!next) return raw
      changed = true
      return next
    })

    if (!changed) return c

    const seen = new Set()
    const nextYarn = []
    for (const raw of mapped) {
      const v = toText(raw)
      if (!v || seen.has(v)) continue
      seen.add(v)
      nextYarn.push(v)
    }

    const nextMeta = stripComponentYarnAmountMetadata(
      c.metadata && typeof c.metadata === 'object' ? { ...c.metadata, yarn: nextYarn } : { yarn: nextYarn }
    )
    return { ...c, yarn: nextYarn, metadata: nextMeta }
  })
}

function dedupeYarnMetaByType(list) {
  const keptByKey = new Map()
  const removedToKeptId = new Map()
  const out = []

  for (const item of Array.isArray(list) ? list : []) {
    const id = toText(item?.id) || uuidv4()
    const type = toText(item?.type)
    const amount = toText(item?.amount)
    if (!type) continue

    const key = normalizeTypeKey(type)
    if (!key) continue

    const kept = keptByKey.get(key)
    if (!kept) {
      const normalized = { id, type, amount }
      keptByKey.set(key, normalized)
      out.push(normalized)
      continue
    }

    removedToKeptId.set(id, kept.id)
    if (!toText(kept.amount) && amount) kept.amount = amount
  }

  return { out, removedToKeptId }
}

function cleanupTrailingEmptyYarnMetaRow(list) {
  const xs = Array.isArray(list) ? list : []
  if (xs.length === 0) return xs
  const last = xs[xs.length - 1]
  if (!isYarnMetaEmpty(last)) return xs
  return xs.slice(0, -1)
}

function handleYarnTypeBlur(idx) {
  const list = yarnItems.value
  const i = Number(idx)
  let next = list
  if (Number.isFinite(i) && i === list.length - 1) next = cleanupTrailingEmptyYarnMetaRow(next)

  const { out, removedToKeptId } = dedupeYarnMetaByType(next)
  setYarnList(out)

  if (!removedToKeptId || removedToKeptId.size === 0) return
  if (!Array.isArray(props.componentList) || props.componentList.length === 0) return
  emit('update:component-list', remapComponentYarnIds(props.componentList, removedToKeptId))
}

function handleYarnAmountBlur(idx) {
  const list = yarnItems.value
  const i = Number(idx)
  if (!Number.isFinite(i) || i !== list.length - 1) return
  setYarnList(cleanupTrailingEmptyYarnMetaRow(list))
}

async function removeYarnMetaAt(idx) {
  const list = yarnItems.value
  const i = Number(idx)
  if (!Number.isFinite(i) || i < 0 || i >= list.length) return

  const item = list[i]
  const type = toText(item?.type)
  const meta = { id: toText(item?.id), type, amount: toText(item?.amount) }

  if (isYarnMetaEmpty(meta)) {
    const next = list.slice()
    next.splice(i, 1)
    setYarnList(next)
    return
  }

  const componentList = Array.isArray(props.componentList) ? props.componentList : []
  const used = componentList.length ? yarnMetaUsageCount(componentList, meta) : 0
  if (used > 0) {
    const ok = await openConfirmation({
      type: { id: 'removeYarnMetaUsed', params: { type } }
    })
    if (!ok) return
    emit('update:component-list', removeYarnMetaFromComponents(componentList, meta))
  }

  const next = list.slice()
  next.splice(i, 1)
  setYarnList(next)
}

const hookModel = computed(() => (Array.isArray(props.hook) ? props.hook : []))
const needleModel = computed(() => (Array.isArray(props.needle) ? props.needle : []))
const yarnModel = computed(() => (Array.isArray(props.yarn) ? props.yarn : []))
const componentHookSuggestionsResolved = computed(() => (Array.isArray(props.componentHookSuggestions) ? props.componentHookSuggestions : []))
const componentNeedleSuggestionsResolved = computed(() => (Array.isArray(props.componentNeedleSuggestions) ? props.componentNeedleSuggestions : []))
const componentYarnOptionsResolved = computed(() => (Array.isArray(props.componentYarnOptions) ? props.componentYarnOptions : []))

const didInitHookDefaultAll = ref(false)
const didInitNeedleDefaultAll = ref(false)
const didInitYarnDefaultAll = ref(false)

const hookDefaultAll = computed(() => {
  return uniqueList(normalizeStringListNonEmpty(componentHookSuggestionsResolved.value))
})

const needleDefaultAll = computed(() => {
  return uniqueList(normalizeStringListNonEmpty(componentNeedleSuggestionsResolved.value))
})

const yarnDefaultAll = computed(() => {
  const values = componentYarnOptionsResolved.value
    .map((o) => toText(o?.value))
    .filter(Boolean)
  return uniqueList(values)
})

watch(
  [() => resolvedKind.value, () => props.disabled, () => hookModel.value, () => hookDefaultAll.value],
  ([kind, disabled, selected, all]) => {
    if (kind !== 'component-material-options') return
    if (disabled) return
    if (!showHookComputed.value) return
    if (didInitHookDefaultAll.value) return

    const current = uniqueList(normalizeStringListNonEmpty(selected))
    if (current.length > 0) {
      didInitHookDefaultAll.value = true
      return
    }

    if (!Array.isArray(all) || all.length === 0) return
    didInitHookDefaultAll.value = true
    emit('update:hook', all)
  },
  { immediate: true }
)

watch(
  [() => resolvedKind.value, () => props.disabled, () => needleModel.value, () => needleDefaultAll.value],
  ([kind, disabled, selected, all]) => {
    if (kind !== 'component-material-options') return
    if (disabled) return
    if (!showNeedleComputed.value) return
    if (didInitNeedleDefaultAll.value) return

    const current = uniqueList(normalizeStringListNonEmpty(selected))
    if (current.length > 0) {
      didInitNeedleDefaultAll.value = true
      return
    }

    if (!Array.isArray(all) || all.length === 0) return
    didInitNeedleDefaultAll.value = true
    emit('update:needle', all)
  },
  { immediate: true }
)

watch(
  [() => resolvedKind.value, () => props.disabled, () => yarnModel.value, () => yarnDefaultAll.value],
  ([kind, disabled, selected, all]) => {
    if (kind !== 'component-material-options') return
    if (disabled) return
    if (didInitYarnDefaultAll.value) return

    const current = uniqueList(normalizeStringListNonEmpty(selected))
    if (current.length > 0) {
      didInitYarnDefaultAll.value = true
      return
    }

    if (!Array.isArray(all) || all.length === 0) return
    didInitYarnDefaultAll.value = true
    emit('update:yarn', all)
  },
  { immediate: true }
)

const isSingleComponentMaterialField = computed(() => {
  const count =
    (showHookComputed.value && componentHookSuggestionsResolved.value.length > 0 ? 1 : 0) +
    (showNeedleComputed.value && componentNeedleSuggestionsResolved.value.length > 0 ? 1 : 0) +
    (componentYarnOptionsResolved.value.length > 0 ? 1 : 0)
  return count <= 1
})
</script>

<style scoped>
.subsection-title {
  font-size: 1rem;
  color: #374151;
  font-weight: 600;
}

.materials-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.materials-input {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}


.yarn-meta {
  display: flex;
  flex-direction: column;
}

.yarn-meta__rows {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.3rem;
}

.yarn-meta__row {
  width: 100%;
  position: relative;
  display: grid;
  grid-template-columns: 1fr 0.8fr;
  gap: 0.2rem;
  align-items: center;
}

.yarn-meta__cell {
  min-width: 0;
}

.component-material-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.75rem;
  width: 100%;
}

.component-material-field {
  width: 100%;
  min-width: 0;
}

.component-material-field--inline {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.6rem;
}

.component-material-field--inline .component-material-field__label {
  flex: 0 0 auto;
  min-width: 3.25rem;
  padding-top: 0.25rem;
  font-size: 0.9rem;
  font-weight: 800;
  color: #374151;
  white-space: nowrap;
}

.component-material-field--inline > :not(.component-material-field__label) {
  flex: 1;
  min-width: 0;
}

.component-material-row--single {
  grid-template-columns: 1fr;
}

@media (max-width: 720px) {
  .component-material-row {
    grid-template-columns: 1fr;
  }
}

.component-material-selected {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.45rem;
}

.component-material-selected__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.06);
  color: #111827;
  font-size: 0.85rem;
  font-weight: 800;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
