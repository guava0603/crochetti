<template>
  <div class="add-project-info">

    <form @submit.prevent="handleNext" class="step-form">
      <div class="form-group">
        <div class="label-wrapper">
          <label for="projectName">{{ $t('addProject.info.projectNameLabel') }}</label>
          <span class="required-badge">必填</span>
        </div>
        <input
          id="projectName"
          v-model="formData.name"
          type="text"
          :placeholder="$t('addProject.info.projectNamePlaceholder')"
          required
        />
      </div>

      <div class="form-group">
        <div class="label-wrapper">
          <label for="projectDescription">{{ $t('addProject.info.descriptionLabel') }}</label>
        </div>
        <textarea
          id="projectDescription"
          v-model="formData.description"
          :placeholder="$t('addProject.info.descriptionPlaceholder')"
          rows="5"
        ></textarea>
      </div>

      <div class="form-group">
        <div class="label-wrapper">
          <label>{{ $t('addProject.info.imagesLabel') }}</label>
        </div>

        <div class="existing-images" :aria-label="$t('image.existingImages')">
          <div class="existing-images__grid">
            <ImageBox
              v-for="(url, idx) in existingImageUrls"
              :key="`${idx}-${url}`"
              class="existing-images__item"
              :image-url="url"
              alt=""
              :aria-label="$t('image.openImage')"
              :openable="true"
              :show-delete="true"
              :delete-aria-label="$t('common.delete')"
              :stop-propagation="true"
              @delete="emit('remove-existing-image', idx)"
            />

            <ImageUploader
              v-model="formData.image_files"
              :max="remainingUploadSlots"
              accept="image/*"
              multiple
              :remove-text="$t('addProject.info.removeImage')"
              :max-error-text="$t('addProject.info.errors.maxImages', { max: maxImages })"
              :alt-text-for-index="(i) => $t('addProject.info.imageAlt', { n: i + 1 })"
              :disabled="remainingUploadSlots <= 0"
              use-parent-grid
            />
          </div>
        </div>
      </div>

      <div class="form-group">
        <div class="label-wrapper">
          <label>{{ $t('project.componentMetadata.title') }}</label>
        </div>

        <div class="materials-input">
          <ComponentMaterialField
            v-model:items="formData.materials.hook"
            input-type="selection"
            :label="$t('project.componentMetadata.hook')"
            :placeholder="$t('project.componentMetadata.hookPlaceholder')"
            :suggestions="normalizedMaterials.hook"
            :delete-aria-label="$t('common.delete')"
            @add="addHookRow"
            @item-blur="handleHookBlur"
          />
        </div>
        <div class="label-wrapper">
          <label>{{ $t('project.componentMetadata.yarn') }}</label>
        </div>

        <div class="yarn-meta">
          <div class="yarn-meta__rows">
            <div
              v-for="(item, idx) in formData.materials.yarn"
              :key="String(item?.id || idx)"
              class="yarn-meta__row"
            >
              <div class="yarn-meta__cell yarn-meta__cell--type">
                <SelectionInputCombineList
                  :model-value="String(item?.type || '')"
                  :placeholder="$t('project.componentMetadata.yarnTypePlaceholder')"
                  :suggestions="yarnTypeSuggestions"
                  @update:modelValue="(v) => updateYarnTypeAt(idx, v)"
                  @blur="() => handleYarnTypeBlur(idx)"
                />
              </div>

              <div class="yarn-meta__cell yarn-meta__cell--amount">
                <SelectionInputCombineList
                  :model-value="String(item?.amount || '')"
                  :placeholder="$t('project.componentMetadata.yarnAmountPlaceholder')"
                  :suggestions="yarnAmountSuggestions"
                  @update:modelValue="(v) => updateYarnAmountAt(idx, v)"
                  @blur="() => handleYarnAmountBlur(idx)"
                />
              </div>

              <div class="yarn-meta__delete" :aria-label="$t('common.delete')">
                <ButtonDeleteLight @click="() => removeYarnMetaAt(idx)" />
              </div>
            </div>
          </div>

          <AddNew
            v-if="canAddYarnMeta"
            variant="row"
            size="md"
            @click="addYarnMetaRow"
          />
        </div>
      </div>
    </form>

  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ImageUploader from '@/components/Input/ImageUploader.vue'
import ImageBox from '@/components/Image/ImageBox.vue'
import ComponentMaterialField from '@/components/cards/ComponentMaterialField.vue'
import { openError } from '@/services/ui/error'
import AddNew from '@/components/buttons/AddNew.vue'
import ButtonDeleteLight from '@/components/buttons/ButtonDeleteLight.vue'
import SelectionInputCombineList from '@/components/Input/SelectionInputCombineList.vue'
import { openConfirmation } from '@/services/ui/confirmation'
import { v4 as uuidv4 } from '@lukeed/uuid'
import { normalizeYarnMetaList, yarnMetaUsageCount, removeYarnMetaFromComponents } from '@/utils/yarnMeta'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  initialData: {
    type: Object,
    default: () => ({
      name: '',
      description: '',
      image_files: [],
      materials: { hook: [''], yarn: [] }
    })
  },
  componentList: {
    type: Array,
    default: null
  },
  existingImages: {
    type: Array,
    default: () => []
  },
  maxImages: {
    type: Number,
    default: 3
  }
})

const emit = defineEmits(['next', 'dirty-change', 'remove-existing-image', 'update:component-list'])

function toText(v) {
  return String(v ?? '').trim()
}

const formData = ref({
  name: props.initialData.name || '',
  description: props.initialData.description || '',
  image_files: Array.isArray(props.initialData.image_files) ? props.initialData.image_files : [],
  materials: {
    hook: (() => {
      const raw = props.initialData?.materials?.hook
      return uniqueList(normalizeStringList(raw))
    })(),
    yarn: (() => {
      const normalized = normalizeYarnMetaList(props.initialData?.materials?.yarn)
      return normalized
    })()
  }
})

function addHookRow() {
  const list = Array.isArray(formData.value?.materials?.hook) ? formData.value.materials.hook : []
  if (list.length > 0 && !toText(list[list.length - 1])) return
  formData.value.materials.hook = [...list, '']
}

function handleHookBlur(idx) {
  const list = Array.isArray(formData.value?.materials?.hook) ? formData.value.materials.hook : []
  if (list.length === 0) return
  const i = Number(idx)
  if (!Number.isFinite(i) || i !== list.length - 1) return
  const last = toText(list[list.length - 1])
  if (last) return
  formData.value.materials.hook = list.slice(0, -1)
}

function normalizeStringList(value) {
  const list = Array.isArray(value) ? value : []
  return list
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
}

function uniqueList(list) {
  const seen = new Set()
  const out = []
  for (const raw of Array.isArray(list) ? list : []) {
    const v = String(raw ?? '').trim()
    if (!v) continue
    if (seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

const normalizedMaterials = computed(() => {
  const hook = uniqueList(normalizeStringList(formData.value?.materials?.hook))
  return { hook }
})

const yarnTypeSuggestions = computed(() => {
  const list = Array.isArray(formData.value?.materials?.yarn) ? formData.value.materials.yarn : []
  const types = list.map((x) => toText(x?.type)).filter(Boolean)
  return uniqueList(types)
})

const yarnAmountSuggestions = computed(() => {
  const list = Array.isArray(formData.value?.materials?.yarn) ? formData.value.materials.yarn : []
  const amounts = list.map((x) => toText(x?.amount)).filter(Boolean)
  return uniqueList(amounts)
})

function isYarnMetaEmpty(item) {
  // A yarn meta row is considered "empty" if it has no type.
  // (Amount without type is not meaningful and should be discarded.)
  return !toText(item?.type)
}

const canAddYarnMeta = computed(() => {
  const list = Array.isArray(formData.value?.materials?.yarn) ? formData.value.materials.yarn : []
  if (list.length === 0) return true
  const last = list[list.length - 1]
  return !isYarnMetaEmpty(last)
})

function addYarnMetaRow() {
  const list = Array.isArray(formData.value?.materials?.yarn) ? formData.value.materials.yarn : []
  if (list.length > 0 && isYarnMetaEmpty(list[list.length - 1])) return
  formData.value.materials.yarn = [...list, { id: uuidv4(), type: '', amount: '' }]
}

function updateYarnTypeAt(idx, nextType) {
  const list = Array.isArray(formData.value?.materials?.yarn) ? formData.value.materials.yarn : []
  const i = Number(idx)
  if (!Number.isFinite(i) || i < 0 || i >= list.length) return
  const next = list.slice()
  next[i] = { ...next[i], id: toText(next[i]?.id) || uuidv4(), type: String(nextType ?? '') }
  formData.value.materials.yarn = next
}

function updateYarnAmountAt(idx, nextAmount) {
  const list = Array.isArray(formData.value?.materials?.yarn) ? formData.value.materials.yarn : []
  const i = Number(idx)
  if (!Number.isFinite(i) || i < 0 || i >= list.length) return
  const next = list.slice()
  next[i] = { ...next[i], id: toText(next[i]?.id) || uuidv4(), amount: String(nextAmount ?? '') }
  formData.value.materials.yarn = next
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

    const nextMeta = c.metadata && typeof c.metadata === 'object' ? { ...c.metadata, yarn: nextYarn } : { yarn: nextYarn }
    return { ...c, yarn: nextYarn, metadata: nextMeta }
  })
}

function dedupeYarnMetaByTypeInPlace() {
  const list = Array.isArray(formData.value?.materials?.yarn) ? formData.value.materials.yarn : []
  const keptByKey = new Map()
  const removedToKeptId = new Map()
  const out = []

  for (const item of list) {
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

  formData.value.materials.yarn = out

  return removedToKeptId
}

function cleanupTrailingEmptyYarnMetaRow() {
  const list = Array.isArray(formData.value?.materials?.yarn) ? formData.value.materials.yarn : []
  if (list.length === 0) return
  const last = list[list.length - 1]
  if (!isYarnMetaEmpty(last)) return
  formData.value.materials.yarn = list.slice(0, -1)
}

function handleYarnTypeBlur(idx) {
  // If the user blurred the trailing draft row and left it empty, drop it.
  const list = Array.isArray(formData.value?.materials?.yarn) ? formData.value.materials.yarn : []
  const i = Number(idx)
  if (Number.isFinite(i) && i === list.length - 1) cleanupTrailingEmptyYarnMetaRow()

  const mapping = dedupeYarnMetaByTypeInPlace()
  if (!mapping || mapping.size === 0) return
  if (!Array.isArray(props.componentList) || props.componentList.length === 0) return
  emit('update:component-list', remapComponentYarnIds(props.componentList, mapping))
}

function handleYarnAmountBlur(idx) {
  const list = Array.isArray(formData.value?.materials?.yarn) ? formData.value.materials.yarn : []
  const i = Number(idx)
  if (!Number.isFinite(i) || i !== list.length - 1) return
  cleanupTrailingEmptyYarnMetaRow()
}

async function removeYarnMetaAt(idx) {
  const list = Array.isArray(formData.value?.materials?.yarn) ? formData.value.materials.yarn : []
  const i = Number(idx)
  if (!Number.isFinite(i) || i < 0 || i >= list.length) return

  const item = list[i]
  const type = toText(item?.type)
  const meta = { id: toText(item?.id), type, amount: toText(item?.amount) }

  // Allow removing the trailing empty draft row without prompts.
  if (isYarnMetaEmpty(meta)) {
    const next = list.slice()
    next.splice(i, 1)
    formData.value.materials.yarn = next
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
  formData.value.materials.yarn = next
}

const existingImageUrls = computed(() => {
  const max = Number.isFinite(props.maxImages) ? props.maxImages : 3
  const list = Array.isArray(props.existingImages) ? props.existingImages : []
  return list
    .filter((x) => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max)
})

const remainingUploadSlots = computed(() => {
  const max = Number.isFinite(props.maxImages) ? props.maxImages : 3
  return Math.max(0, max - existingImageUrls.value.length)
})

function normalizeImageList(value) {
  const list = Array.isArray(value) ? value : []
  return list
    .filter(Boolean)
    .map((x) => {
      if (typeof File !== 'undefined' && x instanceof File) return `file:${x.name}:${x.size}`
      return String(x)
    })
}

const initialSnapshot = {
  name: String(props.initialData?.name || ''),
  description: String(props.initialData?.description || ''),
  images: normalizeImageList(props.initialData?.image_files),
  materials: {
    hook: uniqueList(normalizeStringList(props.initialData?.materials?.hook)),
    yarn: normalizeYarnMetaList(props.initialData?.materials?.yarn)
      .map((m) => ({ type: toText(m?.type), amount: toText(m?.amount) }))
      .filter((m) => m.type)
  }
}

const isDirty = computed(() => {
  const name = String(formData.value?.name || '')
  const description = String(formData.value?.description || '')
  const images = normalizeImageList(formData.value?.image_files)
  if (name !== initialSnapshot.name) return true
  if (description !== initialSnapshot.description) return true
  if (JSON.stringify(images) !== JSON.stringify(initialSnapshot.images)) return true

  const hook = uniqueList(normalizeStringList(formData.value?.materials?.hook))
  const yarn = normalizeYarnMetaList(formData.value?.materials?.yarn)
    .map((m) => ({ type: toText(m?.type), amount: toText(m?.amount) }))
    .filter((m) => m.type)
  if (JSON.stringify(hook) !== JSON.stringify(initialSnapshot.materials.hook)) return true
  return JSON.stringify(yarn) !== JSON.stringify(initialSnapshot.materials.yarn)
})

watch(
  () => formData.value,
  () => {
    emit('dirty-change', Boolean(isDirty.value))
  },
  { deep: true, immediate: true }
)

const handleNext = () => {
  if (!formData.value.name.trim()) {
    openError({ title: t('common.error'), message: t('addProject.info.errors.projectNameRequired') })
    return
  }

  const next = {
    ...formData.value,
    materials: {
      hook: normalizedMaterials.value.hook,
      yarn: normalizeYarnMetaList(formData.value?.materials?.yarn)
        .map((m) => ({ id: toText(m?.id) || uuidv4(), type: toText(m?.type), amount: toText(m?.amount) }))
        .filter((m) => m.type)
    }
  }

  emit('next', next)
}

defineExpose({
  submit: handleNext
})
</script>

<style scoped>
.add-project-info {
  max-width: 600px;
  margin: 0 auto;
}

.existing-images {
  margin-bottom: 0.75rem;
}

.existing-images__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.existing-images__item {
  width: 100%;
  border: 0.1rem solid var(--color-border);
  border-radius: 0.8rem;
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

.yarn-meta__delete {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
}


</style>
