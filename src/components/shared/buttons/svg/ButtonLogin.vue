<template>
  <svg
    class="button-login"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="login"
  >
    <!-- door -->
    <path
      d="M4.5 4.5H12.5C13.6046 4.5 14.5 5.39543 14.5 6.5V17.5C14.5 18.6046 13.6046 19.5 12.5 19.5H4.5"
      stroke="#6b7280"
      stroke-width="2.3"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <!-- arrow -->
    <path
      d="M12.5 12H21"
      stroke="#6b7280"
      stroke-width="2.3"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M18 9L21 12L18 15"
      stroke="#6b7280"
      stroke-width="2.3"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<style scoped>
.button-login {
  width: 20px;
  height: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.button-login:hover {
  filter: brightness(0.9);
}
</style>
