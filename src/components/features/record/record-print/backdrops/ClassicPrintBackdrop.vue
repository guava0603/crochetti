<template>
  <div class="print-style-backdrop print-style-backdrop--classic" aria-hidden="true">
    <div class="print-style-backdrop__classic-paper" />
    <span class="print-style-backdrop__classic-frame print-style-backdrop__classic-frame--outer" />
    <span class="print-style-backdrop__classic-frame print-style-backdrop__classic-frame--inner" />
    <span
      v-for="(corner, index) in corners"
      :key="index"
      class="print-style-backdrop__classic-corner"
      :style="corner"
    />
  </div>
</template>

<script setup>
defineOptions({ name: 'ClassicPrintBackdrop' })

const corners = [
  { left: '3%', top: '3%', transform: 'rotate(0deg)' },
  { left: '97%', top: '3%', transform: 'rotate(90deg)' },
  { left: '3%', top: '97%', transform: 'rotate(-90deg)' },
  { left: '97%', top: '97%', transform: 'rotate(180deg)' }
]
</script>

<style scoped>
.print-style-backdrop--classic {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  border-radius: inherit;
}

.print-style-backdrop__classic-paper {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 18%, rgba(251, 191, 36, 0.12) 0%, transparent 40%),
    linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%);
}

.print-style-backdrop__classic-frame {
  position: absolute;
  border: 0.14rem solid rgba(146, 64, 14, 0.35);
  border-radius: 0.35rem;
  pointer-events: none;
}

.print-style-backdrop__classic-frame--outer {
  inset: 0.55rem;
}

.print-style-backdrop__classic-frame--inner {
  inset: 1rem;
  border-style: dashed;
  border-color: rgba(180, 83, 9, 0.28);
}

.print-style-backdrop__classic-corner {
  position: absolute;
  width: 1.35rem;
  height: 1.35rem;
  margin: -0.675rem 0 0 -0.675rem;
  border-top: 0.2rem solid rgba(180, 83, 9, 0.55);
  border-left: 0.2rem solid rgba(180, 83, 9, 0.55);
  border-radius: 0.15rem 0 0 0;
}
</style>
