<template>
  <!-- Insertion point of the keypad: where the next stitch / pattern / group goes. -->
  <span class="keypad-caret" aria-hidden="true" />
</template>

<script setup>
defineOptions({ name: 'KeypadCaret' })
</script>

<style scoped>
.keypad-caret {
  display: inline-block;
  /* Takes no room in the line: the 2px bar is cancelled by -1px margins on each side,
     so moving the caret never shifts the stitches. */
  position: relative;
  width: 2px;
  height: 1.15em;
  margin: 0 -1px;
  vertical-align: -0.2em;
  border-radius: 1px;
  background: var(--color-icon-add);
  animation: keypad-caret-blink 1.1s steps(1) infinite;
}

@keyframes keypad-caret-blink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .keypad-caret {
    animation: none;
  }
}
</style>
