<template>
  <div class="input-content" :class="wrapperClass || undefined">
    <template v-if="repeatable">
      <div v-if="itemsResolved.length" class="input-content__list">
        <div
          v-for="(item, idx) in itemsResolved"
          :key="resolveKey(item, idx)"
          class="input-content__row"
          :class="rowClass || undefined"
        >
          <div v-if="wrapInput" class="input-content__input">
            <slot name="item" :item="item" :idx="idx" />
          </div>

          <slot v-else name="item" :item="item" :idx="idx" />

          <div
            v-if="showDelete"
            class="input-content__delete"
            :class="deleteClass || undefined"
            :aria-label="deleteAriaLabel || null"
          >
            <ButtonDeleteLight
              :disabled="disabled"
              @click="emit('delete', idx)"
            />
          </div>
        </div>
      </div>

      <div
        v-if="showAdd"
        class="input-content__add"
        :class="addClass || undefined"
      >
        <AddNew
          variant="row"
          size="md"
          :disabled="disabled"
          :aria-label="addAriaLabel || null"
          @click="emit('add')"
        />
      </div>
    </template>

    <template v-else>
      <div v-if="showRow" class="input-content__row" :class="rowClass || undefined">
        <div v-if="wrapInput" class="input-content__input">
          <slot />
        </div>

        <slot v-else />

        <div
          v-if="showDelete"
          class="input-content__delete"
          :class="deleteClass || undefined"
          :aria-label="deleteAriaLabel || null"
        >
          <ButtonDeleteLight
            :disabled="disabled"
            @click="emit('delete')"
          />
        </div>
      </div>

      <div
        v-if="showAdd"
        class="input-content__add"
        :class="addClass || undefined"
      >
        <AddNew
          variant="row"
          size="md"
          :disabled="disabled"
          :aria-label="addAriaLabel || null"
          @click="emit('add')"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, useSlots } from 'vue'
import AddNew from '@/components/buttons/AddNew.vue'
import ButtonDeleteLight from '@/components/buttons/ButtonDeleteLight.vue'

defineOptions({ name: 'FormSubsectionInputContent' })

const props = defineProps({
  wrapperClass: { type: String, default: '' },
  rowClass: { type: String, default: '' },
  deleteClass: { type: String, default: '' },
  addClass: { type: String, default: '' },
  wrapInput: { type: Boolean, default: true },

  repeatable: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  itemKey: { type: Function, default: null },

  showAdd: { type: Boolean, default: false },
  showDelete: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  addAriaLabel: { type: String, default: '' },
  deleteAriaLabel: { type: String, default: '' }
})

const emit = defineEmits(['add', 'delete'])

const slots = useSlots()

const showRow = computed(() => {
  return Boolean(props.showDelete || slots.default)
})

const itemsResolved = computed(() => {
  return Array.isArray(props.items) ? props.items : []
})

function resolveKey(item, idx) {
  if (typeof props.itemKey === 'function') return props.itemKey(item, idx)
  return idx
}
</script>

<style scoped>
.input-content {
  min-width: 0;
  margin-bottom: 0.5rem;
}

.input-content__row {
  position: relative;
  min-width: 0;
  display: flex;
  gap: 0.5rem;
}

.input-content__list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.3rem;
  margin-bottom: 0.5rem;
}

.input-content__input {
  width: 100%;
}

/* Default delete placement: floating top-right (matches common list-row affordance). */
.input-content__delete {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
}
</style>
