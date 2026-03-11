<template>
  <div class="wish-pool-view">
    <div class="page-content wish-pool-view__page">
      <div class="wish-pool-view__inner">
        <p class="wish-pool-view__hint">{{ $t('wishPool.hint') }}</p>

        <form class="wish-pool-form" @submit.prevent="handleSubmit">
          <section class="subsection" aria-label="wish description">
            <div class="subsection-header">
              <h5>{{ $t('wishPool.descriptionLabel') }}</h5>
            </div>
            <div class="subsection-body">
              <textarea
                v-model="description"
                class="field__control field__control--textarea"
                :placeholder="$t('wishPool.descriptionPlaceholder')"
                rows="10"
                :disabled="loading"
              />
              <span class="field__meta" :class="{ 'field__meta--error': isOverLimit }">
                {{ $t('wishPool.wordCount', { n: wordCount, max: WORD_LIMIT }) }}
              </span>
            </div>
          </section>

          <section class="subsection" aria-label="contact preference">
            <div class="subsection-header">
              <h5>{{ $t('wishPool.allowContact') }}</h5>
            </div>
            <div class="subsection-body">
              <label class="contact-opt-in">
                <input v-model="allowContact" type="checkbox" :disabled="loading" />
                <span>{{ $t('wishPool.allowContact') }}</span>
              </label>
            </div>
          </section>

          <section v-if="allowContact" class="subsection" aria-label="contact email">
            <div class="subsection-header">
              <h5>{{ $t('wishPool.emailLabel') }}</h5>
            </div>
            <div class="subsection-body">
              <input
                v-model="email"
                class="field__control"
                type="email"
                inputmode="email"
                autocomplete="email"
                :placeholder="$t('wishPool.emailPlaceholder')"
                :disabled="loading"
              />
              <span class="field__meta">{{ $t('wishPool.emailHint') }}</span>
            </div>
          </section>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { openError, openNotice } from '@/services/ui/notice'
import { useFooterContext } from '@/composables/footerContext'

defineOptions({ name: 'WishPoolViewMain' })

const props = defineProps({
  currentUser: { type: Object, default: null },
  profile: { type: Object, default: null },
  // keep profile for potential future personalization
})

const currentUser = computed(() => props.currentUser)

const emit = defineEmits(['api'])

function callApi(name, ...args) {
  return new Promise((resolve, reject) => {
    emit('api', { name, args, resolve, reject })
  })
}

const { t } = useI18n({ useScope: 'global' })
const footer = useFooterContext()

const WORD_LIMIT = 1000

const loading = ref(false)
const description = ref('')
const allowContact = ref(false)
const email = ref('')

function countWordsLike(text) {
  const s = String(text || '').trim()
  if (!s) return 0

  // Count CJK characters as 1 each; count other letter/number sequences as 1.
  // This approximates "1000 words" across mixed languages.
  const matches = s.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[\p{L}\p{N}]+/gu)
  return matches ? matches.length : 0
}

const wordCount = computed(() => countWordsLike(description.value))
const isOverLimit = computed(() => wordCount.value > WORD_LIMIT)

const canSubmit = computed(() => {
  if (loading.value) return false
  if (!String(description.value || '').trim()) return false
  if (isOverLimit.value) return false

  if (!allowContact.value) return true
  const e = String(email.value || '').trim()
  return Boolean(e)
})

watch(
  () => [loading.value, canSubmit.value],
  () => {
    footer.setActions({
      ariaLabel: t('wishPool.submitBarAria'),
      justify: 'flex-end',
      primary: {
        label: loading.value ? t('wishPool.submitting') : t('wishPool.submit'),
        disabled: loading.value || !canSubmit.value,
        onClick: handleSubmit
      }
    })
  },
  { immediate: true }
)

onBeforeUnmount(() => footer.clearActions())



async function handleSubmit() {
  if (!canSubmit.value) return

  const user = currentUser.value
  if (!user) return

  loading.value = true
  try {
    await callApi('createWish', {
      description: description.value,
      userId: user.uid,
      email: allowContact.value ? email.value : ''
    })

    description.value = ''
    allowContact.value = false
    email.value = ''

    await openNotice({
      title: t('common.notice'),
      message: t('wishPool.success'),
      confirmText: t('common.ok')
    })
  } catch (err) {
    console.error('Wish submission failed:', err)
    await openError({
      title: t('common.error'),
      message: t('wishPool.errors.submitFailed'),
      confirmText: t('common.ok')
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.wish-pool-view {
  width: 100%;
}

.wish-pool-view__page {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  background: var(--color-surface-sheet);
}

.wish-pool-view__inner {
  max-width: 900px;
  margin: 0 auto;
  padding: 1.25rem;
}

.wish-pool-view__hint {
  margin: 0 0 1rem;
  color: var(--color-font-invisible);
  font-weight: 700;
}

.wish-pool-form {
  display: grid;
  gap: 1rem;
}

.subsection {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  padding: 1rem;
}

.subsection-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  margin-bottom: 0.75rem;
}

.subsection-header h5 {
  margin: 0;
  font-weight: 500;
  font-size: 0.95rem;
  font-weight: 900;
  color: var(--color-font-dark);
}

.subsection-body {
  display: grid;
  gap: 0.75rem;
}

.field__control {
  border: 1px solid rgba(0, 0, 0, 0.14);
  border-radius: 12px;
  padding: 0.75rem 0.9rem;
  font-weight: 700;
  background: #fff;
  color: var(--color-font-dark);
}

.field__control--textarea {
  resize: vertical;
  min-height: 180px;
  line-height: 1.4;
}

.field__meta {
  font-size: 0.9rem;
  color: var(--color-font-invisible);
  font-weight: 700;
}

.field__meta--error {
  color: #b91c1c;
}

.contact-opt-in {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 800;
  color: var(--color-font-dark);
  user-select: none;
}
</style>
