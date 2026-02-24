<template>
  <div class="button-result">
    <svg width="30px" height="30px" viewBox="0 0 24 24" stroke-width="2" fill="none" xmlns="http://www.w3.org/2000/svg" color="#cb5252"><path d="M19 15V21H5V15" stroke="#cb5252" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M16 17L8 17" stroke="#cb5252" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M15.9126 14.6633L8.0874 13" stroke="#cb5252" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M16.7127 12.3809L9.46228 9" stroke="#cb5252" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M18.1728 10.6423L12.0444 5.5" stroke="#cb5252" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M20.0338 8.80409L15.1085 2.5" stroke="#cb5252" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
  </div>
</template>

<script setup>
defineOptions({ name: 'ResultIcon' })
</script>

<style scoped>
.button-result {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.20);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.05s, background 0.15s, box-shadow 0.15s;
}

.button-result:hover {
  background: rgba(255, 255, 255, 1);
}

.button-result:active {
  transform: translateY(1px);
}

.button-result:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(203, 82, 82, 0.25);
}
</style>
