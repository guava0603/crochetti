<template>
  <BottomSheetScroll
    class="user-tab-sheet"
    :min-pct="60"
    :max-pct="90"
    :initial-pct="60"
    :snap-on-first-gesture="true"
    :style="{ '--bottom-sheet-max-width': '1200px', '--bottom-sheet-z': '60' }"
  >
    <template #header>
      <div class="user-tabs" role="tablist">
        <button
          v-for="t in tabs"
          :key="t.key"
          class="user-tabs__title"
          :class="{ 'user-tabs__title--active': t.key === tabValue, 'user-tabs__title--disabled': Boolean(t.disabled) }"
          type="button"
          role="tab"
          :aria-selected="t.key === tabValue"
          :disabled="Boolean(t.disabled)"
          @click="setTab(t.key)"
        >
          {{ t.label }}
        </button>
      </div>
    </template>

    <div class="user-tab-content">
      <div v-if="showPrivacyNotice" class="privacy-notice">
        <p>{{ t('user.privacy.privateNotice') }}</p>
      </div>

      <template v-else>
        <ProjectList
          v-if="tabValue === 'design'"
          :projects="userProjects"
          :is-my-page="isMyPage"
          :copying-project-id="copyingProjectId"
          @open="(p) => $emit('open-project', p)"
          @copy="(p) => $emit('copy-project', p)"
          @share="(p) => $emit('share-project', p)"
          @delete="(p) => $emit('delete-project', p)"
        />

        <ProjectList
          v-else-if="tabValue === 'saved'"
          :projects="savedProjects"
          :is-my-page="false"
          @open="(p) => $emit('open-project', p)"
          @copy="(p) => $emit('copy-project', p)"
          @share="(p) => $emit('share-project', p)"
        />

        <RecordList
          v-else-if="tabValue === 'record'"
          :records="userRecords"
          :loading="recordsLoading"
          :is-my-page="isMyPage"
          @open="(r) => $emit('open-record', r)"
        />

        <div v-else-if="tabValue === 'following'" class="following-tab">
          <div v-if="followingLoading" class="following-tab__state">
            <p>{{ t('common.loading') }}</p>
          </div>

          <div v-else-if="!followingUsers || followingUsers.length === 0" class="following-tab__state">
            <p>{{ t('user.followingListEmpty') }}</p>
          </div>

          <div v-else class="following-tab__list">
            <UserBlock
              v-for="u in followingUsers"
              :key="u.id"
              :user="u"
              @select="(id) => $emit('open-user', id)"
            />
          </div>
        </div>
      </template>
    </div>
  </BottomSheetScroll>

  <UserFabLauncher
    v-if="isMyPage"
    :is-my-page="isMyPage"
    :projects="userProjects"
    @project-created="(p) => emit('project-created', p)"
    @open-user="(id) => emit('open-user', id)"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BottomSheetScroll from '@/components/layout/BottomSheetScroll.vue'
import ProjectList from '@/components/projects/ProjectList.vue'
import RecordList from '@/components/records/RecordList.vue'
import UserFabLauncher from '@/components/User/UserView/UserFabLauncher.vue'
import UserBlock from '@/components/User/UserBlock.vue'

defineOptions({
  name: 'UserTabPage'
})

const props = defineProps({
  modelValue: {
    type: String,
    default: 'design'
  },
  tabs: {
    type: Array,
    default: () => []
  },
  userProjects: {
    type: Array,
    default: () => []
  },
  savedProjects: {
    type: Array,
    default: () => []
  },
  userRecords: {
    type: Array,
    default: () => []
  },
  recordsLoading: {
    type: Boolean,
    default: false
  },
  followingUsers: {
    type: Array,
    default: () => []
  },
  followingLoading: {
    type: Boolean,
    default: false
  },
  isMyPage: {
    type: Boolean,
    default: false
  },
  copyingProjectId: {
    type: [String, Number],
    default: null
  },
  userIsPrivacy: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:modelValue',
  'open-project',
  'copy-project',
  'share-project',
  'delete-project',
  'open-record',
  'open-user',
  'project-created'
])

const { t } = useI18n({ useScope: 'global' })

const tabValue = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const setTab = (key) => {
  const target = (props.tabs || []).find((t) => t && t.key === key) || null
  if (target && target.disabled) return
  if (!key || key === tabValue.value) return
  tabValue.value = key
}

const isMyPage = computed(() => Boolean(props.isMyPage))

const showPrivacyNotice = computed(() => Boolean(props.userIsPrivacy) && !isMyPage.value)
</script>

<style scoped>
.user-tabs {
  display: flex;
  align-items: flex-end;
  gap: 0;
  width: 100%;
  padding: 0.35rem 0.5rem 0;
  background: var(--color-border-warm);
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.user-tabs::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.user-tabs__title {
  flex: 1;
  position: relative;
  border: none;
  background: var(--color-border-warm);
  color: var(--color-icon-base);
  font-weight: 850;
  height: 40px;
  padding: 0 1.15rem;
  border-radius: 12px 12px 0 0;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, transform 0.08s ease;
  white-space: nowrap;
  font-size: 0.95rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* Chrome-like short separators between inactive tabs only. */
.user-tabs__title::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 1px;
  height: 18px;
  background: rgba(17, 24, 39, 0.26);
  opacity: 0;
  pointer-events: none;
}

.user-tabs__title:not(.user-tabs__title--active):not(.user-tabs__title--disabled):not(:last-child)::after {
  opacity: 1;
}

/* Hide separator right next to the active tab (Chrome behavior). */
.user-tabs__title.user-tabs__title--active + .user-tabs__title::after {
  opacity: 0;
}

.user-tabs__title:hover:not(.user-tabs__title--disabled):not(.user-tabs__title--active) {
  background: rgba(255, 255, 255, 0.6);
  color: var(--color-font-dark);
}

.user-tabs__title:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgb(var(--color-icon-add-rgb) / 0.22);
}

.user-tabs__title--active {
  z-index: 2;
  background: var(--color-surface-sheet);
  color: var(--color-font-dark);
  transform: translateY(1px) translateX(-1px);
}

.user-tabs__title--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.user-tab-content {
  min-width: 0;
  display: flex;
  flex: 1;
}

.privacy-notice {
  flex: 1;
  width: 100%;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  color: rgba(17, 24, 39, 0.75);
  text-align: center;
  font-weight: 800;
}

.user-tab-sheet :deep(.tab__content) {
  box-shadow: none;
}

.following-tab {
  flex: 1;
  width: 100%;
  padding: 1rem;
}

.following-tab__state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  color: #6b7280;
  text-align: center;
}

.following-tab__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
