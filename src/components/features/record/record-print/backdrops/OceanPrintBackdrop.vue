<template>
  <div class="print-style-backdrop print-style-backdrop--ocean ocean-print-backdrop" aria-hidden="true">
    <div class="ocean-print-backdrop__sky" />
    <div class="ocean-print-backdrop__sun" />
    <div class="ocean-print-backdrop__cloud ocean-print-backdrop__cloud--a" />
    <div class="ocean-print-backdrop__cloud ocean-print-backdrop__cloud--b" />
    <div class="ocean-print-backdrop__water" />
    <div class="ocean-print-backdrop__wave ocean-print-backdrop__wave--deep" />
    <div class="ocean-print-backdrop__wave ocean-print-backdrop__wave--far" />
    <div class="ocean-print-backdrop__wave ocean-print-backdrop__wave--mid" />
    <div class="ocean-print-backdrop__wave ocean-print-backdrop__wave--near" />
    <div class="ocean-print-backdrop__wave ocean-print-backdrop__wave--crest" />
    <div class="ocean-print-backdrop__foam" />
    <div class="ocean-print-backdrop__spray" />
    <span
      v-for="(bubble, index) in bubbles"
      :key="index"
      class="ocean-print-backdrop__bubble"
      :style="bubble"
    />
  </div>
</template>

<script setup>
defineOptions({ name: 'OceanPrintBackdrop' })

const bubbles = [
  { left: '12%', top: '58%', width: '0.45rem', height: '0.45rem', opacity: '0.45' },
  { left: '78%', top: '52%', width: '0.35rem', height: '0.35rem', opacity: '0.35' },
  { left: '64%', top: '72%', width: '0.55rem', height: '0.55rem', opacity: '0.4' },
  { left: '28%', top: '78%', width: '0.3rem', height: '0.3rem', opacity: '0.3' },
  { left: '88%', top: '68%', width: '0.4rem', height: '0.4rem', opacity: '0.38' },
  { left: '46%', top: '64%', width: '0.25rem', height: '0.25rem', opacity: '0.28' },
  { left: '22%', top: '48%', width: '0.32rem', height: '0.32rem', opacity: '0.32' },
  { left: '55%', top: '76%', width: '0.38rem', height: '0.38rem', opacity: '0.36' }
]
</script>
