import { computed, unref, watch } from 'vue'
import {
  getHookSuggestions,
  getResolvedHookLines,
  getResolvedYarnLines,
  getYarnOptions,
  hasMaterialOptions,
  normalizeComponentMaterials
} from '@/utils/componentCardMaterials'

export function useComponentCardMaterials(componentSource, materialsSource) {
  const component = computed(() => unref(componentSource))
  const materials = computed(() => unref(materialsSource))

  function syncMaterials() {
    const c = component.value
    if (!c || typeof c !== 'object') return
    normalizeComponentMaterials(c, materials.value)
  }

  watch([component, materials], syncMaterials, { immediate: true, deep: true })

  const resolvedYarnList = computed(() => getResolvedYarnLines(component.value, materials.value))
  const resolvedHookList = computed(() => getResolvedHookLines(component.value, materials.value))
  const yarnOptions = computed(() => getYarnOptions(component.value, materials.value))
  const hookSuggestions = computed(() => getHookSuggestions(component.value, materials.value))
  const hasOptions = computed(() => hasMaterialOptions(component.value, materials.value))

  return {
    resolvedYarnList,
    resolvedHookList,
    yarnOptions,
    hookSuggestions,
    hasMaterialOptions: hasOptions
  }
}
