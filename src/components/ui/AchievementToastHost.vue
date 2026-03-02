<template>
  <AchievementToast
    :show="Boolean(active)"
    :achievement-id="active?.id || ''"
    :name="resolvedName"
    :description="resolvedDescription"
    :icon-url="active?.iconUrl || ''"
    :illustration-url="active?.illustrationUrl || ''"
    position="top"
    :kicker="t('achievement.toast.kicker')"
    :auto-hide-ms="2600"
    @close="dismiss"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AchievementToast from '@/components/ui/AchievementToast.vue'
import { useAchievementStore } from '@/stores/achievementStore'
import { resolveAchievementDescription, resolveAchievementName } from '@/services/achievements/text'

const { t, te } = useI18n({ useScope: 'global' })
const store = useAchievementStore()

const active = computed(() => store.activeToast)

const resolvedName = computed(() => {
  if (!active.value) return ''
  return resolveAchievementName(active.value, { t, te }, '')
})

const resolvedDescription = computed(() => {
  if (!active.value) return ''
  return resolveAchievementDescription(active.value, { t, te }, '')
})

function dismiss() {
  store.dismissActiveToast()
}
</script>
