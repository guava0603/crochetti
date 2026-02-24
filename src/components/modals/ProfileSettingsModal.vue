<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click="handleCancel">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <h2>{{ title }}</h2>
            <button class="close-button" type="button" @click="handleCancel">×</button>
          </div>

          <div class="modal-body">
            <div class="field">
              <label class="label" for="profile-name">{{ nameLabel }}</label>
              <input
                id="profile-name"
                v-model="draftName"
                class="input"
                type="text"
                autocomplete="name"
              />
            </div>

            <div class="field">
              <label class="label" for="profile-avatar">{{ avatarLabel }}</label>
              <input
                id="profile-avatar"
                v-model="draftAvatar"
                class="input"
                type="url"
                autocomplete="url"
                placeholder="https://..."
              />
            </div>

            <div class="actions">
              <button class="btn-secondary" type="button" :disabled="saving" @click="handleCancel">
                {{ cancelText }}
              </button>
              <button class="btn-primary" type="button" :disabled="saving" @click="handleSave">
                {{ saving ? savingText : saveText }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  profile: { type: Object, default: null },
  saving: { type: Boolean, default: false },

  title: { type: String, default: 'Profile settings' },
  nameLabel: { type: String, default: 'Name' },
  avatarLabel: { type: String, default: 'Avatar URL' },
  cancelText: { type: String, default: 'Cancel' },
  saveText: { type: String, default: 'Save' },
  savingText: { type: String, default: 'Saving…' }
})

const emit = defineEmits(['close', 'save'])

const draftName = ref('')
const draftAvatar = ref('')

const initialName = computed(() => String(props.profile?.name || '').trim())
const initialAvatar = computed(() => String(props.profile?.avatar || '').trim())

watch(
  () => [props.show, props.profile],
  () => {
    if (!props.show) return
    draftName.value = initialName.value
    draftAvatar.value = initialAvatar.value
  },
  { immediate: true }
)

function handleCancel() {
  emit('close')
}

function handleSave() {
  emit('save', {
    name: String(draftName.value || '').trim(),
    avatar: String(draftAvatar.value || '').trim() || null
  })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-container {
  background: white;
  border-radius: 12px;
  max-width: 480px;
  width: 92%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #111827;
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.close-button:hover {
  background-color: #f3f4f6;
}

.modal-body {
  padding: 1.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.9rem;
}

.label {
  font-size: 0.9rem;
  font-weight: 800;
  color: #111827;
}

.input {
  border: 1px solid rgba(0, 0, 0, 0.14);
  background: #fff;
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  font-weight: 700;
  color: #111827;
}

.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 0.5rem;
}

.btn-secondary {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.18);
  color: #111827;
  border-radius: 10px;
  padding: 0.6rem 0.9rem;
  font-weight: 800;
}

.btn-primary {
  background: #111827;
  border: none;
  color: #fff;
  border-radius: 10px;
  padding: 0.6rem 0.9rem;
  font-weight: 900;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
