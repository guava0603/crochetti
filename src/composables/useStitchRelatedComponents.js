import { computed, unref, watch } from 'vue'
import {
  buildRelatedComponentOptions,
  ensureStitchComponentFields,
  filterRelatedComponentIds,
  relatedComponentDisplayNames,
  stitchSequenceNumber
} from '@/utils/componentCardStitch'

export function useStitchRelatedComponents(componentSource, componentListSource, componentIndexSource) {
  const component = computed(() => unref(componentSource))
  const componentList = computed(() => unref(componentListSource))
  const componentIndex = computed(() => unref(componentIndexSource))

  function syncFields() {
    ensureStitchComponentFields(component.value)
  }

  watch(component, syncFields, { immediate: true, deep: true })

  const stitchOrderN = computed(() =>
    stitchSequenceNumber(componentList.value, componentIndex.value)
  )

  const relatedComponentOptions = computed(() =>
    buildRelatedComponentOptions(componentList.value, componentIndex.value)
  )

  const relatedComponentNames = computed(() =>
    relatedComponentDisplayNames(component.value, componentList.value)
  )

  const relatedComponentIdsModel = computed({
    get() {
      const allowed = relatedComponentOptions.value.map((o) => String(o?.value ?? '').trim()).filter(Boolean)
      return filterRelatedComponentIds(component.value?.related_component_ids, allowed)
    },
    set(next) {
      ensureStitchComponentFields(component.value)
      const allowed = relatedComponentOptions.value.map((o) => String(o?.value ?? '').trim()).filter(Boolean)
      component.value.related_component_ids = filterRelatedComponentIds(next, allowed)
    }
  })

  return {
    stitchOrderN,
    relatedComponentOptions,
    relatedComponentNames,
    relatedComponentIdsModel,
    ensureStitchComponentFields: syncFields
  }
}
