<template>
  <ThinIconButton
    class="help-icon-btn"
    src="041__help"
    size="s"
    background="soft"
    round="full"
    :aria-label="resolvedAriaLabel"
    @click.stop="handleClick"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { help } from '@/services/ui/help'
import ThinIconButton from '@/components/shared/buttons/ThinIconButton.vue'

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

const resolvedAriaLabel = computed(() => {
  return props.ariaLabel || t('help.open')
})

function handleClick() {
  help(props.topicId)
}
</script>

<style scoped>
.help-icon-btn {
  width: 24px;
  height: 24px;
  box-shadow: none;
}

.help-icon-btn :deep(.thin-icon-button__icon) {
  transform: scale(2);
}
</style>
