<template>
  <!-- Rows (Crochet) -->
  <div v-if="isEditing" class="rows-subsection">
    <FormSubsection
      wrapper-class="subsection"
      kind="slot"
      :title="t('common.rows')"
      required
    >
      <EditingTable
        v-model="rowListModel"
        v-model:row-groups="rowGroupsModel"
      />
    </FormSubsection>

    <HelpIconButton
      class="rows-subsection__help"
      topic-id="crochetTableBasics"
      :aria-label="t('help.crochetTableBasics.aria')"
    />
  </div>

  <FormSubsection
    v-else
    wrapper-class="view-section"
    kind="slot"
    :show-header="false"
  >
    <FixTable
      :model-value="rowListModel"
      :row-groups="rowGroupsModel"
    />
  </FormSubsection>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import HelpIconButton from '@/components/help/HelpIconButton.vue'
import FormSubsection from '@/components/AddProject/FormSubsection.vue'
import EditingTable from '@/components/CrochetTable/EditingTable.vue'
import FixTable from '@/components/CrochetTable/FixTable.vue'

const { t } = useI18n({ useScope: 'global' })

defineOptions({
  name: 'ComponentCardComponentCrochet'
})

const props = defineProps({
  modelValue: { type: Array, required: true },
  rowGroups: { type: Array, default: () => [] },
  isEditing: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'update:rowGroups'])

const isEditing = computed(() => props.isEditing)

const rowListModel = computed({
  get() {
    return Array.isArray(props.modelValue) ? props.modelValue : []
  },
  set(next) {
    emit('update:modelValue', Array.isArray(next) ? next : [])
  }
})

const rowGroupsModel = computed({
  get() {
    return Array.isArray(props.rowGroups) ? props.rowGroups : []
  },
  set(next) {
    emit('update:rowGroups', Array.isArray(next) ? next : [])
  }
})
</script>
