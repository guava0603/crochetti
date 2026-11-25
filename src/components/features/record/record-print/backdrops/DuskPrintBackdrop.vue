<template>
  <div class="print-style-backdrop print-style-backdrop--dusk" aria-hidden="true">
    <div class="print-style-backdrop__dusk-sky" />
    <div class="print-style-backdrop__dusk-glow" />
    <div class="print-style-backdrop__dusk-moon" />
    <span
      v-for="(star, index) in stars"
      :key="index"
      class="print-style-backdrop__dusk-star"
      :style="star"
    />
    <div class="print-style-backdrop__dusk-horizon" />
  </div>
</template>

<script setup>
defineOptions({ name: 'DuskPrintBackdrop' })

const stars = [
  { left: '8%', top: '12%', size: '0.22rem', opacity: '0.85' },
  { left: '18%', top: '22%', size: '0.16rem', opacity: '0.65' },
  { left: '32%', top: '10%', size: '0.2rem', opacity: '0.75' },
  { left: '48%', top: '18%', size: '0.14rem', opacity: '0.55' },
  { left: '62%', top: '8%', size: '0.24rem', opacity: '0.9' },
  { left: '74%', top: '20%', size: '0.18rem', opacity: '0.7' },
  { left: '86%', top: '14%', size: '0.2rem', opacity: '0.8' },
  { left: '92%', top: '28%', size: '0.15rem', opacity: '0.6' },
  { left: '14%', top: '34%', size: '0.17rem', opacity: '0.55' },
  { left: '38%', top: '30%', size: '0.19rem', opacity: '0.68' },
  { left: '56%', top: '32%', size: '0.16rem', opacity: '0.58' },
  { left: '80%', top: '36%', size: '0.21rem', opacity: '0.72' }
].map((s) => ({
  left: s.left,
  top: s.top,
  width: s.size,
  height: s.size,
  opacity: s.opacity
}))
</script>

<style scoped>
.print-style-backdrop--dusk {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  border-radius: inherit;
}

.print-style-backdrop__dusk-sky {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #1e1b4b 0%, #312e81 42%, #4c1d95 100%);
}

.print-style-backdrop__dusk-glow {
  position: absolute;
  top: 10%;
  left: 68%;
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(249, 168, 212, 0.35) 0%, transparent 68%);
}

.print-style-backdrop__dusk-moon {
  position: absolute;
  top: 11%;
  right: 16%;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fef3c7 0%, #fde68a 55%, rgba(253, 224, 71, 0.2) 100%);
  box-shadow: 0 0 1.5rem rgba(253, 224, 71, 0.35);
}

.print-style-backdrop__dusk-star {
  position: absolute;
  border-radius: 50%;
  background: #fef9c3;
  box-shadow: 0 0 0.35rem rgba(254, 249, 195, 0.8);
}

.print-style-backdrop__dusk-horizon {
  position: absolute;
  left: -8%;
  right: -8%;
  bottom: 0;
  height: 35%;
  background: linear-gradient(180deg, transparent 0%, rgba(76, 29, 149, 0.45) 100%);
  border-radius: 50% 50% 0 0 / 20% 20% 0 0;
}
</style>
