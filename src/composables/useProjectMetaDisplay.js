import { computed, unref } from 'vue'
import {
  getProjectMaterialsHookLines,
  getProjectMaterialsYarnLines,
  getSelfDefinedStitchIntroductions
} from '@/utils/projectMetaDisplay'

export function useProjectMetaDisplay(projectSource) {
  const project = computed(() => unref(projectSource) ?? null)

  const description = computed(() => String(project.value?.description || '').trim())

  const hookLines = computed(() => getProjectMaterialsHookLines(project.value?.materials))

  const yarnLines = computed(() => getProjectMaterialsYarnLines(project.value?.materials))

  const stitchIntroductions = computed(() =>
    getSelfDefinedStitchIntroductions(project.value?.self_defined_stitches)
  )

  return {
    description,
    hookLines,
    yarnLines,
    stitchIntroductions
  }
}
