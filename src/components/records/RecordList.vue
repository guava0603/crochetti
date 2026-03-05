<template>
  <div class="records-section">
    <div v-if="loading" class="records-hint">
        <p>{{ $t('common.loading') }}</p>
    </div>

    <div v-else-if="sortedRecords.length" class="records-content">
      <div class="records-filters">
        <FilterGroup
          v-model="filterValue"
          :options="filterOptions"
          aria-label="record filters"
        />
      </div>

      <div v-if="visibleRecords.length" class="records-grid">
        <RecordCard
          v-for="r in visibleRecords"
          :key="r.id"
          :record="r"
          @open="(rec) => emit('open', rec)"
        />
      </div>
      <div v-else class="records-hint records-hint--compact">
        <p>{{ t('record.noRecordsYet') }}</p>
      </div>
    </div>

    <div v-else class="records-hint">
      <p>{{ t('record.noRecordsYet') }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import RecordCard from '@/components/records/RecordCard.vue'
import FilterGroup from '@/components/ui/FilterGroup.vue'
import { toMs } from '@/utils/toMs'

const props = defineProps({
  records: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  isMyPage: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['open'])

const { t } = useI18n({ useScope: 'global' })

const filterOptions = [
  { label: '已完成', value: 'completed' },
  { label: '進行中', value: 'ongoing' }
]

const filterValue = ref(['completed', 'ongoing'])

const getRecordUpdatedMs = (r) => {
  if (!r || typeof r !== 'object') return 0

  const direct = toMs(r.updated_at) ?? toMs(r.updatedAt)
  if (direct != null) return direct

  const directMs = toMs(r.updated_at_ms) ?? toMs(r.updatedAtMs)
  if (directMs != null) return directMs

  const latestStart = toMs(r.latest_start_ms)
  if (latestStart != null) return latestStart

  const slots = Array.isArray(r.time_slots) ? r.time_slots : []
  if (slots.length) {
    const latest = Math.max(
      ...slots
        .map((s) => toMs(s?.start))
        .filter((n) => typeof n === 'number' && Number.isFinite(n))
    )
    if (Number.isFinite(latest) && latest > 0) return latest
  }

  const created = toMs(r.created_at) ?? toMs(r.createdAt)
  if (created != null) return created

  return 0
}

const sortedRecords = computed(() => {
  const list = Array.isArray(props.records) ? props.records : []
  return [...list].sort((a, b) => getRecordUpdatedMs(b) - getRecordUpdatedMs(a))
})

const visibleRecords = computed(() => {
  const selected = new Set(Array.isArray(filterValue.value) ? filterValue.value : [])
  // Default select-all behavior.
  if (!selected.size) return []
  const showCompleted = selected.has('completed')
  const showOngoing = selected.has('ongoing')

  return sortedRecords.value.filter((r) => {
    const done = Boolean(r?.is_completed)
    if (done && showCompleted) return true
    if (!done && showOngoing) return true
    return false
  })
})
</script>

<style scoped>
.records-section {
  border-radius: 0;
  padding: 1rem;
  padding-bottom: 7rem;
  margin: 0;
  box-shadow: none;
  flex: 1;
}

.records-content {
  display: grid;
  gap: 1rem;
}

.records-filters {
  display: flex;
  justify-content: flex-end;
}

.records-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.records-hint {
  text-align: center;
  padding: 3rem 2rem;
  color: #6b7280;
}

.records-hint--compact {
  padding: 1rem 0;
}

.records-hint p {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}
</style>
