<template>
  <component
    :is="cardComponent"
    :current-user="currentUser"
    :profile="profile"
    :section-visibility="sectionVisibility"
    :disable-animations="disableAnimations"
    :print-theme="printTheme"
    :layout="layout"
  >
    <template v-if="$slots['extra-images']" #extra-images>
      <slot name="extra-images" />
    </template>
    <template v-if="$slots['project-title']" #project-title>
      <slot name="project-title" />
    </template>
    <template v-if="$slots['extra-note']" #extra-note>
      <slot name="extra-note" />
    </template>
  </component>
</template>

<script setup>
import { computed } from 'vue'
import RecordResult from '@/components/features/record/RecordResult.vue'
import SpringPrintCard from '@/components/features/record/record-print/cards/SpringPrintCard.vue'

const props = defineProps({
  styleId: { type: String, default: 'warm' },
  currentUser: { type: Object, default: null },
  profile: { type: Object, default: null },
  sectionVisibility: {
    type: Object,
    default: undefined
  },
  disableAnimations: {
    type: Boolean,
    default: false
  },
  printTheme: {
    type: Object,
    default: null
  },
  layout: {
    type: String,
    default: 'sharing'
  }
})

const CARD_BY_STYLE = {
  spring: SpringPrintCard
}

const cardComponent = computed(() => CARD_BY_STYLE[props.styleId] || RecordResult)
</script>
