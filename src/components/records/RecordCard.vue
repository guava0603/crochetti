<template>
  <div
    class="record-card"
    role="button"
    tabindex="0"
    @click="emit('open', record)"
    @keydown.enter.prevent="emit('open', record)"
  >
    <div class="record-card__top">
      <div class="record-card__title">{{ title }}</div>

      <div class="record-card__menu" @click.stop>
        <MoreMenu :disabled="!isMyPage" :label="t('project.more')" :items="menuItems" />
      </div>
    </div>

    <div v-if="meta" class="record-card__meta">{{ meta }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { auth } from '@/firebaseConfig'
import MoreMenu from '@/components/buttons/MoreMenu.vue'
import { deleteUserRecord } from '@/services/firestore/records'
import { openConfirmation } from '@/services/ui/confirmation'

const props = defineProps({
  record: {
    type: Object,
    required: true
  },
  isMyPage: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['open', 'deleted'])

const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

const title = computed(() => props.record?.project_name || props.record?.projectName || 'Record')

const meta = computed(() => {
  const latestMs = Number(props.record?.latest_start_ms)
  if (Number.isFinite(latestMs) && latestMs > 0) {
    const latest = new Date(latestMs)
    try {
      return latest.toLocaleString()
    } catch {
      return String(latest)
    }
  }

  const slots = Array.isArray(props.record?.time_slots) ? props.record.time_slots : []
  const latest = slots
    .map((s) => (s?.start ? new Date(s.start) : null))
    .filter((d) => d && !Number.isNaN(d.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0]

  if (!latest) return ''
  try {
    return latest.toLocaleString()
  } catch {
    return String(latest)
  }
})

const menuItems = computed(() => {
  return [
    {
      action: 'goToDesign',
      label: t('record.goToDesign'),
      disabled: !props.record?.project_id,
      onSelect: () => goToDesign()
    },
    {
      action: 'deleteRecord',
      label: t('record.deleteRecord'),
      danger: true,
      onSelect: () => handleDelete()
    }
  ]
})

function goToDesign() {
  const projectId = props.record?.project_id
  if (!projectId) return
  router.push(`/project/${projectId}`)
}

async function handleDelete() {
  if (!props.isMyPage) return

  const uid = auth.currentUser?.uid
  if (!uid) return

  const ok = await openConfirmation({
    type: 'deleteRecord',
    onConfirm: async () => {
      await deleteUserRecord(uid, props.record.id)
      emit('deleted', props.record)
    }
  })

  return ok
}
</script>

<style scoped>
.record-card {
  position: relative;
  z-index: 0;
  width: 100%;
  text-align: left;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: white;
  border-radius: 12px;
  padding: 1rem 1rem;
  cursor: pointer;
  transition: transform 0.05s, box-shadow 0.15s, border-color 0.15s;
}

.record-card:hover {
  border-color: rgba(66, 185, 131, 0.35);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
  z-index: 5;
}

.record-card:active {
  transform: translateY(1px);
}

.record-card:focus-within {
  z-index: 5;
}

.record-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.record-card__menu {
  flex: none;
  position: absolute;
  top: 10px;
  right: 10px;
}

.record-card__title {
  font-weight: 900;
  color: #111827;
  margin-bottom: 0.35rem;
}

.record-card__meta {
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 700;
}
</style>
