<template>
  <div class="component-card">
    <div class="card-header">
      <div class="card-title-row">
        <input
          v-if="isEditing"
          v-model="component.name"
          class="component-text"
          type="text"
        />
        <h4 v-else>{{ component.name }}</h4>
        <span class="component-type-badge">{{ component.type || 'component' }}</span>
      </div>
      <div class="card-actions">
        <slot name="actions"></slot>
      </div>
    </div>

    <div v-if="isEditing" class="component-desc-edit">
      <textarea
        v-model="component.description"
        class="component-text"
        rows="2"
        :placeholder="t('component.descriptionPlaceholder')"
      />
    </div>
    <p v-else-if="component?.description" class="component-desc">
      {{ component.description }}
    </p>

    <!-- Component Content (only for type 'component') -->
    <template v-if="!component.type || component.type === 'component'">
      <!-- Part Type (CastOn) - only show in add/edit mode -->
      <div v-if="isEditing" class="form-group">
        <SelectionInput
          v-model="component.content.type"
          :options="castOnOptions"
          :placeholder="'Cast On'"
        />
      </div>

      <!-- Rows -->
      <div :class="isEditing ? 'subsection' : 'view-section'">
        <div v-if="isEditing" class="subsection-header">
          <h5>Rows</h5>
        </div>

        <CrochetTable
          v-model="component.content.row_list"
          :type="isEditing ? 'edit' : 'view'"
        />
      </div>

      <!-- Decorations Section -->
      <div v-if="isEditing" class="subsection">
        <div class="subsection-header">
          <h5>Decorations</h5>
          <button type="button" @click="addDecoration" class="btn-add-small">+ Add</button>
        </div>
        <div v-for="(decoration, dIndex) in component.decorations" :key="dIndex" class="list-item">
          <input
            v-model="decoration.description"
            type="text"
            placeholder="Decoration description..."
            class="list-item-input"
          />
          <ButtonDelete
            class="component-remove-small"
            :text="t('common.delete')"
            :confirm-title="t('common.deleteConfirmTitle')"
            :confirm-message="t('common.deleteConfirmMessage')"
            :confirm-text="t('common.delete')"
            :cancel-text="t('common.cancel')"
            :loading-text="t('common.loading')"
            @click="removeDecoration(dIndex)"
          />
        </div>
        <p v-if="!component.decorations || component.decorations.length === 0" class="empty-message">
          No decorations added yet.
        </p>
      </div>
      <div v-else-if="component.decorations && component.decorations.length > 0" class="view-section" style="margin-top: 1rem;">
        <h5 class="view-section-title">Decorations</h5>
        <ul class="view-list">
          <li v-for="(decoration, dIndex) in component.decorations" :key="dIndex">
            {{ decoration.description }}
          </li>
        </ul>
      </div>

      <!-- Notes Section -->
      <div v-if="isEditing" class="subsection">
        <div class="subsection-header">
          <h5>Notes</h5>
          <button type="button" @click="addNote" class="btn-add-small">+ Add</button>
        </div>
        <div v-for="(note, nIndex) in component.notes" :key="nIndex" class="list-item">
          <input
            v-model="note.description"
            type="text"
            placeholder="Note description..."
            class="list-item-input"
          />
          <ButtonDelete
            class="component-remove-small"
            :text="t('common.delete')"
            :confirm-title="t('common.deleteConfirmTitle')"
            :confirm-message="t('common.deleteConfirmMessage')"
            :confirm-text="t('common.delete')"
            :cancel-text="t('common.cancel')"
            :loading-text="t('common.loading')"
            @click="removeNote(nIndex)"
          />
        </div>
        <p v-if="!component.notes || component.notes.length === 0" class="empty-message">
          No notes added yet.
        </p>
      </div>
      <div v-else-if="component.notes && component.notes.length > 0" class="view-section" style="margin-top: 1rem;">
        <h5 class="view-section-title">Notes</h5>
        <ul class="view-list">
          <li v-for="(note, nIndex) in component.notes" :key="nIndex">
            {{ note.description }}
          </li>
        </ul>
      </div>
    </template>

    <!-- Bottom actions (edit mode) -->
    <ButtonDelete
      v-if="isEditing"
      class="component-remove-btn"
      :text="t('common.delete')"
      :confirm-title="t('project.removeComponentTitle')"
      :confirm-message="t('project.removeComponentMessage', { name: component?.name || '' })"
      :confirm-text="t('common.delete')"
      :cancel-text="t('common.cancel')"
      :loading-text="t('project.deleting')"
      @click="$emit('remove')"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CastOn } from '@/constants/crochetData'
import CrochetTable from '@/components/Crochet/CrochetTable.vue'
import ButtonDelete from '@/components/buttons/ButtonDelete.vue'
import SelectionInput from '@/components/tools/SelectionInput.vue'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  component: {
    type: Object,
    required: true
  },
  isEditing: {
    type: Boolean,
    default: false
  },
  showEditActions: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['remove', 'confirm', 'cancel', 'update:component'])

const component = computed({
  get: () => props.component,
  set: (value) => emit('update:component', value)
})

const castOnOptions = computed(() => {
  return (CastOn || []).map((castOn) => ({
    value: castOn.index,
    label: t(castOn.nameKey)
  }))
})

// Initialize decorations and notes arrays if they don't exist
if (!component.value.decorations) {
  component.value.decorations = []
}
if (!component.value.notes) {
  component.value.notes = []
}

const addDecoration = () => {
  if (!component.value.decorations) {
    component.value.decorations = []
  }
  component.value.decorations.push({ description: '' })
}

const removeDecoration = (index) => {
  component.value.decorations.splice(index, 1)
}

const addNote = () => {
  if (!component.value.notes) {
    component.value.notes = []
  }
  component.value.notes.push({ description: '' })
}

const removeNote = (index) => {
  component.value.notes.splice(index, 1)
}
</script>

<style scoped>
.component-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  position: relative;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card-header h4 {
  margin: 0;
  color: #111827;
}

.component-name-input {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
  background: white;
}

.component-name-input:focus {
  outline: none;
  border-color: #42b983;
}

.component-type-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 12px;
  font-weight: 500;
}

.simple-content {
  margin-top: 1rem;
  background: white;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.simple-content p {
  margin: 0;
  color: #374151;
  line-height: 1.6;
}

.simple-content textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #3b82f6;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;
}

.simple-content textarea:focus,
.editable-text:focus {
  outline: none;
  border-color: #2563eb;
}

.view-section {
  /* background: white; */
  border-radius: 6px;
}

.subsection {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.subsection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.subsection-header h5 {
  margin: 0;
  font-size: 1rem;
}

.component-desc-edit {
  margin: 0.25rem 0 0.75rem;
}

.component-text {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  resize: vertical;
}

.component-text:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.12);
}

.component-desc {
  margin: 0.25rem 0 0.75rem;
  color: #6b7280;
  font-size: 0.95rem;
  line-height: 1.5;
}

:deep(.component-remove-btn) {
  min-width: 84px;
  height: 32px;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.form-group select:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.1);
}

.component-footer__actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-left: auto;
}

.btn-cancel {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #f3f4f6;
}

.btn-confirm {
  background: #42b983;
  color: white;
  border: none;
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-confirm:hover {
  background: #3aa876;
}

.btn-add-small {
  background: white;
  color: #42b983;
  padding: 0.25rem 0.75rem;
  border: 1px solid #42b983;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-add-small:hover {
  background: #42b983;
  color: white;
}

.list-item {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  align-items: center;
}

.list-item-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.list-item-input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.1);
}

:deep(.component-remove-small) {
  min-width: 64px;
  height: 30px;
  padding: 0.35rem 0.65rem;
  font-size: 0.8rem;
  border-radius: 8px;
  flex-shrink: 0;
}

.empty-message {
  color: #9ca3af;
  font-size: 0.875rem;
  font-style: italic;
  margin: 0;
}

.view-section-title {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  color: #374151;
  font-weight: 600;
}

.view-list {
  margin: 0;
  padding-left: 1.5rem;
  list-style: disc;
}

.view-list li {
  color: #374151;
  font-size: 0.875rem;
  line-height: 1.6;
  margin-bottom: 0.25rem;
}
</style>
