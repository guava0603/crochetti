<template>
  <Teleport to="body">
    <Transition name="cabinet-full">
      <div v-if="open" class="cabinet-full" role="dialog" aria-modal="true">
        <div class="cabinet-full__backdrop" @click="emit('close')" />

        <div class="cabinet-full__card">
          <div class="cabinet-full__card-header">
            <div class="cabinet-full__card-title">成就櫃</div>
          </div>
          <div class="cabinet-full__scroll">
            <section class="cabinet-full__categories">
              <section v-for="g in renderedGrouped" :key="g.id" class="cabinet-full__category">
                <div class="cabinet-full__category-title">{{ g.title }}</div>

                <div class="cabinet-full__grid" role="list">
                  <button
                    v-for="a in g.items"
                    :key="a.id"
                    class="cabinet-full__item"
                    :class="[
                      tierClass(a),
                      { 'cabinet-full__item--locked': Boolean(a?.isPlaceholder) }
                    ]"
                    type="button"
                    role="listitem"
                    :disabled="Boolean(a?.isPlaceholder)"
                    :aria-disabled="Boolean(a?.isPlaceholder)"
                    @click="onItemClick(a)"
                  >
                    <div class="cabinet-full__icon">
                      <img
                        v-if="!a?.isPlaceholder"
                        class="cabinet-full__icon-img"
                        :src="iconUrl(a)"
                        alt=""
                        draggable="false"
                      />
                    </div>
                    <div v-if="!a?.isPlaceholder" class="cabinet-full__name">{{ displayName(a) }}</div>
                  </button>
                </div>
              </section>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({
  name: 'AchievementCabinetFullModal'
})

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  grouped: {
    type: Array,
    default: () => []
  },
  isMyPage: {
    type: Boolean,
    default: false
  },
  tierClass: {
    type: Function,
    required: true
  },
  displayName: {
    type: Function,
    required: true
  },
  iconUrl: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['close', 'open-achievement'])

function normalizeTier(v) {
  return v != null ? String(v).trim().toLowerCase() : ''
}

function nextTierForCategory(items) {
  const earnedTiers = new Set()
  for (const a of items || []) {
    if (!a?.isEarned) continue
    const tier = normalizeTier(a?.tier)
    if (tier === 'brown' || tier === 'silver' || tier === 'gold') earnedTiers.add(tier)
  }

  if (!earnedTiers.has('brown')) return 'brown'
  if (!earnedTiers.has('silver')) return 'silver'
  if (!earnedTiers.has('gold')) return 'gold'
  return null
}

const renderedGrouped = computed(() => {
  const groups = Array.isArray(props.grouped) ? props.grouped : []
  const specialEarnedOnly = (g) => {
    const items = Array.isArray(g?.items) ? g.items : []
    const earnedItems = items.filter((a) => a?.isEarned)
    return earnedItems.length
      ? { ...g, items: earnedItems }
      : null
  }

  // On other users' pages, don't show the special category unless at least
  // one special achievement is earned.
  if (!props.isMyPage) {
    return groups
      .map((g) => (String(g?.id || '') === 'special' ? specialEarnedOnly(g) : g))
      .filter(Boolean)
  }

  // On my page: hide locked items and show only the next-tier placeholder per
  // category, except for special (never show placeholders for special).
  return groups
    .map((g) => {
      const gid = String(g?.id || '')
      if (gid === 'special') return specialEarnedOnly(g)

      const items = Array.isArray(g?.items) ? g.items : []
      const earnedItems = items.filter((a) => a?.isEarned)

      const nextTier = nextTierForCategory(items)
      const placeholder = nextTier
        ? {
            id: `__next_stage__${String(g?.id ?? '')}__${nextTier}`,
            tier: nextTier,
            isEarned: false,
            isPlaceholder: true
          }
        : null

      return {
        ...g,
        items: placeholder ? [...earnedItems, placeholder] : earnedItems
      }
    })
    .filter(Boolean)
})

function onItemClick(a) {
  if (a?.isPlaceholder) return
  emit('open-achievement', a)
}
</script>

<style scoped>
.cabinet-full {
  position: fixed;
  left: 0;
  right: 0;
  top: var(--visual-viewport-offset-top, 0px);
  height: var(--visual-viewport-height, 100dvh);
  /* Keep above in-page tabs/toolbars, but below app-level 9999 modals. */
  z-index: 9990;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: 16px;
  padding-top: calc(16px + env(safe-area-inset-top, 0px));
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
}

.cabinet-full__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(17, 24, 39, 0.35);
}

.cabinet-full__card {
  position: relative;
  max-height: min(
    calc(var(--visual-viewport-height, 100dvh) - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)),
    860px
  );
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background: #e0e0e0;
  border: 1px solid rgba(0, 0, 0, 0.12);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.cabinet-full__card-header {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 12px 14px 10px;
  background: rgba(245, 235, 218, 0.96);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.cabinet-full__card-title {
  font-size: 1.05rem;
  font-weight: 950;
  color: rgba(90, 63, 42, 0.95);
  text-align: center;
}

.cabinet-full__close {
  position: absolute;
  right: 10px;
  top: 8px;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid rgba(122, 90, 58, 0.25);
  background: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-size: 22px;
  font-weight: 900;
  color: #5a3f2a;
  z-index: 2;
}

.cabinet-full__scroll {
  flex: 1;
  padding: 10px;
  overflow: auto;

  scrollbar-width: none;
  -ms-overflow-style: none;
}

.cabinet-full__scroll::-webkit-scrollbar {
  display: none;
}

.cabinet-full__categories {
  display: grid;
  gap: 12px;
}

.cabinet-full__category {
  display: grid;
  gap: 8px;
}

.cabinet-full__category-title {
  font-size: 0.9rem;
  font-weight: 950;
  color: rgba(90, 63, 42, 0.9);
  letter-spacing: 0.02em;
}

.cabinet-full__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

@media (max-width: 420px) {
  .cabinet-full__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.cabinet-full__item {
  background: none;
  border: none;
  border-radius: 14px;
  padding: 10px 8px;
  display: grid;
  justify-items: center;
  gap: 6px;
  cursor: pointer;
}

.cabinet-full__item:disabled {
  cursor: default;
}

.cabinet-full__icon {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.65);
  border: 3px solid rgba(122, 90, 58, 0.18);
}

.cabinet-full__item.tier--brown .cabinet-full__icon {
  background-color: var(--tier-brown);
}

.cabinet-full__item.tier--silver .cabinet-full__icon {
  background-color: var(--tier-silver);
}

.cabinet-full__item.tier--gold .cabinet-full__icon {
  background-color: var(--tier-gold);
}

.cabinet-full__item.tier--special .cabinet-full__icon {
  background-color: var(--tier-special);
}

.cabinet-full__item--locked .cabinet-full__icon {
  border-style: dotted;
}

.cabinet-full__icon-img {
  width: 26px;
  height: 26px;
  object-fit: cover;
  border-radius: 8px;
}

.cabinet-full__name {
  width: 100%;
  font-size: 0.78rem;
  font-weight: 900;
  color: #5a3f2a;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cabinet-full-enter-active {
  transition: opacity 0.16s ease;
}

.cabinet-full-leave-active {
  transition: opacity 0.14s ease;
}

.cabinet-full-enter-from,
.cabinet-full-leave-to {
  opacity: 0;
}
</style>
