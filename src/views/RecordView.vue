<template>
  <div class="record-shell">
    <div class="top-fixed-banner">
      <LastPage />
      <div class="top-banner-actions">
        <button
          type="button"
          class="nav-square"
          :class="{ active: activeTab === 'ongoing' }"
          :aria-label="t('record.navOngoing')"
          :title="t('record.navOngoing')"
          @click="goOngoing"
        >
          <svg viewBox="0 0 24 24" class="nav-icon" aria-hidden="true">
            <path
              d="M8 6h2v12H8V6zm6 0h2v12h-2V6z"
              fill="currentColor"
            />
          </svg>
        </button>

        <button
          type="button"
          class="nav-square"
          :class="{ active: activeTab === 'time-slots' }"
          :aria-label="t('record.navTimeSlots')"
          :title="t('record.navTimeSlots')"
          @click="goTimeSlots"
        >
          <svg viewBox="0 0 24 24" class="nav-icon" aria-hidden="true">
            <path
              d="M7 6h14v2H7V6zm0 5h14v2H7v-2zm0 5h14v2H7v-2zM3 7h2v2H3V7zm0 5h2v2H3v-2zm0 5h2v2H3v-2z"
              fill="currentColor"
            />
          </svg>
        </button>

        <button
          type="button"
          class="nav-square"
          :class="{ active: activeTab === 'result' }"
          :aria-label="t('record.navResult')"
          :title="t('record.navResult')"
          @click="goResult"
        >
          <svg viewBox="0 0 24 24" class="nav-icon" aria-hidden="true">
            <path
              d="M5 19V5h2v14H5zm6 0V9h2v10h-2zm6 0v-6h2v6h-2z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </div>

    <div class="page-content">
      <component :is="activeView" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import RecordOngoing from '@/components/records/RecordOngoing.vue'
import RecordTimeSlotList from '@/components/records/RecordTimeSlotList.vue'
import RecordSingleTimeSlot from '@/components/records/RecordSingleTimeSlot.vue'
import RecordResult from '@/components/records/RecordResult.vue'
import LastPage from '@/components/buttons/LastPage.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

const hasTimeSlotsQuery = computed(() => Object.prototype.hasOwnProperty.call(route.query, 'time-slots'))
const hasResultSharingQuery = computed(() => Object.prototype.hasOwnProperty.call(route.query, 'result-sharing'))
const hasTimeSlotIdQuery = computed(() => Object.prototype.hasOwnProperty.call(route.query, 'time_slot_id'))

const activeView = computed(() => {
  if (hasTimeSlotIdQuery.value) return RecordSingleTimeSlot
  if (hasTimeSlotsQuery.value) return RecordTimeSlotList
  if (hasResultSharingQuery.value) return RecordResult
  return RecordOngoing
})

const activeTab = computed(() => {
  if (hasTimeSlotIdQuery.value || hasTimeSlotsQuery.value) return 'time-slots'
  if (hasResultSharingQuery.value) return 'result'
  return 'ongoing'
})

const goOngoing = () => {
  router.push({
    name: 'record',
    params: route.params,
    query: {},
  })
}

const goTimeSlots = () => {
  router.push({
    name: 'record',
    params: route.params,
    query: { 'time-slots': '1' },
  })
}

const goResult = () => {
  router.push({
    name: 'record',
    params: route.params,
    query: { 'result-sharing': '1' },
  })
}
</script>

<style scoped>
.record-shell {
  max-width: 1200px;
  margin: 0 auto;
}

.top-fixed-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 5rem;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  z-index: 101;
}

.top-fixed-banner > :deep(.last-page-btn) {
  background: #42b983;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(66,185,131,0.12);
  transition: background 0.2s, color 0.2s;
}

.top-fixed-banner > :deep(.last-page-btn:hover) {
  background: #3aa876;
  color: #fff;
}

.top-banner-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
}

.nav-square {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #111827;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.05s;
}

.nav-square:hover {
  background: #f3f4f6;
}

.nav-square:active {
  transform: translateY(1px);
}

.nav-square.active {
  border-color: rgba(66, 185, 131, 0.55);
  background: rgba(66, 185, 131, 0.12);
  color: #0f5132;
}

.nav-icon {
  width: 22px;
  height: 22px;
}

.page-content {
  padding: 6.5rem 2rem 0;
}
</style>
