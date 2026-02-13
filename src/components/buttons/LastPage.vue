<template>
  <button @click="goBack" class="btn-back" type="button">
    ←
  </button>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.back()
}
</script>

<style scoped>
.btn-back {
  display: flex;
  background: white;
  color: #374151;
  border: none;
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 1.2rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}
</style>
