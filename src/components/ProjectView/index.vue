<template>
  <Teleport to=".top-banner__side--right">
    <div class="project-banner-actions" @click.stop>
      <MoreMenu
        :label="t('common.actions')"
        :items="projectSettingsMenuItems"
        :sections="projectSettingsMenuSections"
      />
    </div>
  </Teleport>

  <div class="project-view">
    <div v-if="noticeMessage" class="notice" role="status" aria-live="polite">
      {{ noticeMessage }}
    </div>

    <div v-if="loading">
      {{ $t('project.loading') }}
    </div>

    <div v-else-if="permissionDenied" class="no-permission" role="status" aria-live="polite">
      {{ $t('project.noPermission') }}
    </div>

    <div
      v-else-if="projectData"
      class="page-content"
    >
      <ImageGroup v-if="projectImages.length" :images="projectImages" class="project-image-carousel" />

      <BottomSheetScroll
        class="project-content"
        :min-pct="65"
        :max-pct="90"
        :initial-pct="65"
        :snap-on-first-gesture="true"
        :binary-snap="true"
        css-var-prefix="project"
        :style="{ '--bottom-sheet-max-width': '1200px', '--bottom-sheet-z': '55' }"
      >
        <template #header>
          <div class="header-with-time">
            <div class="project-title-section">
              <span>{{ projectData.name }}</span>
            </div>

            <div v-if="projectCreatedAtCompact" class="created-time-pill" role="note" aria-label="Created time">
              <div class="created-time-pill__row">發佈於：{{ projectCreatedAtCompact }}</div>
              <div v-if="showProjectUpdatedLine" class="created-time-pill__row">
                更新於：{{ projectUpdatedAtCompact }}
              </div>
            </div>
          </div>
        </template>

        <div class="project-description">
          <p v-if="projectData?.description?.length > 0" class="project-description-text">
            {{ projectData.description }}
          </p>

          <div
            v-if="projectMaterialsHookLines.length > 0 || projectMaterialsYarnLines.length > 0"
            class="project-materials"
            :aria-label="t('project.componentMetadata.title')"
          >
            <div class="project-materials__title">{{ t('project.componentMetadata.title') }}</div>

            <div v-if="projectMaterialsHookLines.length > 0" class="project-materials__row">
              <span class="project-materials__label">{{ t('project.componentMetadata.hook') }}</span>
              <span class="project-materials__value">{{ projectMaterialsHookLines.join('\n') }}</span>
            </div>

            <div v-if="projectMaterialsYarnLines.length > 0" class="project-materials__row">
              <span class="project-materials__label">{{ t('project.componentMetadata.yarn') }}</span>
              <span class="project-materials__value">{{ projectMaterialsYarnLines.join('\n') }}</span>
            </div>
          </div>

          <button
            type="button"
            class="btn-playing project-start-cta"
            :disabled="startCtaLoading"
            @click="handleStartCta"
          >
            {{ t('project.startMakingCta') }}
          </button>
        </div>

        <section v-if="false" class="project-record-tracking" aria-label="record tracking">
          <div class="project-record-tracking__header">
            <span class="project-record-tracking__title">{{ t('project.recordTracking.title') }}</span>
          </div>

          <div class="project-record-tracking__lists">
            <div class="project-record-tracking__list">
              <div class="project-record-tracking__label">
                {{ t('project.recordTracking.ongoing') }} ({{ projectRecordOngoingIds.length }})
              </div>
              <ul v-if="projectRecordOngoingIds.length" class="project-record-tracking__items">
                <li
                  v-for="rid in projectRecordOngoingIds"
                  :key="`ongoing-${rid}`"
                  class="project-record-tracking__item"
                >
                  {{ rid }}
                </li>
              </ul>
              <div v-else class="project-record-tracking__empty">{{ t('project.recordTracking.empty') }}</div>
            </div>

            <div class="project-record-tracking__list">
              <div class="project-record-tracking__label">
                {{ t('project.recordTracking.completed') }} ({{ projectRecordCompletedIds.length }})
              </div>
              <ul v-if="projectRecordCompletedIds.length" class="project-record-tracking__items">
                <li
                  v-for="rid in projectRecordCompletedIds"
                  :key="`completed-${rid}`"
                  class="project-record-tracking__item"
                >
                  {{ rid }}
                </li>
              </ul>
              <div v-else class="project-record-tracking__empty">{{ t('project.recordTracking.empty') }}</div>
            </div>
          </div>
        </section>

        <!-- Display each component -->
        <div class="design-cards">
          <CarouselWithDot
            :items="componentList"
            :aria-label="t('project.components')"
            item-width="100%"
            :item-key="(_c, i) => i"
            :get-dot-variant="(item) => (item?.type === 'stitch' ? 'outline' : 'solid')"
            class="component-card-carousel"
          >
            <template #default="{ item, index }">
              <div
                class="component-card-carousel__slide"
                :ref="(el) => setComponentSlideEl(el, index)"
                @click="(e) => handleComponentSlideClick(index, e)"
              >
                <ComponentCard
                  :component="item"
                  :component-list="componentList"
                  :component-index="index"
                  :materials="projectData.materials"
                />
              </div>
            </template>
          </CarouselWithDot>
        </div>
      </BottomSheetScroll>

      <RecordSelectionModal
        v-bind="recordModal"
        @cancel="showRecordModal = false"
        @resume="handleResumeRecord"
        @start-new="handleStartNewRecord"
      />
    </div>

    <div v-else>
      <p>{{ $t('project.notFound') }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import MoreMenu from '@/components/buttons/MoreMenu.vue'
import ButtonStar from '@/components/buttons/svg/ButtonStar.vue'
import ComponentCard from '@/components/cards/ComponentCard.vue/index.vue'
import ImageGroup from '@/components/Carousel/ImageGroup.vue'
import CarouselWithDot from '@/components/Carousel/CarouselWithDot.vue'
import BottomSheetScroll from '@/components/layout/BottomSheetScroll.vue'
import RecordSelectionModal from '@/components/modals/RecordSelectionModal.vue'
import { useAchievementStore } from '@/stores/achievementStore'
import { provideSelfDefinedStitchesContext } from '@/composables/selfDefinedStitchesContext'
import { useAppBanner } from '@/composables/appBanner'

import { openError } from '@/services/ui/notice'
import { openToast } from '@/services/ui/toast'
import { formatDateTimeCompact } from '@/utils/dateTime'
import { toMs } from '@/utils/toMs'
import { normalizeYarnMetaList } from '@/utils/yarnMeta'

defineOptions({ name: 'ProjectViewMain' })

const props = defineProps({
  currentUser: { type: Object, default: null },
  profile: { type: Object, default: null }
})

const currentUser = computed(() => props.currentUser ?? null)
const currentUserProfile = computed(() => props.profile ?? null)

const emit = defineEmits(['api'])

function callApi(name, ...args) {
  return new Promise((resolve, reject) => {
    emit('api', { name, args, resolve, reject })
  })
}

const { t } = useI18n({ useScope: 'global' })

const achievementStore = useAchievementStore()

const route = useRoute()
const router = useRouter()
const appBanner = useAppBanner()
const projectId = ref(route.params.project_id)
const projectData = ref(null)
const loading = ref(true)
const permissionDenied = ref(false)
const showRecordModal = ref(false)
const existingRecords = ref([])
const startCtaLoading = ref(false)

const projectCreatedAtMs = computed(() => {
  const p = projectData.value
  return toMs(p?.created_at) ?? toMs(p?.createdAt) ?? null
})

const projectUpdatedAtMs = computed(() => {
  const p = projectData.value
  return toMs(p?.updated_at) ?? toMs(p?.updatedAt) ?? null
})

const projectCreatedAtCompact = computed(() => {
  const ms = projectCreatedAtMs.value
  if (ms == null) return ''
  return formatDateTimeCompact(ms)
})

const projectUpdatedAtCompact = computed(() => {
  const ms = projectUpdatedAtMs.value
  if (ms == null) return ''
  return formatDateTimeCompact(ms)
})

const showProjectUpdatedLine = computed(() => {
  const createdMs = projectCreatedAtMs.value
  const updatedMs = projectUpdatedAtMs.value
  if (createdMs == null || updatedMs == null) return false
  if (createdMs === updatedMs) return false
  const createdLabel = projectCreatedAtCompact.value
  const updatedLabel = projectUpdatedAtCompact.value
  if (!createdLabel || !updatedLabel) return false
  return createdLabel !== updatedLabel
})

const selfDefinedStitchesRef = computed(() => {
  const list = projectData.value?.self_defined_stitches
  return Array.isArray(list) ? list : []
})

async function addSelfDefinedStitch(stitch) {
  if (!isProjectOwner.value) {
    openError({
      title: t('common.error'),
      message: t('project.noPermission'),
      confirmText: t('common.ok')
    })
    return
  }

  if (!stitch || typeof stitch !== 'object') return

  const id = Number(stitch.stitch_id)
  if (!Number.isFinite(id)) return

  const name = String(stitch.name || '').trim()
  if (!name) return

  const description = String(stitch.description || '').trim()
  const consume = Number(stitch.consume)
  const generate = Number(stitch.generate)

  const normalized = {
    stitch_id: id,
    name,
    description,
    consume: Number.isFinite(consume) ? consume : 1,
    generate: Number.isFinite(generate) ? generate : 0
  }

  const prev = Array.isArray(projectData.value?.self_defined_stitches)
    ? projectData.value.self_defined_stitches
    : []

  const withoutSameId = prev.filter((s) => Number(s?.stitch_id) !== id)
  const next = [...withoutSameId, normalized]

  // Optimistic local update.
  if (projectData.value) projectData.value.self_defined_stitches = next

  try {
    await callApi('updateProject', projectId.value, { self_defined_stitches: next })
  } catch (error) {
    console.error('ProjectView: failed to persist self_defined_stitches', error)
    openError({
      title: t('common.error'),
      message: t('common.saveFailed'),
      confirmText: t('common.ok')
    })
  }
}

provideSelfDefinedStitchesContext({
  stitchesRef: selfDefinedStitchesRef,
  addStitch: addSelfDefinedStitch
})

const noticeMessage = ref('')
let noticeTimer = null

function toText(v) {
  return String(v ?? '').trim()
}

function normalizeStringList(value) {
  const list = Array.isArray(value) ? value : []
  return list
    .map((v) => toText(v))
    .filter(Boolean)
}

function uniqueList(list) {
  const seen = new Set()
  const out = []
  for (const raw of Array.isArray(list) ? list : []) {
    const v = toText(raw)
    if (!v) continue
    if (seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

const projectMaterialsHookLines = computed(() => {
  const raw = projectData.value?.materials?.hook
  return uniqueList(normalizeStringList(raw))
})

const projectMaterialsYarnLines = computed(() => {
  const meta = normalizeYarnMetaList(projectData.value?.materials?.yarn)
  return meta
    .map((m) => {
      const type = toText(m?.type)
      const amount = toText(m?.amount)
      if (!type) return ''
      return amount ? `${type}: ${amount}` : type
    })
    .filter(Boolean)
})

const isProjectOwner = computed(() => {
  const authorId = projectData.value?.authorId
  const uid = currentUser.value?.uid
  if (!uid || !authorId) return false
  return String(uid) === String(authorId)
})

const isSavedByCurrentUser = computed(() => {
  const uid = currentUser.value?.uid
  if (!uid) return false
  const list = currentUserProfile.value?.save_project_list
  if (!Array.isArray(list)) return false
  return list.map(String).includes(String(projectId.value))
})

const SETTINGS_ICON_BASE = `${import.meta.env.BASE_URL}assets/image/settings/`
const PROJECT_ACTION_ICONS = {
  copyLink: `${SETTINGS_ICON_BASE}069__hyperlink.svg`,
  downloadDesign: `${SETTINGS_ICON_BASE}027__download.svg`,
  editProject: `${SETTINGS_ICON_BASE}083__setting_edit.svg`
}

const projectActionItems = computed(() => {
  if (isProjectOwner.value) {
    return [
      {
        key: 'copy-link',
        icon: PROJECT_ACTION_ICONS.copyLink,
        ariaLabel: t('project.actions.copyProjectLink'),
        onClick: copyProjectLink
      },
      {
        key: 'download-design',
        icon: PROJECT_ACTION_ICONS.downloadDesign,
        ariaLabel: t('project.actions.downloadDesign'),
        onClick: downloadDesign
      },
      {
        key: 'edit-project',
        icon: PROJECT_ACTION_ICONS.editProject,
        ariaLabel: t('project.actions.editProject'),
        onClick: goEditProject
      }
    ]
  }

  return [
    {
      key: 'copy-link',
      icon: PROJECT_ACTION_ICONS.copyLink,
      ariaLabel: t('project.actions.copyProjectLink'),
      onClick: copyProjectLink
    },
    {
      key: 'save-project',
      icon: ButtonStar,
      iconProps: { isSelected: isSavedByCurrentUser.value },
      ariaLabel: isSavedByCurrentUser.value
        ? t('project.actions.unsaveProject')
        : t('project.actions.saveProject'),
      onClick: toggleSaveProject
    }
  ]
})

const SaveStarMenuIcon = {
  name: 'SaveStarMenuIcon',
  render: () => h(ButtonStar, { isSelected: isSavedByCurrentUser.value })
}

function toMoreMenuItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  const key = String(raw.key || '')
  if (!key) return null
  const label = String(raw.ariaLabel || raw.label || key)
  if (!label) return null

  const item = {
    key,
    label,
    onSelect: typeof raw.onClick === 'function' ? raw.onClick : undefined
  }

  if (key === 'save-project') {
    item.icon = SaveStarMenuIcon
    return item
  }

  if (typeof raw.icon === 'string') {
    item.iconUrl = raw.icon
  } else if (raw.icon) {
    item.icon = raw.icon
  }

  return item
}

const projectSettingsMenuItems = computed(() => {
  const list = Array.isArray(projectActionItems.value) ? projectActionItems.value : []
  return list
    .map(toMoreMenuItem)
    .filter(Boolean)
})

const projectSettingsMenuSections = computed(() => {
  if (!isProjectOwner.value) return []

  const list = Array.isArray(projectActionItems.value) ? projectActionItems.value : []
  const byKey = new Map(list.map((i) => [String(i?.key || ''), i]))

  const edit = toMoreMenuItem(byKey.get('edit-project'))
  const copy = toMoreMenuItem(byKey.get('copy-link'))
  const download = toMoreMenuItem(byKey.get('download-design'))

  const firstGroup = [edit].filter(Boolean)
  const secondGroup = [copy, download].filter(Boolean)

  const sections = []
  if (firstGroup.length) sections.push({ key: 'owner-manage', label: '', items: firstGroup })
  if (secondGroup.length) sections.push({ key: 'owner-share', label: '', items: secondGroup })
  return sections
})

const goEditProject = () => {
  router.push({
    name: 'project-edit',
    params: { project_id: projectId.value }
  })
}

const downloadDesign = () => {
  router.push({
    name: 'project-download-design',
    params: { project_id: projectId.value }
  })
}

const copyProjectLink = async () => {
  try {
    const href = router.resolve({ path: `/project/${projectId.value}` }).href
    const url = new URL(href, window.location.origin).toString()

    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(url)
      openToast({ message: t('project.linkCopiedNotice') })
      return
    }

    window.prompt(t('project.copyLinkPrompt'), url)
  } catch (error) {
    console.error('Error copying project link:', error)
    openError({
      title: t('common.error'),
      message: t('project.errors.copyLinkFailed'),
      confirmText: t('common.ok')
    })
  }
}

const toggleSaveProject = async () => {
  const uid = currentUser.value?.uid
  if (!uid) return

  try {
    if (isSavedByCurrentUser.value) {
      await callApi('unsaveProjectFromSaveList', {
        userId: uid,
        projectId: projectId.value
      })
      openToast({ message: t('project.toasts.unsavedProject') })
    } else {
      await callApi('saveProjectToSaveList', {
        userId: uid,
        projectId: projectId.value
      })
      openToast({ message: t('project.toasts.savedProject') })
    }
  } catch (error) {
    console.error('Error toggling saved project:', error)

    openError({
      title: t('common.error'),
      message: t('project.errors.updateSavedFailed'),
      confirmText: t('common.ok')
    })
  }
}

const componentList = computed(() => {
  const list = projectData.value?.component_list
  return Array.isArray(list) ? list : []
})

const projectImages = computed(() => {
  const raw = projectData.value?.images
  const list = Array.isArray(raw) ? raw : []
  return list
    .filter((x) => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean)
})

const componentSlideEls = ref([])

const setComponentSlideEl = (el, index) => {
  if (!el) return
  componentSlideEls.value[index] = el
}

const getScrollBehavior = (preferred = 'smooth') => {
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return 'auto'
    }
  } catch {
    // ignore
  }
  return preferred
}

const scrollToComponentTable = async (index) => {
  await nextTick()
  const wrap = componentSlideEls.value?.[index]
  if (!wrap || typeof wrap.querySelector !== 'function') return

  const target =
    wrap.querySelector?.('.crochet-table') ||
    wrap.querySelector?.('table') ||
    wrap

  const banner = document.querySelector?.('.app-banner')
  const offset = (banner?.offsetHeight || 0) + 8

  const scrollEl = document.querySelector?.('.app-page')
  if (scrollEl && typeof scrollEl.scrollTo === 'function') {
    const containerRect = scrollEl.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const top = targetRect.top - containerRect.top + scrollEl.scrollTop - offset
    scrollEl.scrollTo({ top: Math.max(0, top), behavior: getScrollBehavior('smooth') })
    return
  }

  const top = target.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top: Math.max(0, top), behavior: getScrollBehavior('smooth') })
}

const handleComponentSlideClick = async (index, event) => {
  const target = event?.target
  if (target?.closest?.('.crochet-table')) return
  if (target?.closest?.('button, a, input, textarea, select, label')) return
  await scrollToComponentTable(index)
}

const projectRecordOngoingIds = computed(() => {
  const list = projectData.value?.record?.ongoing_list
  return Array.isArray(list) ? list.map(String).filter(Boolean) : []
})

const projectRecordCompletedIds = computed(() => {
  const list = projectData.value?.record?.completed_list
  return Array.isArray(list) ? list.map(String).filter(Boolean) : []
})

function showNotice(message) {
  noticeMessage.value = String(message || '')
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    noticeMessage.value = ''
  }, 2200)
}

// Modal configurations
const recordModal = computed(() => {
  const hasRecords = existingRecords.value.length > 0
  return {
    show: showRecordModal.value,
    title: hasRecords ? t('recordSelection.titleResumeOrStart') : t('recordSelection.titleStartRecording'),
    message: hasRecords ? t('recordSelection.messageHasExisting') : t('recordSelection.messageStartPrompt'),
    existingRecords: existingRecords.value,
    showResumeButton: hasRecords,
    showStartButton: true,
    startNewText: hasRecords ? t('project.startNew') : t('project.startRecording')
  }
})

onMounted(async () => {
  if (appBanner) {
    appBanner.setBanner({
      visible: true,
      variant: 'glass',
      overlay: true,
      transparent: true,
      title: '',
      showBack: true,
      onBack: null
    })
  }

  loading.value = true
  permissionDenied.value = false
  projectData.value = null

  try {
    projectData.value = await callApi('fetchProject', projectId.value)

    if (!projectData.value) {
      console.error('Project not found')
    }
    if (route.query?.copied === '1') {
      showNotice(t('project.copiedNotice'))
      const nextQuery = { ...route.query }
      delete nextQuery.copied
      router.replace({ query: nextQuery })
    }
  } catch (error) {
    console.error('Error entering project:', error)
    permissionDenied.value = String(error?.code || '') === 'permission-denied'
  } finally {
    loading.value = false
  }
})

const handleResumeRecord = (recordIndex) => {
  showRecordModal.value = false
  const selected = existingRecords.value?.[recordIndex]
  if (!selected?.id) {
    openError({
      title: t('common.error'),
      message: t('project.errors.recordNotFound'),
      confirmText: t('common.ok')
    })
    return
  }
  router.push(`/record/${selected.id}`)
}

const handleStartNewRecord = async () => {
  showRecordModal.value = false
  const uid = currentUser.value?.uid
  if (!uid) return

  try {
    const { recordId: record_id, trackingAdded } = await callApi('startRecordForProject', {
      uid,
      projectId: projectId.value,
      projectName: projectData.value?.name || '',
      projectImage: projectImages.value?.[0] || '',
      componentList: projectData.value?.component_list
    })

    achievementStore.scanAndAwardNow(uid).catch((e) => {
      console.warn('[achievements] scan after start record failed:', e)
    })

    // Keep local tracking list in sync when the tracking write succeeded.
    if (trackingAdded && projectData.value) {
      const prev = projectData.value?.record || {}
      const nextOngoing = Array.isArray(prev.ongoing_list) ? prev.ongoing_list.map(String) : []
      if (!nextOngoing.includes(String(record_id))) {
        projectData.value = {
          ...projectData.value,
          record: {
            ...prev,
            ongoing_list: [...nextOngoing, String(record_id)]
          }
        }
      }
    }

    router.push(`/record/${record_id}`)
  } catch (error) {
    console.error('Error creating new record:', error)
    openError({
      title: t('common.error'),
      message: t('project.errors.startRecordFailed'),
      confirmText: t('common.ok')
    })
  }
}

const handleStartCta = async () => {
  const uid = currentUser.value?.uid
  if (!uid) return
  if (!projectId.value) return
  if (startCtaLoading.value) return

  startCtaLoading.value = true
  try {
    const records = await callApi('listUserRecordsByProjectId', uid, projectId.value)
    const list = Array.isArray(records) ? records : []
    existingRecords.value = list.filter((r) => r?.is_completed !== true)
  } catch (error) {
    console.warn('ProjectView: failed to load existing records', error)
    existingRecords.value = []
  } finally {
    startCtaLoading.value = false
  }

  showRecordModal.value = true
}
</script>

<style scoped>
.project-view {
  max-width: 1200px;
  box-sizing: border-box;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}


.project-banner-actions {
  display: flex;
  align-items: center;
}


.notice {
  position: sticky;
  top: 0.75rem;
  z-index: var(--z-sticky);
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

.header-section {
  display: none;
}

.header-title {
  display: none;
}

.project-title {
  margin: 0;
  text-align: center;
}

.page-content {
  background: var(--color-surface-page);
  height: 100%;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

/* ProjectView: the image carousel should occupy the visible space above the fixed bottom sheet. */
:deep(.image-carousel.project-image-carousel) {
  height: calc(35% + 3.1rem);
  min-height: 0;
}

.project-title-section {
  display: block;
  width: fit-content;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  padding: 0.5rem 2rem 0.1rem 1.5rem;
  border-top-right-radius: 2.5rem;
  background: var(--color-surface-sheet);
}
.project-title-section span {
  font-size: 1.5rem;
  font-weight: 900;
}

.project-contenrt-wrapper {
  padding: 0 2rem;
}

.design-cards {
  display: block;
  padding: 1rem;
}

.component-card-carousel {
  margin-top: 0.25rem;
}

/* ProjectView: align the card/table with page padding */
.component-card-carousel :deep(.carousel__row) {
  padding-left: 0;
  padding-right: 0;
  gap: 0;
  scroll-padding-left: 0;
  scroll-padding-right: 0;
}

/* ProjectView: use dots only (no arrows) */
.component-card-carousel :deep(.carousel__arrow) {
  display: none;
}

.component-card-carousel__slide {
  width: 100%;
}

.project-description {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin: 1.5rem 0;
  padding: 0 1rem;
}

.project-materials {
  width: min(680px, 100%);
  padding: 1rem;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(17, 24, 39, 0.06);
}

.project-materials__title {
  font-weight: 900;
  color: #111827;
  margin-bottom: 0.5rem;
}

.project-materials__row {
  display: grid;
  grid-template-columns: 0.7fr 1.3fr;
  gap: 0.75rem;
  align-items: start;
  padding: 0.35rem 0;
}

.project-materials__label {
  font-size: 0.85rem;
  font-weight: 900;
  color: #6b7280;
}

.project-materials__value {
  font-size: 0.9rem;
  font-weight: 800;
  color: #111827;
  white-space: pre-wrap;
}

.project-start-cta {
  width: min(680px, 70%);
  margin-top: 1.5rem;
}

.project-description-text {
  width: min(680px, 100%);
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.55;
  white-space: pre-wrap;
  padding: 1.5rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, .5);
  font-weight: 800;
  border: 0.3rem solid var(--color-surface-page);
}

.project-record-tracking {
  padding: 0 2rem;
}

.project-record-tracking__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.project-record-tracking__title {
  font-weight: 900;
  color: #111827;
}

.project-record-tracking__lists {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.project-record-tracking__list {
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  background: #fff;
}

.project-record-tracking__label {
  font-weight: 800;
  color: #374151;
}

.project-record-tracking__items {
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
}

.project-record-tracking__item {
  color: #6b7280;
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

.project-record-tracking__empty {
  margin-top: 0.4rem;
  color: #9ca3af;
  font-size: 0.9rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: flex-end;
  position: relative;
}

:deep(.row-list-vertical) {
  /* background: white; */
  /* padding: 1rem; */
  border-radius: 6px;
}
</style>
