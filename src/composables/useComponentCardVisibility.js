import { computed, unref } from 'vue'
import { resolveComponentCardVisibility } from '@/utils/componentCardVisibility'

export function useComponentCardVisibility(visibilitySource, defaults) {
  return computed(() => resolveComponentCardVisibility(unref(visibilitySource), defaults))
}
