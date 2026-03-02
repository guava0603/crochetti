<template>
  <div class="project-view">
    <div class="project-banner" role="banner">
      <button
        type="button"
        class="project-banner__back"
        :aria-label="$t('common.back')"
        @click="lastPage"
      >
        <LastPage />
      </button>

      <div class="header-actions project-banner__actions">
        <ButtonGroup :items="projectActionItems" />
      </div>
    </div>

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
      :class="{ 'page-content--banner-offset': !projectImages.length }"
    >
      <ImageGroup v-if="projectImages.length" :images="projectImages" class="project-image-carousel" />

      <BottomSheetScroll
        class="project-content"
        :min-vh="40"
        :max-vh="90"
        :initial-vh="70"
        :snap-on-first-gesture="true"
        :style="{ '--bottom-sheet-max-width': '1200px', '--bottom-sheet-z': '55' }"
      >
        <template #header>
          <div class="project-title-section">
            <span>{{ projectData.name }}</span>
          </div>
        </template>

        <div v-if="projectData?.description?.length > 0" class="project-description">
          <p class="project-description-text">
            {{ projectData.description }}
          </p>
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
                />
              </div>
            </template>
          </CarouselWithDot>
        </div>
      </BottomSheetScroll>

      <div class="floating-play">
        <PlayButton @click="handlePlayClick" />
      </div>

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
import { ref, computed, onBeforeUnmount, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { auth } from '../firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import ComponentCard from '../components/cards/ComponentCard.vue/index.vue'
import PlayButton from '../components/buttons/PlayButton.vue'
import LastPage from '../components/buttons/LastPage.vue'
import ImageGroup from '@/components/Carousel/ImageGroup.vue'
import CarouselWithDot from '@/components/Carousel/CarouselWithDot.vue'
import ButtonGroup from '@/components/buttons/ButtonGroup.vue'
import ButtonPrinter from '@/components/buttons/svg/ButtonPrinter.vue'
import ButtonEdit from '@/components/buttons/svg/ButtonEdit.vue'
import ButtonLink from '@/components/buttons/svg/ButtonLink.vue'
import ButtonStar from '@/components/buttons/svg/ButtonStar.vue'
import BottomSheetScroll from '@/components/layout/BottomSheetScroll.vue'
import RecordSelectionModal from '../components/modals/RecordSelectionModal.vue'
import { v4 as uuidv4 } from '@lukeed/uuid'
import { normalizeComponentListForRecord } from '@/utils/componentInstances'
import { addRecordToProjectOngoing, fetchProject } from '@/services/firestore/projects'
import { listUserRecordsByProjectId, setUserRecord } from '@/services/firestore/records'
import {
  isCurrentUser,
  saveProjectToSaveList,
  subscribeUserProfile,
  unsaveProjectFromSaveList
} from '@/services/firestore/user'
import { openError } from '@/services/ui/notice'
import { openToast } from '@/services/ui/toast'
import { useAchievementStore } from '@/stores/achievementStore'

const { t } = useI18n({ useScope: 'global' })

const achievementStore = useAchievementStore()

const route = useRoute()
const router = useRouter()
const projectId = ref(route.params.project_id)
const projectData = ref(null)
const loading = ref(true)
const permissionDenied = ref(false)
const showRecordModal = ref(false)
const existingRecords = ref([])

const currentUserProfile = ref(null)
let unsubscribeCurrentUserProfile = null

const noticeMessage = ref('')
let noticeTimer = null

const isProjectOwner = computed(() => {
  const authorId = projectData.value?.authorId
  return isCurrentUser(authorId)
})

const isSavedByCurrentUser = computed(() => {
  const uid = auth.currentUser?.uid
  if (!uid) return false
  const list = currentUserProfile.value?.save_project_list
  if (!Array.isArray(list)) return false
  return list.map(String).includes(String(projectId.value))
})

const goEditProject = () => {
  router.push({
    name: 'project-edit',
    params: { project_id: projectId.value }
  })
}

const projectActionItems = computed(() => {
  if (isProjectOwner.value) {
    return [
      {
        key: 'copy-link',
        icon: ButtonLink,
        ariaLabel: t('project.actions.copyProjectLink'),
        onClick: copyProjectLink
      },
      {
        key: 'download-design',
        icon: ButtonPrinter,
        ariaLabel: t('project.actions.downloadDesign'),
        onClick: downloadDesign
      },
      {
        key: 'edit-project',
        icon: ButtonEdit,
        ariaLabel: t('project.actions.editProject'),
        onClick: goEditProject
      }
    ]
  }

  return [
    {
      key: 'copy-link',
      icon: ButtonLink,
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
  const user = auth.currentUser
  if (!user?.uid) {
    openError({
      title: t('common.error'),
      message: t('auth.loginRequired'),
      confirmText: t('common.ok')
    })
    return
  }

  const pid = String(projectId.value)
  const prevProfile = currentUserProfile.value
  const prevList = Array.isArray(prevProfile?.save_project_list)
    ? prevProfile.save_project_list.map(String)
    : []

  try {
    if (isSavedByCurrentUser.value) {
      // Optimistic UI update
      currentUserProfile.value = {
        ...prevProfile,
        save_project_list: prevList.filter((x) => x !== pid)
      }

      await unsaveProjectFromSaveList({
        userId: user.uid,
        projectId: projectId.value
      })
      openToast({ message: t('project.toasts.unsavedProject') })
    } else {
      // Optimistic UI update
      currentUserProfile.value = {
        ...prevProfile,
        save_project_list: [...new Set([...prevList, pid])]
      }

      await saveProjectToSaveList({
        userId: user.uid,
        projectId: projectId.value
      })
      openToast({ message: t('project.toasts.savedProject') })
    }
  } catch (error) {
    console.error('Error toggling saved project:', error)

    // Revert optimistic update on failure
    currentUserProfile.value = prevProfile

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

  const banner = document.querySelector?.('.project-banner')
  const offset = (banner?.offsetHeight || 0) + 8
  const top = target.getBoundingClientRect().top + window.scrollY - offset

  window.scrollTo({ top: Math.max(0, top), behavior: getScrollBehavior('smooth') })
}

const handleComponentSlideClick = async (index, event) => {
  const target = event?.target
  if (target?.closest?.('.crochet-table')) return
  if (target?.closest?.('button, a, input, textarea, select, label')) return
  await scrollToComponentTable(index)
}

const projectImages = computed(() => {
  const p = projectData.value || {}
  const images = Array.isArray(p.images) ? p.images : []
  const urls = images
    .filter((x) => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean)

  if (urls.length) return urls
  if (typeof p.image === 'string' && p.image.trim()) return [p.image.trim()]
  return []
})

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

    if (auth.currentUser?.uid) {
      unsubscribeCurrentUserProfile = subscribeUserProfile({
        userId: auth.currentUser.uid,
        fallbackProfile: { save_project_list: [] },
        onData: (profile) => {
          currentUserProfile.value = profile
        },
        onError: (error) => {
          console.error('Error listening to current user profile:', error)
        }
      })
    }

    projectData.value = await fetchProject(projectId.value)

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

onBeforeUnmount(() => {
  if (typeof unsubscribeCurrentUserProfile === 'function') {
    unsubscribeCurrentUserProfile()
    unsubscribeCurrentUserProfile = null
  }
})


// Record tracking functions
const handlePlayClick = async () => {
  try {
    const user = auth.currentUser
    if (!user) {
      openError({
        title: t('common.error'),
        message: t('auth.loginRequired'),
        confirmText: t('common.ok')
      })
      return
    }

    const records = await listUserRecordsByProjectId(user.uid, projectId.value)
    existingRecords.value = records
    showRecordModal.value = true
  } catch (error) {
    console.error('Error checking records:', error)
    openError({
      title: t('common.error'),
      message: 'Failed to check existing records',
      confirmText: t('common.ok')
    })
  }
}

const handleResumeRecord = (recordIndex) => {
  showRecordModal.value = false
  const selected = existingRecords.value?.[recordIndex]
  if (!selected?.id) {
    openError({
      title: t('common.error'),
      message: 'Record not found. Please try again.',
      confirmText: t('common.ok')
    })
    return
  }
  router.push(`/record/${selected.id}`)
}

const handleStartNewRecord = async () => {
  showRecordModal.value = false
  const user = auth.currentUser
  if (!user) {
    openError({
      title: t('common.error'),
      message: t('auth.loginRequired'),
      confirmText: t('common.ok')
    })
    return
  }

  const cList = normalizeComponentListForRecord(projectData.value.component_list)
  // Generate a new record_id
  const record_id = uuidv4()
  // Prepare new record data
  const newRecord = {
    project_id: projectId.value,
    project_name: projectData.value.name,
    component_list: cList,
    time_slots: [],
    self_defined_status: [],
    // Use client timestamp for immediate achievement evaluation.
    created_at: new Date().toISOString()
  }
  // Save to Firestore
  try {
    await setUserRecord(user.uid, record_id, newRecord)

    achievementStore.scanAndAwardNow(user.uid).catch((e) => {
      console.warn('[achievements] scan after start record failed:', e)
    })

    try {
      await addRecordToProjectOngoing(projectId.value, record_id)
      if (projectData.value) {
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
    } catch (error) {
      console.warn('[project record tracking] failed to add ongoing record:', error)
    }

    router.push(`/record/${record_id}`)
  } catch (error) {
    console.error('Error creating new record:', error)
    openError({
      title: t('common.error'),
      message: 'Failed to create new record. Please try again.',
      confirmText: t('common.ok')
    })
  }
}

const lastPage = () => {
  router.go(-1)
  // user/:user_id
  // router.push({ name: 'user', params: { user_id: projectData.value?.authorId } })
}
</script>

<style scoped>
.project-view {
  --project-banner-height: 8vh;
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: calc(2rem + env(safe-area-inset-bottom));
  height: 100vh;
  overflow: hidden;
  box-sizing: border-box;
}

.project-banner {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: calc(var(--project-banner-height) + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100;
  box-sizing: border-box;
}

.project-banner__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
}

.project-banner__actions {
  display: inline-flex;
  align-items: center;
}

.notice {
  position: sticky;
  top: calc(var(--project-banner-height) + env(safe-area-inset-top) + 0.75rem);
  z-index: 50;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1px solid rgba(66, 185, 131, 0.35);
  background: rgba(66, 185, 131, 0.12);
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
  overflow: hidden;
}

.page-content--banner-offset {
  padding-top: calc(var(--project-banner-height) * 1.5 + env(safe-area-inset-top));
}

.project-title-section {
  display: block;
  width: fit-content;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  padding: 0.5rem 1.5rem 0.1rem;
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
  justify-content: center;
  margin: 1.5rem 0;
  padding: 0 2rem;
}

.project-description-text {
  width: min(680px, 100%);
  margin: 0;
  color: #6b7280;
  font-size: 0.95rem;
  line-height: 1.55;
  white-space: pre-wrap;
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

.floating-play {
  position: fixed;
  right: calc(1.25rem + env(safe-area-inset-right));
  bottom: calc(1.25rem + env(safe-area-inset-bottom));
  z-index: 60;
}

:deep(.row-list-vertical) {
  /* background: white; */
  /* padding: 1rem; */
  border-radius: 6px;
}
</style>
