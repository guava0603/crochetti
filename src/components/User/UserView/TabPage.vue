<template>
  <BottomSheetScroll
    class="user-tab-sheet"
    :min-vh="55"
    :max-vh="80"
  :initial-vh="55"
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
    </div>
  </BottomSheetScroll>

  <AddRecordLauncher
    v-if="showAddLauncher"
    :active-tab="tabValue"
    :projects="userProjects"
    @project-created="(p) => emit('project-created', p)"
  />

  <SearchUserLauncher
    v-if="showSearchUserLauncher"
    :active-tab="tabValue"
    @open-user="(id) => emit('open-user', id)"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BottomSheetScroll from '@/components/layout/BottomSheetScroll.vue'
import ProjectList from '@/components/projects/ProjectList.vue'
import RecordList from '@/components/records/RecordList.vue'
import AddRecordLauncher from '@/components/User/UserView/AddRecordLauncher.vue'
import SearchUserLauncher from '@/components/User/UserView/SearchUserLauncher.vue'
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

const showAddLauncher = computed(() => {
  if (!props.isMyPage) return false
  // Only show on tabs that support adding.
  return tabValue.value === 'design' || tabValue.value === 'record'
})

const showSearchUserLauncher = computed(() => {
  if (!props.isMyPage) return false
  return tabValue.value === 'following'
})
</script>

<style scoped>
.user-tabs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  z-index: 1;
  width: fit-content;
  background: var(--color-border-warm);
  border-radius: 10px 10px 0 0;
}

.user-tabs__title {
  border: none;
  background: var(--color-border-warm);
  color: var(--color-font-dark);
  font-weight: 800;
  padding: 0.55rem 1.5rem;
  border-left: 0;
  border-right: 0;
  border-bottom: 0;
  border-radius: 10px 10px 0 0;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
  font-size: 1rem;
}

.user-tabs__title--active {
  border: 3px solid var(--color-warm-highlight-green);
  border-bottom: none;
  background: var(--color-surface-sheet);
  color: var(--color-font-dark);
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
