<template>
  <div class="record-card__media-placeholder" :aria-hidden="ariaHidden ? 'true' : null">
    <img
      class="record-card__default-image"
      :src="src"
      :alt="alt"
      :loading="loading"
      :decoding="decoding"
    />
  </div>
</template>

<script setup>
defineOptions({
  name: 'DefaultImage'
})

defineProps({
  src: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: ''
  },
  ariaHidden: {
    type: Boolean,
    default: true
  },
  loading: {
    type: String,
    default: 'lazy'
  },
  decoding: {
    type: String,
    default: 'async'
  }
})
</script>

<style scoped>
.record-card__media-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: var(--color-surface-accent);
}

.record-card__default-image {
  width: clamp(2.4rem, 10vw, 3.4rem);
  height: clamp(2.4rem, 10vw, 3.4rem);
  display: block;
  opacity: 0.95;
  filter: drop-shadow(0 0.15rem 0 rgba(0, 0, 0, 0.12));
}
</style>
