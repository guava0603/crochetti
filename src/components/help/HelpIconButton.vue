<template>
  <button
    type="button"
    class="help-icon-btn"
    :aria-label="resolvedAriaLabel"
    @click.stop="handleClick"
  >
    <img class="help-icon-btn__icon" :src="iconUrl" alt="" style="transform: scale(2);" />
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { help } from '@/services/ui/help'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  topicId: {
    type: String,
    required: true
  },
  ariaLabel: {
    type: String,
    default: ''
  }
})

const iconUrl = computed(() => {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}assets/image/settings/041__help.svg`
})

const resolvedAriaLabel = computed(() => {
  return props.ariaLabel || t('help.open')
})

function handleClick() {
  help(props.topicId)
}
</script>

<style scoped>
.help-icon-btn {
  appearance: none;
  background: var(--color-white);
  border: none;
  border-radius: 999px;
  box-shadow: none;
  width: 24px;
  height: 24px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.help-icon-btn:hover {
  background: #fff;
}

.help-icon-btn:active {
  transform: translateY(0.5px);
}

.help-icon-btn__icon {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
