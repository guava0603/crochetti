<template>
  <svg class="button-finish" stroke-width="2.7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="var(--color-icon-add)">
    <path d="M1.5 12.5L5.57574 16.5757C5.81005 16.8101 6.18995 16.8101 6.42426 16.5757L9 14" stroke="var(--color-icon-add)" stroke-width="2.7" stroke-linecap="round"></path>
    <path d="M16 7L12 11" stroke="var(--color-icon-add)" stroke-width="2.7" stroke-linecap="round"></path><path d="M7 12L11.5757 16.5757C11.8101 16.8101 12.1899 16.8101 12.4243 16.5757L22 7" stroke="var(--color-icon-add)" stroke-width="2.7" stroke-linecap="round"></path>
  </svg>
</template>

<script setup>
defineOptions({ name: 'FinishIcon' })
</script>

<style scoped>
.button-finish {
  width: 20px;
  height: 20px;
  cursor: pointer;
  transition: all 0.2s;
}
</style>
