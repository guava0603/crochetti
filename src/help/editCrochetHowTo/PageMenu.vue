<template>
  <div class="help-page">
    <h3 class="help-page__title">{{ t('help.editCrochetHowTo.pageMenu.title') }}</h3>
    <p class="help-page__text">{{ t('help.editCrochetHowTo.pageMenu.body') }}</p>

    <div class="help-menu" role="list">
      <button
        v-for="item in menuItems"
        :key="item.pageIndex"
        type="button"
        class="help-menu__btn"
        role="listitem"
        @click.stop="goHelpPage(item.pageIndex)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { goHelpPage } from '@/services/ui/help'

const { t } = useI18n({ useScope: 'global' })

const menuItems = computed(() => {
  return [
    { pageIndex: 1, label: t('help.editCrochetHowTo.pageMenu.items.addBundle') },
    { pageIndex: 2, label: t('help.editCrochetHowTo.pageMenu.items.deleteBundle') },
    { pageIndex: 3, label: t('help.editCrochetHowTo.pageMenu.items.increase') },
    { pageIndex: 4, label: t('help.editCrochetHowTo.pageMenu.items.decrease') },
    { pageIndex: 5, label: t('help.editCrochetHowTo.pageMenu.items.position') },
    { pageIndex: 6, label: t('help.editCrochetHowTo.pageMenu.items.custom') }
  ]
})
</script>

<style scoped>
.help-menu {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.help-menu__btn {
  appearance: none;
  border: 1px solid rgb(0 0 0 / 0.12);
  background: #fff;
  border-radius: 12px;
  padding: 0.65rem 0.85rem;
  text-align: left;
  font-weight: 800;
  color: #111827;
  cursor: pointer;
}

.help-menu__btn:hover {
  background: rgb(0 0 0 / 0.04);
}

.help-menu__btn:active {
  transform: translateY(0.5px);
}
</style>
