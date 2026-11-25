<template>
  <div class="print-style-backdrop print-style-backdrop--simple" aria-hidden="true">
    <div class="print-style-backdrop__simple-fill" />
    <span class="print-style-backdrop__simple-rule print-style-backdrop__simple-rule--top" />
    <span class="print-style-backdrop__simple-rule print-style-backdrop__simple-rule--bottom" />
  </div>
</template>

<script setup>
defineOptions({ name: 'SimplePrintBackdrop' })
</script>

<style scoped>
.print-style-backdrop--simple {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  border-radius: inherit;
}

.print-style-backdrop__simple-fill {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #f9fafb 0%, #ffffff 100%);
}

.print-style-backdrop__simple-rule {
  position: absolute;
  left: 1.25rem;
  right: 1.25rem;
  height: 1px;
  background: rgba(209, 213, 219, 0.9);
}

.print-style-backdrop__simple-rule--top {
  top: 1.25rem;
}

.print-style-backdrop__simple-rule--bottom {
  bottom: 1.25rem;
}
</style>
