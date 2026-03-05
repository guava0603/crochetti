<template>
  <div class="btn-back">
    <svg
      class="btn-back__icon"
      stroke-width="1.8"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M15 6L9 12L15 18"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </div>
</template>

<style scoped>
.btn-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--color-font-dark);
}

.btn-back__icon {
  width: 20px;
  height: 20px;
  display: block;
}

.btn-back:hover {
  background: rgba(243, 244, 246, 0.8);
}
</style>
