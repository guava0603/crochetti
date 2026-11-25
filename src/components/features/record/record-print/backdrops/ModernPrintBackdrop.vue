<template>
  <div class="print-style-backdrop print-style-backdrop--modern" aria-hidden="true">
    <div class="print-style-backdrop__modern-fill" />
    <span
      v-for="(line, index) in gridLines"
      :key="index"
      class="print-style-backdrop__modern-line"
      :class="line.type === 'v' ? 'is-vertical' : 'is-horizontal'"
      :style="line"
    />
    <span class="print-style-backdrop__modern-accent" />
  </div>
</template>

<script setup>
defineOptions({ name: 'ModernPrintBackdrop' })

const gridLines = [
  { type: 'v', left: '20%', top: '0', bottom: '0' },
  { type: 'v', left: '50%', top: '0', bottom: '0' },
  { type: 'v', left: '80%', top: '0', bottom: '0' },
  { type: 'h', left: '0', right: '0', top: '25%' },
  { type: 'h', left: '0', right: '0', top: '55%' },
  { type: 'h', left: '0', right: '0', top: '82%' }
]
</script>

<style scoped>
.print-style-backdrop--modern {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  border-radius: inherit;
}

.print-style-backdrop__modern-fill {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
}

.print-style-backdrop__modern-line {
  position: absolute;
  background: rgba(17, 24, 39, 0.06);
}

.print-style-backdrop__modern-line.is-vertical {
  width: 1px;
}

.print-style-backdrop__modern-line.is-horizontal {
  height: 1px;
}

.print-style-backdrop__modern-accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 4.5rem;
  height: 0.35rem;
  background: #3b82f6;
}
</style>
