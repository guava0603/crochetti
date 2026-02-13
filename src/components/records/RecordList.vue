<template>
  <div class="records-section">
    <div v-if="!isMyPage" class="records-hint">
      <p>No records</p>
    </div>

    <div v-else>
      <div v-if="loading" class="records-hint">
        <p>{{ $t('common.loading') }}</p>
      </div>

      <div v-else-if="records && records.length" class="records-grid">
        <RecordCard
          v-for="r in records"
          :key="r.id"
          :record="r"
          :is-my-page="isMyPage"
          @open="(rec) => emit('open', rec)"
          @deleted="(rec) => emit('deleted', rec)"
        />
      </div>

      <div v-else class="records-hint">
        <p>No records yet</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import RecordCard from '@/components/records/RecordCard.vue'

defineProps({
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

const emit = defineEmits(['open', 'deleted'])
</script>

<style scoped>
.records-section {
  background: white;
  border-radius: 0;
  padding: 2rem;
  margin: 0;
  box-shadow: none;
}

.records-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.records-hint {
  text-align: center;
  padding: 3rem 2rem;
  color: #6b7280;
}

.records-hint p {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}
</style>
