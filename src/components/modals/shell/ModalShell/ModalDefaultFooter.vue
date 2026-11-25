<template>
  <button
    v-if="showCancel"
    type="button"
    class="btn-secondary"
    :disabled="cancelDisabled"
    @click="emit('cancel')"
  >
    {{ cancelLabel }}
  </button>
  <button
    v-if="showSave"
    type="button"
    class="btn-primary"
    :disabled="saveDisabled || saving"
    @click="emit('save')"
  >
    {{ saving ? savingLabel : saveLabel }}
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'ModalDefaultFooter' })

const props = defineProps({
  cancelLabel: { type: String, default: '' },
  saveLabel: { type: String, default: '' },
  savingLabel: { type: String, default: '' },
  saving: { type: Boolean, default: false },
  saveDisabled: { type: Boolean, default: false },
  cancelDisabled: { type: Boolean, default: false },
  showCancel: { type: Boolean, default: true },
  showSave: { type: Boolean, default: true }
})

const emit = defineEmits(['cancel', 'save'])

const { t } = useI18n({ useScope: 'global' })

const cancelLabel = computed(() => props.cancelLabel || t('common.cancel'))
const saveLabel = computed(() => props.saveLabel || t('common.save'))
const savingLabel = computed(() => props.savingLabel || t('common.saving'))
</script>
