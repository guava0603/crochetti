<template>
  <!-- Active container (pattern or bundle): yellow box -->
  <span v-if="isActive" class="kp-node kp-node--active">
    <span class="kp-active-box">
      <template v-if="node.type === 'pattern'">
        <template v-for="(child, i) in children" :key="i">
          <KeypadCaret v-if="caret === i" />
          <KeypadPreviewNode
            :node="child"
            :path="[...path, i]"
            :active-path="activePath"
            :caret="caret"
            @pick="(p) => $emit('pick', p)"
            @update-count="(n) => $emit('update-count', n)"
          />
          <span v-if="i < children.length - 1" class="kp-sep">, </span>
        </template>
        <KeypadCaret v-if="caret >= children.length" />
        <span v-if="!children.length" class="kp-placeholder">…</span>
      </template>
      <template v-else>
        <span class="kp-paren">(</span>
        <template v-for="(child, i) in children" :key="i">
          <KeypadCaret v-if="caret === i" />
          <KeypadPreviewNode
            :node="child"
            :path="[...path, i]"
            :active-path="activePath"
            :caret="caret"
            @pick="(p) => $emit('pick', p)"
            @update-count="(n) => $emit('update-count', n)"
          />
          <span v-if="i < children.length - 1" class="kp-sep">, </span>
        </template>
        <KeypadCaret v-if="caret >= children.length" />
        <span v-if="!children.length" class="kp-placeholder">…</span>
        <span class="kp-paren">)</span>
      </template>
    </span>
    <!-- Selected pattern or bundle: both repeat their child list × n. -->
    <span class="kp-count" @click.stop>
      <span class="kp-count__symbol">×</span>
      <InputNumber
        :model-value="patternCount"
        size="sm"
        :min="1"
        :max="999"
        :aria-label="t('toolbar.editCrochet.count')"
        @update:model-value="(n) => $emit('update-count', n)"
      />
    </span>
  </span>

  <!-- Pattern on the way to the active one, or a long pattern: [a, b] * n -->
  <span v-else-if="node.type === 'pattern' && !isCompact" class="kp-node">
    <span class="kp-bracket" @click.stop="pickSelf">[</span>
    <template v-for="(child, i) in children" :key="i">
      <KeypadPreviewNode
        :node="child"
        :path="[...path, i]"
        :active-path="activePath"
        :caret="caret"
        @pick="(p) => $emit('pick', p)"
        @update-count="(n) => $emit('update-count', n)"
      />
      <span v-if="i < children.length - 1" class="kp-sep">, </span>
    </template>
    <span class="kp-bracket" @click.stop="pickSelf">]<template v-if="patternCount > 1">{{ repeatSuffix }}</template></span>
  </span>

  <!-- Compact single-stitch pattern: 6短針 -->
  <span v-else-if="node.type === 'pattern'" class="kp-node kp-clickable" @click.stop="pickSelf">
    <span v-if="patternCount > 1" class="kp-compact-count">{{ patternCount }}</span>
    <component
      :is="StitchComponent"
      :stitch-id="children[0].stitch_id"
      :position="children[0].position"
      :count="1"
    />
  </span>

  <!-- Leaves -->
  <span v-else class="kp-node kp-clickable" @click.stop="pickSelf">
    <component
      v-if="node.type === 'stitch'"
      :is="StitchComponent"
      :stitch-id="node.stitch_id"
      :position="node.position"
      :count="node.count || 1"
    />
    <component
      v-else-if="node.type === 'bundle'"
      :is="BundleComponent"
      :node="node"
      table-type="view"
      :level="0"
      :selection="null"
    />
    <component
      v-else-if="node.type === 'rope'"
      :is="RopeComponent"
      :chain-count="node.chain_count"
      :count="node.count || 1"
    />
  </span>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from '@/components/shared/inputs/InputNumber.vue'
import KeypadCaret from './KeypadCaret.vue'
import CrochetStitch from '@/components/features/crochet-editor/CrochetTable/Crochet/CrochetStitch.vue'
import CrochetBundle from '@/components/features/crochet-editor/CrochetTable/Crochet/CrochetBundle.vue'
import CrochetRope from '@/components/features/crochet-editor/CrochetTable/Crochet/CrochetRope.vue'
import { CROCHET_LANG } from '@/constants/crochetData.js'
import { useCrochetLang } from '@/composables/useCrochetLang'

defineOptions({ name: 'KeypadPreviewNode' })

const props = defineProps({
  node: { type: Object, required: true },
  path: { type: Array, required: true },
  activePath: { type: Array, default: () => [] },
  // Insertion point inside the active container; drawn only where this node is active.
  caret: { type: Number, default: 0 }
})

const emit = defineEmits(['pick', 'update-count'])

const { t } = useI18n({ useScope: 'global' })
const { crochetLang } = useCrochetLang()

// Same render overrides as the table (knitting reuses this editor).
const StitchComponent = inject('stitchComponent', CrochetStitch)
const BundleComponent = inject('bundleComponent', CrochetBundle)
const RopeComponent = inject('ropeComponent', CrochetRope)
const showZhRepeatOverride = inject('showZhRepeatOverride', null)

const children = computed(() => {
  if (props.node?.type === 'pattern') return Array.isArray(props.node.pattern) ? props.node.pattern : []
  if (props.node?.type === 'bundle') return Array.isArray(props.node.bundle) ? props.node.bundle : []
  return []
})

const samePath = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
const isActive = computed(() => props.activePath.length > 0 && samePath(props.path, props.activePath))
const isAncestorOfActive = computed(() =>
  props.activePath.length > props.path.length && props.path.every((v, i) => v === props.activePath[i])
)

// Repeat count of a pattern or bundle (both are containers with a child list).
const patternCount = computed(() => Math.max(1, Number(props.node?.count) || 1))

const isCompact = computed(() =>
  !isAncestorOfActive.value && children.value.length === 1 && children.value[0]?.type === 'stitch'
)

const showZhRepeat = computed(() => {
  if (typeof showZhRepeatOverride === 'boolean') return showZhRepeatOverride
  return crochetLang.value === CROCHET_LANG.text_zh
})

const repeatSuffix = computed(() =>
  showZhRepeat.value
    ? t('crochet.display.patternRepeatSuffix', { count: patternCount.value })
    : ` * ${patternCount.value}`
)

const pickSelf = () => emit('pick', props.path)
</script>

<style scoped>
.kp-node {
  display: inline;
}

.kp-clickable,
.kp-bracket {
  cursor: pointer;
}

.kp-bracket {
  color: #6b7280;
  font-weight: 600;
}

.kp-sep {
  color: #6b7280;
}

/* Active pattern/bundle: everything stays inline on the text baseline so the
   highlighted chips line up with the surrounding stitches. */
.kp-node--active {
  display: inline;
}

.kp-active-box,
.kp-count :deep(.input-number__trigger) {
  display: inline-block;
  vertical-align: baseline;
  padding: 1px 4px;
  border: 0;
  border-radius: 4px;
  background: color-mix(in srgb, var(--color-highlight-yellow) 45%, transparent);
  box-shadow: inset 0 0 0 1.5px var(--color-highlight-yellow);
  font: inherit;
  line-height: inherit;
  color: inherit;
}

.kp-placeholder {
  color: #9ca3af;
}

.kp-paren {
  color: #6b7280;
}

.kp-count {
  display: inline;
  margin-left: 0.25rem;
}

.kp-count__symbol {
  font-weight: 900;
  color: #6b7280;
  margin-right: 0.2rem;
}

.kp-count :deep(.input-number) {
  display: inline;
  vertical-align: baseline;
}

/* The count chip is a button: same look as the pattern chip, plus bold digits and a min width. */
.kp-count :deep(.input-number__trigger) {
  min-width: 1.5rem;
  text-align: center;
  font-weight: 800;
  cursor: pointer;
}

.kp-count :deep(.input-number__trigger:hover:not(:disabled)) {
  background: color-mix(in srgb, var(--color-highlight-yellow) 65%, transparent);
}

.kp-compact-count {
  margin-right: 1px;
}
</style>
