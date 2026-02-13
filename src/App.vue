<template>
  <header>
    <!-- <div class="app-lang">
      <label class="app-lang__label" for="app-lang-select">{{ $t('app.language') }}</label>
      <select
        id="app-lang-select"
        class="app-lang__select"
        :value="locale"
        :aria-label="$t('app.switchLanguage')"
        @change="onLocaleChange"
      >
        <option v-for="l in SUPPORTED_LOCALES" :key="l.code" :value="l.code">{{ l.label }}</option>
      </select>
    </div> -->
  </header>

  <RouterView />

  <GlobalConfirmationModal />
</template>

<script setup>
import GlobalConfirmationModal from '@/components/modals/GlobalConfirmationModal.vue'
import { RouterView } from 'vue-router'
</script>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.app-lang {
  position: fixed;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(6px);
}

.app-lang__label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #374151;
}

.app-lang__select {
  appearance: none;
  border: 1px solid rgba(0, 0, 0, 0.14);
  background: #fff;
  border-radius: 8px;
  padding: 0.35rem 0.6rem;
  font-weight: 700;
  color: #111827;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
