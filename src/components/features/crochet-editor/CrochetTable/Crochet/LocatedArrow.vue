<template>
  <!-- Floating arrow above the located stitch (current position of work in a record).
       Every 5s it rests 4s, then spends 1s gliding down to touch the stitch's box and back up. -->
  <span class="located-arrow" aria-hidden="true">
    <svg viewBox="0 0 14 12" width="14" height="12">
      <path d="M7 11.2 0.9 1.6Q0.5 0.8 1.4 0.8H12.6Q13.5 0.8 13.1 1.6Z" />
    </svg>
  </span>
</template>

<script setup>
defineOptions({ name: 'LocatedArrow' })
</script>

<style scoped>
.located-arrow {
  position: absolute;
  left: 50%;
  /* Positioned from the box's padding edge; add the border so the tip meets its outside. */
  bottom: calc(100% + var(--located-border, 0px));
  /* In front of the table: above neighbouring rows and the header. */
  z-index: 30;
  display: block;
  width: 14px;
  height: 12px;
  margin-left: -7px;
  pointer-events: none;
  /* Resting gap above the box; the animation closes it to touch the border. */
  translate: 0 -6px;
  animation: located-arrow-touch 5s ease-in-out infinite;
}

.located-arrow svg {
  display: block;
  overflow: visible;
}

.located-arrow path {
  fill: var(--color-selected);
  stroke: #fff;
  stroke-width: 1.2;
  stroke-linejoin: round;
  paint-order: stroke;
  filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.18));
}

/* 5s cycle: 4s resting, then 1s moving (down to touch the box, then back up). */
@keyframes located-arrow-touch {
  0%,
  80%,
  100% {
    translate: 0 -6px;
  }
  90% {
    translate: 0 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .located-arrow {
    animation: none;
  }
}
</style>
