<template>
  <main>
    <div v-if="loading" class="loading-container">
      <p>Loading...</p>
    </div>

    <div v-else>
      <!-- User info bar -->
      <div class="user-bar">
        <div v-if="user" class="user-info">
          <img v-if="user.photoURL" :src="user.photoURL" alt="User avatar" class="user-avatar" />
          <span class="user-name">{{ user.displayName || user.email }}</span>
          <button @click="handleLogout" class="logout-button">Logout</button>
        </div>
        <div v-else class="user-info">
          <span class="guest-text">Not signed in</span>
          <button @click="openLoginModal" class="login-button">Sign In</button>
        </div>
      </div>

    </div>

    <!-- Login Modal -->
    <LoginModal
      :show="showLoginModal"
      @close="closeLoginModal"
      @login-success="handleLoginSuccess"
    />
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { auth } from '../firebaseConfig'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import LoginModal from '../components/LoginModal.vue'
import { openConfirmation } from '@/services/ui/confirmation'

const router = useRouter()
const { t } = useI18n({ useScope: 'global' })
const user = ref(null)
const showLoginModal = ref(false)
const loading = ref(true)

onMounted(() => {
  // Listen for auth state changes
  onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser
    loading.value = false

    // If logged in, redirect to user's own page
    if (currentUser) {
      router.push(`/user/${currentUser.uid}`)
    } else {
      // If not logged in, show login modal
      showLoginModal.value = true
    }
  })
})

const handleLoginSuccess = (loggedInUser) => {
  user.value = loggedInUser
  showLoginModal.value = false
  // Redirect to user's page after login
  router.push(`/user/${loggedInUser.uid}`)
}

const handleLogout = async () => {
  try {
    await openConfirmation({
      title: t('auth.logoutTitle'),
      message: t('auth.logoutMessage'),
      confirmText: t('auth.logout'),
      cancelText: t('common.cancel'),
      loadingText: t('auth.loggingOut'),
      onConfirm: async () => {
        await signOut(auth)
        user.value = null
        showLoginModal.value = true
      }
    })
  } catch (error) {
    console.error('Logout error:', error)
  }
}

const openLoginModal = () => {
  showLoginModal.value = true
}

const closeLoginModal = () => {
  showLoginModal.value = false
}
</script>

<style scoped>
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: #6b7280;
}

.user-bar {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 2rem;
  margin-bottom: 2rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
}

.user-name {
  flex: 1;
  font-weight: 500;
  color: #111827;
}

.guest-text {
  flex: 1;
  color: #6b7280;
}

.login-button,
.logout-button {
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.login-button {
  background: #42b983;
  color: white;
}

.login-button:hover {
  background: #3aa876;
}

.logout-button {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.logout-button:hover {
  background: #f3f4f6;
}
</style>
