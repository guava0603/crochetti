<template>
  <svg
    class="button-add"
    :class="{ 'button-add--flat': type === 'flat' }"
    viewBox="100 100 1000 1000"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="m600 99.984c275.95 0 500.02 224.06 500.02 500.02s-224.06 500.02-500.02 500.02-500.02-224.06-500.02-500.02 224.06-500.02 500.02-500.02zm-50.016 550.03v150c0 27.609 22.406 49.969 50.016 49.969s50.016-22.406 50.016-49.969v-150h150c27.609 0 49.969-22.406 49.969-50.016s-22.406-50.016-49.969-50.016h-150v-150c0-27.609-22.406-49.969-50.016-49.969s-50.016 22.406-50.016 49.969v150h-150c-27.609 0-49.969 22.406-49.969 50.016s22.406 50.016 49.969 50.016z" fill-rule="evenodd" />
  </svg>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'flat'].includes(v)
  }
})
</script>

<style lang="css" scoped>
.button-add {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.20);
  color: var(--color-icon-add);
}

.button-add.button-add--flat {
  box-shadow: none;
}
</style>
