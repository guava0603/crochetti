<template>
  <div class="debug-ach-toast">
    <TopBanner fixed title="Debug: Achievement Toast" @last-page="goBack" />

    <BottomSheetScroll
      :min-vh="50"
      :max-vh="80"
      :initial-vh="60"
      :snap-on-first-gesture="true"
      :style="{ '--bottom-sheet-max-width': '1000px', '--bottom-sheet-z': '80' }"
    >
      <div class="debug-ach-toast__content">
        <section class="panel">
          <div class="panel__row">
            <label class="field">
              <span class="field__label">Achievement</span>
              <select v-model="achievementId" class="field__control">
                <option v-for="a in achievements" :key="a.id" :value="a.id">
                  {{ a.id }}
                </option>
              </select>
            </label>

            <label class="field">
              <span class="field__label">Position</span>
              <select v-model="position" class="field__control">
                <option value="top">top</option>
                <option value="center">center</option>
              </select>
            </label>

            <label class="field">
              <span class="field__label">Auto hide (ms)</span>
              <input v-model.number="autoHideMs" type="number" min="0" step="100" class="field__control" />
            </label>
          </div>

          <div class="panel__row">
            <label class="field field--grow">
              <span class="field__label">Kicker</span>
              <input v-model="kicker" type="text" class="field__control" />
            </label>

            <div class="panel__buttons">
              <button class="btn" type="button" @click="triggerToast">Show toast</button>
              <button class="btn btn--ghost" type="button" @click="show = false">Hide</button>
              <button class="btn btn--ghost" type="button" @click="toggleLongText">
                {{ useLongText ? 'Use normal text' : 'Use long text' }}
              </button>
            </div>
          </div>

          <div class="panel__row">
            <label class="field field--grow">
              <span class="field__label">Override name (optional)</span>
              <input v-model="overrideName" type="text" class="field__control" />
            </label>

            <label class="field field--grow">
              <span class="field__label">Override description (optional)</span>
              <input v-model="overrideDescription" type="text" class="field__control" />
            </label>
          </div>

          <p class="hint">
            Tips: set auto-hide to 0 to keep it open; click the toast to close.
          </p>
        </section>

        <section class="stage">
          <p class="stage__text">
            This page intentionally has scrollable content so you can test the toast overlay.
          </p>
          <div class="stage__block" v-for="n in 12" :key="n">
            Stage block {{ n }}
          </div>
        </section>
      </div>
    </BottomSheetScroll>

    <AchievementToast
      :show="show"
      :achievement-id="achievementId"
      :name="resolvedName"
      :description="resolvedDescription"
      :illustration-url="''"
      :position="position"
      :kicker="kicker"
      :auto-hide-ms="autoHideMs"
      @close="show = false"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import BottomSheetScroll from '@/components/layout/BottomSheetScroll.vue'
import TopBanner from '@/components/layout/TopBanner.vue'
import AchievementToast from '@/components/ui/AchievementToast.vue'
import { listLocalAchievements, getLocalAchievementById } from '@/services/achievements/catalog'
import { resolveAchievementDescription, resolveAchievementName } from '@/services/achievements/text'

const router = useRouter()
const { t, te } = useI18n({ useScope: 'global' })

const achievements = computed(() => listLocalAchievements())

const achievementId = ref(achievements.value[0]?.id || 'projects_1')
const position = ref('top')
const kicker = ref(t('achievement.toast.kicker'))
const autoHideMs = ref(0)
const show = ref(true)

const overrideName = ref('')
const overrideDescription = ref('')
const useLongText = ref(false)

function goBack() {
  router.back()
}

const selectedAchievement = computed(() => {
  const id = String(achievementId.value || '').trim()
  if (!id) return null
  return getLocalAchievementById(id) || { id }
})

const resolvedName = computed(() => {
  const s = String(overrideName.value || '').trim()
  if (s) return s

  const a = selectedAchievement.value
  if (!a) return ''

  if (useLongText.value) {
    return '超級超級長的成就名稱（用來測試換行與版面）Long long achievement name for layout testing'
  }

  return resolveAchievementName(a, { t, te }, '')
})

const resolvedDescription = computed(() => {
  const s = String(overrideDescription.value || '').trim()
  if (s) return s

  const a = selectedAchievement.value
  if (!a) return ''

  if (useLongText.value) {
    return '這是一段非常非常長的描述文字，用來測試 toast 的排版、換行、間距、以及在不同螢幕尺寸下的顯示效果。'
  }

  return resolveAchievementDescription(a, { t, te }, '')
})

async function triggerToast() {
  // retrigger transition
  show.value = false
  await nextTick()
  show.value = true
}

function toggleLongText() {
  useLongText.value = !useLongText.value
}
</script>

<style scoped>
.debug-ach-toast {
  min-height: 100vh;
  background: #f9fafb;
}

.debug-ach-toast__content {
  padding: 1rem;
  max-width: 1000px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.panel {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  padding: 1rem;
}

.panel__row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  margin-bottom: 0.75rem;
}

.panel__row:last-of-type {
  margin-bottom: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 220px;
}

.field--grow {
  flex: 1;
  min-width: 260px;
}

.field__label {
  font-size: 0.85rem;
  font-weight: 800;
  color: #374151;
}

.field__control {
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  padding: 0 0.75rem;
  font-weight: 700;
  color: #111827;
  background: #fff;
}

.panel__buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn {
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(66, 185, 131, 0.55);
  background: rgba(66, 185, 131, 0.14);
  color: #14532d;
  padding: 0 0.9rem;
  font-weight: 900;
  cursor: pointer;
}

.btn--ghost {
  border-color: rgba(0, 0, 0, 0.12);
  background: transparent;
  color: #111827;
}

.hint {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: #6b7280;
}

.stage {
  background: white;
  border: 1px dashed rgba(0, 0, 0, 0.12);
  border-radius: 14px;
  padding: 1rem;
}

.stage__text {
  margin: 0 0 0.75rem;
  font-weight: 800;
  color: #374151;
}

.stage__block {
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: #f3f4f6;
  padding: 1rem;
  margin: 0.6rem 0;
  font-weight: 800;
  color: #111827;
}
</style>
