<template>
  <component :is="backdropComponent" v-if="backdropComponent" />
</template>

<script setup>
import { computed } from 'vue'
import SimplePrintBackdrop from '@/components/features/record/record-print/backdrops/SimplePrintBackdrop.vue'
import ModernPrintBackdrop from '@/components/features/record/record-print/backdrops/ModernPrintBackdrop.vue'
import ClassicPrintBackdrop from '@/components/features/record/record-print/backdrops/ClassicPrintBackdrop.vue'
import OceanPrintBackdrop from '@/components/features/record/record-print/backdrops/OceanPrintBackdrop.vue'
import DuskPrintBackdrop from '@/components/features/record/record-print/backdrops/DuskPrintBackdrop.vue'

const props = defineProps({
  styleId: { type: String, default: 'warm' }
})

const BACKDROP_BY_STYLE = {
  simple: SimplePrintBackdrop,
  modern: ModernPrintBackdrop,
  classic: ClassicPrintBackdrop,
  ocean: OceanPrintBackdrop,
  dusk: DuskPrintBackdrop
}

const backdropComponent = computed(() => BACKDROP_BY_STYLE[props.styleId] || null)
</script>
