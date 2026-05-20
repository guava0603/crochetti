<template>
  <div class="add-project-info">

    <form @submit.prevent="handleNext" class="step-form">
      <FormSubsection
        kind="text"
        :title="t('addProject.info.projectNameLabel')"
        for-id="projectName"
        v-model="formData.name"
        :placeholder="t('addProject.info.projectNamePlaceholder')"
        required
      />

      <FormSubsection
        kind="textarea"
        :title="t('addProject.info.descriptionLabel')"
        for-id="projectDescription"
        v-model="formData.description"
        :placeholder="t('addProject.info.descriptionPlaceholder')"
        :rows="3"
      />

      <FormSubsectionList
        kind="materials"
        :title="t('project.componentMetadata.title')"
        v-model="formData.materials"
        :show-hook="true"
        :show-needle="false"
        :component-list="componentList"
        @update:component-list="(v) => emit('update:component-list', v)"
      />

      <FormSubsection
        kind="images"
        :title="t('addProject.info.imagesLabel')"
        v-model="formData.image_files"
        :existing-images="existingImages"
        :max-images="maxImages"
        @remove-existing-image="(idx) => emit('remove-existing-image', idx)"
      />
    </form>

  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import FormSubsection from '@/components/AddProject/FormSubsection.vue'
import FormSubsectionList from '@/components/AddProject/FormSubsectionList.vue'
import { DEFAULT_PROJECT_CRAFT_TYPES } from '@/constants/projectCraft'
import { openError } from '@/services/ui/error'
import { normalizeYarnMetaList } from '@/utils/yarnMeta'
import { v4 as uuidv4 } from '@lukeed/uuid'
import { toTrimmedText as toText, uniqueTrimmedStrings } from '@/utils/text'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  initialData: {
    type: Object,
    default: () => ({
      name: '',
      craft_types: [...DEFAULT_PROJECT_CRAFT_TYPES],
      description: '',
      image_files: [],
      materials: { hook: [], needle: [], yarn: [] }
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

const formData = ref({
  name: props.initialData.name || '',
  craft_types: [...DEFAULT_PROJECT_CRAFT_TYPES],
  description: props.initialData.description || '',
  image_files: Array.isArray(props.initialData.image_files) ? props.initialData.image_files : [],
  materials: {
    hook: uniqueTrimmedStrings(props.initialData?.materials?.hook),
    needle: [],
    yarn: normalizeYarnMetaList(props.initialData?.materials?.yarn)
  }
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
    hook: uniqueTrimmedStrings(props.initialData?.materials?.hook),
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

  const hook = uniqueTrimmedStrings(formData.value?.materials?.hook)
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
    craft_types: [...DEFAULT_PROJECT_CRAFT_TYPES],
    materials: {
      hook: uniqueTrimmedStrings(formData.value?.materials?.hook),
      needle: [],
      yarn: normalizeYarnMetaList(formData.value?.materials?.yarn)
        .map((m) => ({ id: toText(m?.id) || uuidv4(), type: toText(m?.type), amount: toText(m?.amount) }))
        .filter((m) => m.type)
    }
  }

  emit('next', next)
}

const canSubmit = computed(() => Boolean(String(formData.value?.name || '').trim()))

defineExpose({
  submit: handleNext,
  canSubmit
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
