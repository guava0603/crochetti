<template>
  <div class="download-design">
    <div v-if="noticeMessage" class="notice" role="status" aria-live="polite">
      {{ noticeMessage }}
    </div>

    <div v-if="loading" class="loading">
      {{ $t('project.loading') }}
    </div>

    <div v-else-if="permissionDenied" class="no-permission" role="status" aria-live="polite">
      {{ $t('project.noPermission') }}
    </div>

    <div v-else-if="projectData" class="content">
      <div class="header">
        <LastPage @click="backToProject" />
        <div class="header-actions">
          <div
            class="btn-download"
            :disabled="downloading"
            @click="downloadDesign"
          >
            <ButtonPrinter />
          </div>
        </div>
      </div>

      <h1 class="title">{{ projectData.name }}</h1>

      <div ref="captureRef" class="capture">
        <section
          v-for="(component, cIndex) in componentList"
          :key="cIndex"
          class="component"
        >
          <h2 class="component-title">{{ component.name }}</h2>
          <table class="design-table">
            <tbody>
              <template v-for="row in component.content.row_list" :key="row.row_index">
                <tr>
                  <td class="cell cell-index">{{ row.row_index }}</td>
                  <td class="cell cell-stitches">
                    {{ getRowStitchesText(row) }}
                  </td>
                  <td class="cell cell-generate">{{ row?.content?.generate ?? '' }}</td>
                </tr>
                <tr v-if="getRowRepeatCount(row) > 1" class="repeat-reminder-row">
                  <td class="cell repeat-reminder" colspan="3">{{ $t('common.repeatDo') }}{{ getRowRepeatCount(row) }}{{ $t('common.rowUnit') }}</td>
                </tr>
              </template>
            </tbody>
          </table>
        </section>
      </div>
    </div>

    <div v-else>
      <p>{{ $t('project.notFound') }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auth } from '@/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import LastPage from '@/components/buttons/LastPage.vue'
import ButtonPrinter from '@/components/buttons/svg/ButtonPrinter.vue'
import { fetchProject } from '@/services/firestore/projects'
import { getPatternItemDisplay } from '@/constants/crochetData.js'
import { useCrochetLang } from '@/composables/useCrochetLang'
import { buildStitchLookup } from '@/utils/calculateConsumeGenerate.js'

const route = useRoute()
const router = useRouter()
const projectId = ref(route.params.project_id)

const loading = ref(true)
const permissionDenied = ref(false)
const projectData = ref(null)

const captureRef = ref(null)
const downloading = ref(false)

const { crochetLang } = useCrochetLang()

const stitchLookup = computed(() => {
  const list = projectData.value?.self_defined_stitches
  return buildStitchLookup(Array.isArray(list) ? list : [])
})

const noticeMessage = ref('')
let noticeTimer = null

function showNotice(message) {
  noticeMessage.value = String(message || '')
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    noticeMessage.value = ''
  }, 2200)
}

const getRowStitchesText = (row) => {
  const list = row?.content?.stitch_node_list
  if (!Array.isArray(list) || list.length === 0) return ''
  return list
    .map((node) => getPatternItemDisplay(node, crochetLang.value, stitchLookup.value))
    .join(', ')
}

const getRowRepeatCount = (row) => {
  const raw = row?.repeat_count ?? row?.count ?? row?.repeatCount
  const n = Number(raw ?? 1)
  if (!Number.isFinite(n)) return 1
  return Math.max(1, Math.trunc(n))
}

const componentList = computed(() => {
  const list = projectData.value?.component_list
  if (!Array.isArray(list)) return []
  return list.filter((c) => (c?.type || 'component') === 'component')
})

const sanitizeFileName = (name) => {
  return String(name || 'design')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 120)
}

const backToProject = () => {
  router.go(-1)
}

const downloadDesign = async () => {
  const el = captureRef.value
  if (!el) {
    showNotice('Nothing to download.')
    return
  }

  downloading.value = true
  try {
    await nextTick()
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready
    }

    const { toPng } = await import('html-to-image')
    const dataUrl = await toPng(el, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#ffffff'
    })

    const fileName = `${sanitizeFileName(projectData.value?.name)}.png`
    const link = document.createElement('a')
    link.download = fileName
    link.href = dataUrl
    link.click()
    showNotice('Download started.')
  } catch (error) {
    console.error('Failed to download design:', error)
    showNotice('Download failed.')
  } finally {
    downloading.value = false
  }
}

onMounted(async () => {
  loading.value = true
  permissionDenied.value = false
  projectData.value = null

  const waitForAuthReady = () =>
    new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe()
        resolve(user)
      })
    })

  try {
    await waitForAuthReady()
    projectData.value = await fetchProject(projectId.value)
  } catch (error) {
    console.error('Error entering download design:', error)
    permissionDenied.value = String(error?.code || '') === 'permission-denied'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.download-design {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: calc(2rem + env(safe-area-inset-bottom));
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.header__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
}

.title {
  margin: 0 0 1.25rem;
  text-align: center;
}

.component {
  width: 100%;
}

.component-title {
  margin: 0 0 0.75rem;
  font-size: 1.05rem;
  font-weight: 900;
  color: #111827;
}

.btn-download {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(17, 24, 39, 0.12);
  background: rgba(17, 24, 39, 0.04);
  color: #111827;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.05s ease;
}

.btn-download :deep(.button-printer) {
  cursor: inherit;
  color: currentColor;
}

.btn-download:hover:not(:disabled) {
  background: rgba(17, 24, 39, 0.08);
  border-color: rgba(17, 24, 39, 0.18);
}

.btn-download:active:not(:disabled) {
  transform: translateY(1px);
}

.btn-download:focus-visible {
  outline: 2px solid rgb(var(--color-icon-add-rgb) / 0.55);
  outline-offset: 2px;
}

.btn-download:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.notice {
  position: sticky;
  top: 0.75rem;
  z-index: 50;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1px solid rgb(var(--color-icon-add-rgb) / 0.35);
  background: rgb(var(--color-icon-add-rgb) / 0.12);
  color: #0f5132;
  font-weight: 700;
}

.no-permission {
  padding: 2.5rem 1rem;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 800;
  color: #374151;
}

/* Capture surface */
.capture {
  display: inline-grid;
  grid-template-columns: max-content;
  row-gap: 1.75rem;
  background: white;
  padding: 1rem;
  border-radius: 12px;
}

.design-table {
  width: fit-content;
  border-collapse: collapse;
  border: 1px solid #e5e7eb;
  background: white;
}

.cell {
  padding: 0.25rem 0.75rem;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
  vertical-align: middle;
  font-size: 0.875rem;
  line-height: 1.8;
}

.design-table tr:last-child .cell {
  border-bottom: none;
}

.design-table .cell:last-child {
  border-right: none;
}

.cell-index {
  font-size: 1rem;
  font-weight: 800;
  text-align: center;
  background: #f9fafb;
  color: #111827;
}

.repeat-reminder-row .repeat-reminder {
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.1;
  padding-top: 0.35rem;
  padding-bottom: 0.45rem;
  text-align: left;
}

.cell-stitches {
  color: var(--color-icon-base);
}

.cell-generate {
  font-size: 1rem;
  font-weight: 800;
  text-align: center;
  background: #f9fafb;
  /* color: #065f46; */
}
</style>
