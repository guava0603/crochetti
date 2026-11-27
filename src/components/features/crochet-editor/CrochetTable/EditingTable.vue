<template>
	<div class="crochet-table-shell">
		<div class="crochet-table__corner-actions" @click.stop>
			<ButtonTranslate v-if="showTranslateButton" />
		</div>
		<div ref="tableRef" class="crochet-table crochet-table--edit row-list-vertical">
		<div class="row-container row-container--header" @click.stop>
			<div class="row-table row-table--header">
				<div class="row-table-cell row-number">{{ t(`${headerKeyPrefix}.rowNumber`) }}</div>
				<div class="row-table-cell row-stitches">{{ t(`${headerKeyPrefix}.stitch`) }}</div>
				<div class="row-table-cell row-generate">{{ t(`${headerKeyPrefix}.totalStitches`) }}</div>
			</div>
		</div>

		<div
			v-for="(row, idx) in visibleRows"
			:key="row.row_index"
			class="row-container"
			:ref="setRowContainerRef(row.row_index)"
			:data-row-index="row.row_index"
			:class="{
				'row-container--grouped-start': isRowContainerGroupedStart(visibleRows, idx)
      }"
			@click.stop
		>
			<CrochetRow
				:ref="el => {
					setRowRef(row.row_index)(el)
				}"
				:row="visibleRows[idx]"
				:previous-generate="getPreviousGenerate(row.row_index)"
				:group-reminder="groupReminderByRowIndex[row.row_index]"
				:is-editing="isEditing(row.row_index)"
				:is-selected="isRowSelected(visibleRows[idx])"
				:verify-row-counts="verifyRowCounts"
				:table-type="type"
				@edit-row="handleEditRow"
				@open-edit-row="handleOpenEditCrochet"
				@update:row="handleUpdateRow(row.row_index, $event)"
				@selection-change="handleRowSelectionChange"
			/>
		</div>
		</div>
	</div>

	<AddNew v-if="canShowAddNew" variant="row" size="fab" @click.stop="handleAddRow" />

	<div v-if="activeToolbarKey !== TOOLBAR_KEYS.NONE" ref="toolbarRef">
		<BottomToolbar>
			<EditRowCrochetTabs
				v-if="activeToolbarKey === TOOLBAR_KEYS.EDIT && activeRow"
				v-model:tab="activeEditTab"
					:craft-key="craftKey"
					:stitches-for-list="stitchesForList"
					:show-custom-button="showCustomButton"
					:enable-wizard="enableWizard"
					:enable-self-defined-stitches="enableSelfDefinedStitches"
					:craft-tab-label="resolvedCraftTabLabel"
					:show-help-button="showHelpButton"
					:help-topic-id="helpTopicId"
				:active-row="activeRow"
				:is-selecting-multiple-rows="isSelectingMultipleRows"
				:row-copy="activeRowCopy"
				:has-crochet-draft="hasCrochetDraft"
				:group-index="activeGroupKey"
				:group-start-row-index="activeGroupStartRowIndex"
				:group-end-row-index="activeGroupEndRowIndex"
				:group-repeat-count="activeGroupRepeatCount"
				:group-row-span="activeGroupRowSpan"
				@update-row-repeat="(count) => handleUpdateRowRepeat(activeRow.row_index, count)"
				@update-group-repeat-count="(count) => activeGroupKey !== null && handleUpdateGroupRepeatCount(activeGroupKey, count)"
				@toggle-select-multiple-rows="handleToggleSelectMultipleRows"
				@delete-row="() => handleDeleteRow(activeRow.row_index)"
				@delete-group-rows="() => activeGroupKey !== null && handleDeleteGroupRows(activeGroupKey)"
				@copy-row="() => handleCopyRow(activeRow.row_index)"
				@copy-group="() => activeGroupKey !== null && handleCopyGroup(activeGroupKey)"
				@move-row="(payload) => handleMoveRow(activeRow.row_index, payload)"
				@close="handleBlurRow"
				@draft-pattern-change="handleDraftPatternChange"
				@confirm="handleEditCrochetConfirm"
				@cancel="handleEditCrochetCancel"
			/>
		</BottomToolbar>
	</div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted, provide } from 'vue'
import { useI18n } from 'vue-i18n'
import CrochetRow from './Crochet/CrochetRow.vue'
import BottomToolbar from '@/components/features/crochet-editor/BottomToolbar/BottomToolbar.vue'
import EditRowCrochetTabs from '@/components/features/crochet-editor/BottomToolbar/EditRowCrochetTabs.vue'
import AddNew from '@/components/shared/buttons/AddNew.vue'
import ButtonTranslate from '@/components/shared/buttons/svg/ButtonTranslate.vue'
import { isRowContainerGroupedStart } from '@/utils/crochetTable.js'
import { BasicStitch } from '@/constants/crochetData.js'
import { buildStitchLookup } from '@/utils/calculateConsumeGenerate.js'
import { calculateConsumeGenerateCore } from '@/utils/crochetStatsCore.js'
import { useSelfDefinedStitchesContext } from '@/composables/selfDefinedStitchesContext'
import { openConfirmation } from '@/services/ui/confirmation'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
	// Color each row's 針數 by comparing with the previous row (off for cast-on 其他).
	verifyRowCounts: {
		type: Boolean,
		default: true
	},
	modelValue: {
		type: Array,
		required: true
	},
	rowGroups: {
		type: Array,
		default: () => []
	},
	headerKeyPrefix: {
		type: String,
		default: 'crochetTable.header'
	},
	showTranslateButton: {
		type: Boolean,
		default: true
	},
	craftKey: {
		type: String,
		default: 'crochet'
	},
	stitchesForList: {
		type: Array,
		default: null
	},
	showCustomButton: {
		type: Boolean,
		default: true
	},
	enableWizard: {
		type: Boolean,
		default: true
	},
	enableSelfDefinedStitches: {
		type: Boolean,
		default: true
	},
	showHelpButton: {
		type: Boolean,
		default: true
	},
	helpTopicId: {
		type: String,
		default: 'editCrochetHowTo'
	},
	// Rendering overrides (used by knitting to reuse CrochetTable)
	stitchComponent: {
		type: [Object, Function],
		default: null
	},
	bundleComponent: {
		type: [Object, Function],
		default: null
	},
	patternComponent: {
		type: [Object, Function],
		default: null
	},
	ropeComponent: {
		type: [Object, Function],
		default: null
	},
	showZhRepeatOverride: {
		type: Boolean,
		default: null
	},
	stitchLookup: {
		type: [Array, Object],
		default: null
	}
})

const emit = defineEmits(['update:modelValue', 'update:rowGroups'])

// Fixed table type
const type = 'edit'

const headerKeyPrefix = computed(() => String(props.headerKeyPrefix || 'crochetTable.header'))
const showTranslateButton = computed(() => Boolean(props.showTranslateButton))
const craftKey = computed(() => String(props.craftKey || 'crochet'))

const resolvedCraftTabLabel = computed(() => {
	// Reuse existing tab component; customize the label for non-crochet crafts.
	if (craftKey.value === 'knit' || craftKey.value === 'knitting') {
		return t(`${headerKeyPrefix.value}.stitch`)
	}
	return ''
})

const selfDefinedCtx = useSelfDefinedStitchesContext()
const selfDefinedStitches = computed(() => {
	if (!props.enableSelfDefinedStitches) return []
	if (craftKey.value !== 'crochet') return []
	return selfDefinedCtx.list.value
})

const stitchLookupForProvide = computed(() => {
	if (props.stitchLookup) return props.stitchLookup
	// Default: crochet + (optional) self-defined stitches.
	if (craftKey.value === 'crochet') {
		return props.enableSelfDefinedStitches ? buildStitchLookup(selfDefinedStitches.value) : BasicStitch
	}
	return props.stitchLookup
})

provide('stitchLookup', stitchLookupForProvide)
if (props.stitchComponent) provide('stitchComponent', props.stitchComponent)
if (props.bundleComponent) provide('bundleComponent', props.bundleComponent)
if (props.patternComponent) provide('patternComponent', props.patternComponent)
if (props.ropeComponent) provide('ropeComponent', props.ropeComponent)
if (props.showZhRepeatOverride !== null && props.showZhRepeatOverride !== undefined) {
	provide('showZhRepeatOverride', props.showZhRepeatOverride)
}

const TOOLBAR_KEYS = Object.freeze({
	NONE: '',
	EDIT: 'edit'
})

const EDIT_TABS = Object.freeze({
	ROW: 'row',
	CROCHET: 'crochet'
})

const rowRefs = new Map()
const rowContainerRefs = new Map()

const setRowRef = (rowIndex) => (el) => {
	if (el) {
		rowRefs.set(rowIndex, el)
	} else {
		rowRefs.delete(rowIndex)
	}
}

const setRowContainerRef = (rowIndex) => (el) => {
	if (el) {
		rowContainerRefs.set(rowIndex, el)
	} else {
		rowContainerRefs.delete(rowIndex)
	}
}

// Internal copy of rows for manipulation
const internalRows = ref([...(props.modelValue || [])])
const internalRowGroups = ref([...(props.rowGroups || [])])

const createEmptyRow = () => ({
	row_index: 0,
	count: 1,
	content: {
		stitch_node_list: [],
		generate: 0,
		consume: 0
	}
})

const ensureAtLeastOneRow = () => {
	if (Array.isArray(internalRows.value) && internalRows.value.length > 0) return
	internalRows.value = [createEmptyRow()]
	internalRowGroups.value = []
	recalculateAllRowIndices()
	emitUpdate()
}

// Sync internalRows when parent updates modelValue
let isEmitting = false
watch(() => props.modelValue, (newValue) => {
	if (!isEmitting) {
		internalRows.value = [...(newValue || [])]
		recalculateAllRowIndices()
		ensureAtLeastOneRow()
	}
}, { deep: true })

watch(() => props.rowGroups, (newValue) => {
	if (!isEmitting) {
		internalRowGroups.value = [...(newValue || [])]
		recalculateAllRowIndices()
	}
}, { deep: true })

onMounted(() => {
	ensureAtLeastOneRow()
})

// Update parent with current rows + groups
const emitUpdate = () => {
	isEmitting = true
	emit('update:modelValue', [...internalRows.value])
	emit('update:rowGroups', [...internalRowGroups.value])
	nextTick(() => {
		isEmitting = false
	})
}

const tableRef = ref(null)
const toolbarRef = ref(null)
const editingRowIndex = ref(undefined)

// Row copy: draft snapshot of the active row's stitch_node_list while editing.
// Real project data stays untouched until the row is confirmed.
const draftRowIndex = ref(null)
const draftRootStitchNodeList = ref(null)
const isCommittingDraft = ref(false)

const hasCrochetDraft = computed(() => {
	return (
		draftRowIndex.value !== null &&
		draftRowIndex.value !== undefined &&
		Array.isArray(draftRootStitchNodeList.value)
	)
})

const confirmDiscardCrochetDraft = async () => {
	if (!hasCrochetDraft.value) return true
	if (typeof window === 'undefined') return true
	const ok = await openConfirmation({ type: 'discardChanges' })
	return Boolean(ok)
}

const clearDraft = () => {
	draftRowIndex.value = null
	draftRootStitchNodeList.value = null
}

const isSelectingMultipleRows = ref(false)
const pendingGroupStartRowIndex = ref(null)
const activeGroupIndex = ref(null)

const activeToolbarKey = ref(TOOLBAR_KEYS.NONE)

const activeEditTab = ref(EDIT_TABS.ROW)
const suppressSelectionSideEffects = ref(false)

watch(activeToolbarKey, (next) => {
	if (next !== TOOLBAR_KEYS.NONE && editingRowIndex.value === undefined) {
		activeToolbarKey.value = TOOLBAR_KEYS.NONE
	}
})

const clearAllSelections = () => {
	suppressSelectionSideEffects.value = true
	for (const rowRef of rowRefs.values()) {
		if (rowRef && typeof rowRef.clearSelection === 'function') {
			rowRef.clearSelection()
		}
	}
	nextTick(() => {
		suppressSelectionSideEffects.value = false
	})
}

watch(
	() => activeToolbarKey.value,
	(nextKey) => {
		if (nextKey !== TOOLBAR_KEYS.EDIT) {
			clearAllSelections()
		}
	}
)

const activeRow = computed(() => {
	if (editingRowIndex.value === undefined) return null
	return internalRows.value.find(r => r.row_index === editingRowIndex.value) || null
})

const clampIndex = (idx, len) => Math.min(Math.max(0, idx), Math.max(0, len - 1))

const moveArrayItem = (arr, fromIndex, toIndex) => {
	const len = arr.length
	const from = clampIndex(fromIndex, len)
	const to = clampIndex(toIndex, len)
	if (from === to) return null
	const [item] = arr.splice(from, 1)
	arr.splice(to, 0, item)
	return item
}

const handleMoveRow = (rowIndex, payload) => {
	const direction = payload?.direction
	if (!direction) return

	// If we're editing a row-group, move the whole group as a block.
	if (activeGroupKey.value !== null && activeGroupKey.value !== undefined) {
		const seg = activeGroupSegment.value
		if (!seg) return

		const from = seg.startArrayIndex
		const len = seg.rowSpan
		if (len <= 0) return

		// Edge guards
		if (direction === 'up' && from <= 0) return
		if (direction === 'down' && seg.endArrayIndex >= internalRows.value.length - 1) return
		if (direction === 'top' && from <= 0) return
		if (direction === 'bottom' && seg.endArrayIndex >= internalRows.value.length - 1) return

		const block = internalRows.value.splice(from, len)
		let insertAt = from
		if (direction === 'up') insertAt = from - 1
		else if (direction === 'down') insertAt = from + 1
		else if (direction === 'top') insertAt = 0
		else if (direction === 'bottom') insertAt = internalRows.value.length
		else return

		internalRows.value.splice(insertAt, 0, ...block)
		recalculateAllRowIndices()
		emitUpdate()

		// Keep focus on the moved group (first row of the block).
		editingRowIndex.value = block[0]?.row_index
		activeGroupIndex.value = activeGroupKey.value
		return
	}

	const idx = internalRows.value.findIndex(r => r.row_index === rowIndex)
	if (idx === -1) return

	let targetIdx = idx
	if (direction === 'up') targetIdx = idx - 1
	else if (direction === 'down') targetIdx = idx + 1
	else if (direction === 'top') targetIdx = 0
	else if (direction === 'bottom') targetIdx = internalRows.value.length - 1
	else return

	const movedRow = moveArrayItem(internalRows.value, idx, targetIdx)
	if (!movedRow) return

	recalculateAllRowIndices()
	emitUpdate()

	// Keep focus on the same moved row.
	editingRowIndex.value = movedRow.row_index
}

const computeGroupSegments = () => {
	const rows = Array.isArray(internalRows.value) ? internalRows.value : []
	const segments = []
	let i = 0
	while (i < rows.length) {
		const groupIndex = rows[i]?.group_index
		if (groupIndex === undefined || groupIndex === null) {
			i += 1
			continue
		}
		let j = i
		let blockLen = 0
		while (j < rows.length && rows[j]?.group_index === groupIndex) {
			blockLen += Number(rows[j]?.count || 1)
			j += 1
		}
		segments.push({
			groupIndex,
			startArrayIndex: i,
			endArrayIndex: j - 1,
			rowSpan: j - i,
			blockLen
		})
		i = j
	}
	return segments
}

const getRepeatCountForGroup = (groupIndex) => {
	const group = internalRowGroups.value.find(g => g && g.index === groupIndex)
	return Math.max(1, Number(group?.repeat_count || 1))
}

const syncRowGroupsFromRows = (segments) => {
	const existingByIndex = new Map(
		(Array.isArray(internalRowGroups.value) ? internalRowGroups.value : [])
			.filter(g => g && typeof g.index === 'number')
			.map(g => [g.index, g])
	)
	const next = []
	const seen = new Set()

	for (const seg of segments) {
		if (seen.has(seg.groupIndex)) continue
		seen.add(seg.groupIndex)

		const startRow = internalRows.value[seg.startArrayIndex]
		const endRow = internalRows.value[seg.endArrayIndex]
		if (!startRow || !endRow) continue

		const existing = existingByIndex.get(seg.groupIndex)
		next.push({
			index: seg.groupIndex,
			start_row_index: startRow.row_index,
			end_row_index: endRow.row_index,
			repeat_count: Math.max(1, Number(existing?.repeat_count || 1))
		})
	}

	internalRowGroups.value = next
}

const groupSegments = computed(() => computeGroupSegments())

const activeGroupKey = computed(() => {
	if (activeGroupIndex.value !== null && activeGroupIndex.value !== undefined) {
		return activeGroupIndex.value
	}
	const g = activeRow.value?.group_index
	return g === null || g === undefined ? null : g
})

const activeGroupSegment = computed(() => {
	if (activeGroupKey.value === null || activeGroupKey.value === undefined) return null
	return groupSegments.value.find(seg => seg.groupIndex === activeGroupKey.value) || null
})

const activeGroupStartRowIndex = computed(() => {
	const seg = activeGroupSegment.value
	if (!seg) return null
	return internalRows.value?.[seg.startArrayIndex]?.row_index ?? null
})

const activeGroupEndRowIndex = computed(() => {
	const seg = activeGroupSegment.value
	if (!seg) return null
	return internalRows.value?.[seg.endArrayIndex]?.row_index ?? null
})

const activeGroupRepeatCount = computed(() => {
	if (activeGroupKey.value === null || activeGroupKey.value === undefined) return 1
	return getRepeatCountForGroup(activeGroupKey.value)
})

const groupReminderByRowIndex = computed(() => {
	const rows = Array.isArray(internalRows.value) ? internalRows.value : []
	const segments = computeGroupSegments()
	const map = {}
	for (const seg of segments) {
		const endRow = rows[seg.endArrayIndex]
		if (!endRow) continue
		const m = getRepeatCountForGroup(seg.groupIndex)
		// A multi-row selection that isn't repeated yet is not a group: no "×1" reminder.
		if (m <= 1) continue
		map[endRow.row_index] = { n: seg.rowSpan, m }
	}
	return map
})

const activeGroupRowSpan = computed(() => {
	return activeGroupSegment.value?.rowSpan || 1
})

const getActiveRowRootListForSelection = () => {
	if (
		draftRowIndex.value !== null &&
		draftRowIndex.value !== undefined &&
		editingRowIndex.value === draftRowIndex.value &&
		Array.isArray(draftRootStitchNodeList.value)
	) {
		return draftRootStitchNodeList.value
	}
	const rowList = activeRow.value?.content?.stitch_node_list
	return Array.isArray(rowList) ? rowList : []
}

const activeRowCopy = computed(() => getActiveRowRootListForSelection())

// The keypad (EditCrochet) always reports the whole row: { list, replaceWholeRow: true }, or null to discard.
const handleDraftPatternChange = (payload) => {
	if (editingRowIndex.value === undefined) return
	if (payload === null || payload === undefined) {
		clearDraft()
		return
	}

	const nextList = Array.isArray(payload) ? payload : payload?.list
	if (!Array.isArray(nextList)) return

	draftRowIndex.value = editingRowIndex.value
	draftRootStitchNodeList.value = JSON.parse(JSON.stringify(nextList))
}

const scrollToEditingRow = async (rowIndex) => {
	if (rowIndex === undefined || rowIndex === null) return
	// Wait for visibleRows to re-slice and DOM to render.
	await nextTick()
	await nextTick()

	const containerEl = rowContainerRefs.get(rowIndex)
	const target =
		containerEl ||
		tableRef.value?.querySelector?.(`[data-row-index="${rowIndex}"]`) ||
		null

	if (!target) return

	const findScrollParent = (el) => {
		let current = el?.parentElement || null
		while (current) {
			const style = window.getComputedStyle(current)
			const overflowY = style.overflowY
			const isScrollable =
				(overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
				current.scrollHeight > current.clientHeight
			if (isScrollable) return current
			current = current.parentElement
		}
		return null
	}

	const scrollParent = findScrollParent(target)
	const desiredRatio = 0.3

	if (scrollParent) {
		const parentRect = scrollParent.getBoundingClientRect()
		const targetRect = target.getBoundingClientRect()
		const desiredTopInParent = parentRect.top + parentRect.height * desiredRatio
		const delta = targetRect.top - desiredTopInParent
		const nextTop = Math.max(0, scrollParent.scrollTop + delta)
		scrollParent.scrollTo({ top: nextTop, behavior: 'smooth' })
		return
	}

	// Fallback: page scroll
	const targetRect = target.getBoundingClientRect()
	const desiredTopInViewport = window.innerHeight * desiredRatio
	const delta = targetRect.top - desiredTopInViewport
	const nextTop = Math.max(0, window.scrollY + delta)
	window.scrollTo({ top: nextTop, behavior: 'smooth' })
}

watch(
	() => editingRowIndex.value,
	async (next, prev) => {
		// When switching rows, if the previously-selected row is empty, remove it.
		// This prevents accumulating blank rows when user navigates away.
		const prevIndex = prev
		const nextIndex = next

		// Capture the intended next row object BEFORE any potential deletion/reindex.
		const targetRow = nextIndex === undefined
			? null
			: (internalRows.value.find((r) => r?.row_index === nextIndex) || null)

		const shouldConsiderPrev = prevIndex !== undefined && prevIndex !== null && prevIndex !== nextIndex
		if (shouldConsiderPrev) {
			const prevArrayIndex = internalRows.value.findIndex((r) => r?.row_index === prevIndex)
			const prevRow = prevArrayIndex !== -1 ? internalRows.value[prevArrayIndex] : null

			// Only auto-remove non-group rows; grouped rows have additional semantics.
			const prevIsGrouped = prevRow?.group_index !== undefined && prevRow?.group_index !== null
			if (prevRow && !prevIsGrouped) {
				const prevDraftList = (draftRowIndex.value === prevIndex && Array.isArray(draftRootStitchNodeList.value))
					? draftRootStitchNodeList.value
					: prevRow?.content?.stitch_node_list
				const prevList = Array.isArray(prevDraftList) ? prevDraftList : []
				const prevIsEmpty = prevList.length === 0
				const prevIsLastRow = prevArrayIndex === internalRows.value.length - 1

				// Keep the trailing empty row as a persistent placeholder (do not auto-remove).
				if (prevIsEmpty && !prevIsLastRow) {
					internalRows.value.splice(prevArrayIndex, 1)
					recalculateAllRowIndices()
					emitUpdate()

					// After row_index recalculation, keep focus on the same target row object.
					if (targetRow && typeof targetRow.row_index === 'number' && targetRow.row_index !== nextIndex) {
						editingRowIndex.value = targetRow.row_index
						return
					}
				}
			}
		}

		clearDraft()
		void scrollToEditingRow(editingRowIndex.value)
	}
)

onMounted(() => {
	document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
	document.removeEventListener('click', handleClickOutside)
})

const getActiveRowRef = () => {
	if (editingRowIndex.value === undefined) return null
	return rowRefs.get(editingRowIndex.value) || null
}

const recalculateAllRowIndices = () => {
	const rows = Array.isArray(internalRows.value) ? internalRows.value : []
	let segments = computeGroupSegments()

	// If a group_index appears in multiple non-contiguous segments, ungroup it to avoid ambiguity.
	const segCountByGroup = new Map()
	for (const seg of segments) {
		segCountByGroup.set(seg.groupIndex, (segCountByGroup.get(seg.groupIndex) || 0) + 1)
	}
	const splitGroupIndices = [...segCountByGroup.entries()]
		.filter(([, count]) => count > 1)
		.map(([groupIndex]) => groupIndex)
	if (splitGroupIndices.length > 0) {
		for (const groupIndex of splitGroupIndices) {
			deleteGroupByIndex(groupIndex)
		}
		segments = computeGroupSegments()
	}
	const segmentByEndArrayIndex = new Map(segments.map(s => [s.endArrayIndex, s]))

	let currentRowIndex = 1
	for (let i = 0; i < rows.length; i++) {
		rows[i].row_index = currentRowIndex
		currentRowIndex += Number(rows[i]?.count || 1)

		const seg = segmentByEndArrayIndex.get(i)
		if (seg) {
			const repeatCount = getRepeatCountForGroup(seg.groupIndex)
			currentRowIndex += seg.blockLen * Math.max(0, repeatCount - 1)
		}
	}

	syncRowGroupsFromRows(segments)
}

const handleEditRow = async (rowIndex) => {
	if (
		hasCrochetDraft.value &&
		editingRowIndex.value !== undefined &&
		editingRowIndex.value !== null &&
		rowIndex !== editingRowIndex.value
	) {
		if (!await confirmDiscardCrochetDraft()) return
		clearDraft()
	}

	// Any tap ends the current multi-row selection (a repeated group is kept) and turns
	// 選擇多行 off: the crochet tab edits a single row.
	dropUnrepeatedActiveGroup()
	isSelectingMultipleRows.value = false
	pendingGroupStartRowIndex.value = null

	editingRowIndex.value = rowIndex
	activeGroupIndex.value = null
	activeToolbarKey.value = TOOLBAR_KEYS.EDIT
	activeEditTab.value = EDIT_TABS.CROCHET
	nextTick(() => {
		rowRefs.get(rowIndex)?.setSelection?.([])
	})
}

// Click outside handler
const handleClickOutside = async (event) => {
	if (editingRowIndex.value !== undefined && tableRef.value) {
		// BottomToolbar is teleported to <body>. On iOS this also avoids fixed/transform
		// stacking issues, but it means the toolbar is no longer contained by `toolbarRef`.
		// Treat clicks inside the toolbar as "inside" so they don't close edit mode.
		const path = typeof event?.composedPath === 'function' ? event.composedPath() : null
		if (
			Array.isArray(path) &&
			path.some((node) => node?.classList?.contains?.('crochet-scrollbar'))
		) {
			return
		}

		if (toolbarRef.value && toolbarRef.value.contains(event.target)) {
			return
		}
		if (!tableRef.value.contains(event.target)) {
			if (!await confirmDiscardCrochetDraft()) return
			handleBlurRow()
		}
	}
}

// A multi-row selection is held as a row group while it's being edited. When the selection
// ends (close, save, cancel, tap another row, turn off 選擇多行) it only stays a group if it
// actually repeats (repeat_count > 1); otherwise the rows go back to plain rows.
const dropUnrepeatedActiveGroup = () => {
	const g = activeGroupIndex.value
	if (g === null || g === undefined) return
	if (getRepeatCountForGroup(g) <= 1) {
		deleteGroupByIndex(g)
		recalculateAllRowIndices()
		emitUpdate()
	}
	activeGroupIndex.value = null
}

const handleBlurRow = () => {
	clearDraft()
	dropUnrepeatedActiveGroup()

	editingRowIndex.value = undefined
	activeToolbarKey.value = TOOLBAR_KEYS.NONE
	activeGroupIndex.value = null
	isSelectingMultipleRows.value = false
	pendingGroupStartRowIndex.value = null
	activeEditTab.value = EDIT_TABS.ROW
}

const handleOpenEditCrochet = async (rowIndex) => {
	if (
		hasCrochetDraft.value &&
		editingRowIndex.value !== undefined &&
		editingRowIndex.value !== null &&
		rowIndex !== editingRowIndex.value
	) {
		if (!await confirmDiscardCrochetDraft()) return
		clearDraft()
	}

	// Any tap ends the current multi-row selection: e.g. rows 1–6 selected, tap row 2 →
	// only row 2 is selected. A repeated group (repeat_count > 1) is kept, and tapping
	// inside it opens it.
	dropUnrepeatedActiveGroup()
	// 選擇多行 only spans one range: once a range is chosen (no start pending), tapping a
	// new row starts a plain single-row selection with 選擇多行 off.
	if (isSelectingMultipleRows.value && pendingGroupStartRowIndex.value === null) {
		isSelectingMultipleRows.value = false
	}

	const row = internalRows.value.find(r => r.row_index === rowIndex) || null
	const groupIndex = row?.group_index
	activeGroupIndex.value = null

	editingRowIndex.value = rowIndex
	activeEditTab.value = EDIT_TABS.ROW

	// Grouped rows always open group toolbar
	if (groupIndex !== undefined && groupIndex !== null) {
		activeGroupIndex.value = groupIndex
		activeToolbarKey.value = TOOLBAR_KEYS.EDIT
		return
	}

	// Multi-row selection mode: first click sets start, second click defines range
	if (isSelectingMultipleRows.value) {
		if (pendingGroupStartRowIndex.value === null) {
			pendingGroupStartRowIndex.value = rowIndex
			activeToolbarKey.value = TOOLBAR_KEYS.EDIT
			return
		}
		if (pendingGroupStartRowIndex.value === rowIndex) {
			pendingGroupStartRowIndex.value = null
			activeToolbarKey.value = TOOLBAR_KEYS.EDIT
			return
		}
		const nextGroupIndex = createOrUpdateGroupForRange(pendingGroupStartRowIndex.value, rowIndex)
		pendingGroupStartRowIndex.value = null
		activeGroupIndex.value = nextGroupIndex
		activeToolbarKey.value = TOOLBAR_KEYS.EDIT
		return
	}

	activeToolbarKey.value = TOOLBAR_KEYS.EDIT
}

const getNextGroupIndex = () => {
	const list = Array.isArray(internalRowGroups.value) ? internalRowGroups.value : []
	const maxIndex = list.reduce((acc, g) => Math.max(acc, Number(g?.index || 0)), 0)
	return maxIndex + 1
}

const deleteGroupByIndex = (groupIndex) => {
	for (const row of internalRows.value) {
		if (row?.group_index === groupIndex) {
			row.group_index = null
		}
	}
	internalRowGroups.value = (internalRowGroups.value || []).filter(g => g && g.index !== groupIndex)
}

const createOrUpdateGroupForRange = (rowIndex0, rowIndex1) => {
  const startRowIndex = Math.min(rowIndex0, rowIndex1)
  const endRowIndex = Math.max(rowIndex0, rowIndex1)

	const rows = Array.isArray(internalRows.value) ? internalRows.value : []
	const startArrayIndex = rows.findIndex(r => r.row_index === startRowIndex)
	const endArrayIndex = rows.findIndex(r => r.row_index === endRowIndex)
	if (startArrayIndex === -1 || endArrayIndex === -1) return getNextGroupIndex()

	const from = Math.min(startArrayIndex, endArrayIndex)
	const to = Math.max(startArrayIndex, endArrayIndex)
	const slice = rows.slice(from, to + 1)

	// If the range overlaps other groups, remove those groups first to prevent overlap.
	const overlapping = new Set(
		slice
			.map(r => r?.group_index)
			.filter(v => v !== null && v !== undefined)
	)
	for (const g of overlapping) {
		deleteGroupByIndex(g)
	}

	let groupIndex = null
	const existingShared = slice[0]?.group_index
	const allSame = slice.every(r => r?.group_index === existingShared && existingShared !== null && existingShared !== undefined)
	if (allSame) {
		groupIndex = existingShared
	} else {
		groupIndex = getNextGroupIndex()
	}

	for (let i = from; i <= to; i++) {
		rows[i].group_index = groupIndex
	}

	// Ensure group exists with repeat_count
	const existing = (internalRowGroups.value || []).find(g => g && g.index === groupIndex)
	if (!existing) {
		internalRowGroups.value = [
			...(internalRowGroups.value || []),
			{ index: groupIndex, start_row_index: startRowIndex, end_row_index: endRowIndex, repeat_count: 1 }
		]
	}

	recalculateAllRowIndices()
	emitUpdate()
	return groupIndex
}

const handleToggleSelectMultipleRows = (next) => {
	// While editing a row group, don't switch into multi-select mode.
	if (activeGroupKey.value !== null && activeGroupKey.value !== undefined) {
		return
	}

	isSelectingMultipleRows.value = Boolean(next)
	if (isSelectingMultipleRows.value) {
		activeEditTab.value = EDIT_TABS.ROW
		pendingGroupStartRowIndex.value = activeRow.value?.row_index || null
	} else {
		// Turning 選擇多行 off ends the selection: keep it as a group only if it repeats.
		dropUnrepeatedActiveGroup()
		pendingGroupStartRowIndex.value = null
	}
}

const resetRowEditSelectionToRoot = (rowIndex) => {
	const rowRef = rowRefs.get(rowIndex)
	if (!rowRef || typeof rowRef.setSelection !== 'function') return

	suppressSelectionSideEffects.value = true
	rowRef.setSelection([])
	for (const [otherRowIndex, otherRowRef] of rowRefs.entries()) {
		if (otherRowIndex === rowIndex) continue
		if (otherRowRef && typeof otherRowRef.clearSelection === 'function') {
			otherRowRef.clearSelection()
		}
	}
	nextTick(() => {
		suppressSelectionSideEffects.value = false
	})
}

const handleRowSelectionChange = (rowIndex, nextSelectionList) => {
	const safeList = Array.isArray(nextSelectionList) ? nextSelectionList : []

	// If we are clearing other rows programmatically, ignore the resulting empty selection events
	// so we don't unexpectedly switch editing focus.
	if (suppressSelectionSideEffects.value && safeList.length === 0) {
		return
	}

	// The keypad edits the whole row, so the table selection always stays at the row root.
	resetRowEditSelectionToRoot(rowIndex)

	editingRowIndex.value = rowIndex
	activeToolbarKey.value = TOOLBAR_KEYS.EDIT
	activeEditTab.value = EDIT_TABS.CROCHET
	void scrollToEditingRow(rowIndex)
}

const handleEditCrochetConfirm = (changes) => {
	const rowRef = getActiveRowRef()
	if (!rowRef) return

	if (
		changes?.applyDraft &&
		draftRowIndex.value !== null &&
		draftRowIndex.value !== undefined &&
		editingRowIndex.value === draftRowIndex.value &&
		Array.isArray(draftRootStitchNodeList.value) &&
		typeof rowRef.setStitchNodeList === 'function'
	) {
		isCommittingDraft.value = true
		rowRef.setStitchNodeList(draftRootStitchNodeList.value)
		clearDraft()
		isCommittingDraft.value = false
	}

	if (typeof rowRef.clearSelection === 'function') {
		rowRef.clearSelection()
	}
	handleBlurRow()
}

const handleEditCrochetCancel = () => {
	clearDraft()
	const rowRef = getActiveRowRef()
	if (rowRef && typeof rowRef.clearSelection === 'function') {
		rowRef.clearSelection()
	}
	handleBlurRow()
}

const handleUpdateRow = (rowIndex, updatedRow) => {
	// If we're editing a draft overlay for this row, keep updates (e.g. deleteSelected)
	// inside the draft so the UI reflects immediately, but still reverts on cancel.
	if (
		!isCommittingDraft.value &&
		draftRowIndex.value !== null &&
		draftRowIndex.value !== undefined &&
		rowIndex === draftRowIndex.value &&
		Array.isArray(draftRootStitchNodeList.value)
	) {
		const nextList = updatedRow?.content?.stitch_node_list
		draftRootStitchNodeList.value = Array.isArray(nextList) ? nextList : []
		return
	}

	const arrayIndex = internalRows.value.findIndex(r => r.row_index === rowIndex)
	if (arrayIndex !== -1) {
		internalRows.value[arrayIndex] = updatedRow
		recalculateAllRowIndices()
		emitUpdate()
	}
}

const handleUpdateRowRepeat = (rowIndex, newCount) => {
	const arrayIndex = internalRows.value.findIndex(r => r.row_index === rowIndex)
	if (arrayIndex !== -1) {
		internalRows.value[arrayIndex].count = newCount
		recalculateAllRowIndices()
		emitUpdate()
	}
}

const handleUpdateGroupRepeatCount = (groupIndex, nextCount) => {
	const idx = Number(groupIndex)
	if (!Number.isFinite(idx)) return

	const repeat = Math.max(1, Math.floor(Number(nextCount) || 1))

	// Verification rule: group repeat=1 is equivalent to "no group".
	if (repeat <= 1) {
		deleteGroupByIndex(idx)
		recalculateAllRowIndices()
		emitUpdate()
		if (activeGroupIndex.value === idx) activeGroupIndex.value = null
		return
	}

	const list = Array.isArray(internalRowGroups.value) ? internalRowGroups.value : []
	const exists = list.some(g => g && g.index === idx)
	if (exists) {
		internalRowGroups.value = list.map((g) => {
			if (!g || g.index !== idx) return g
			return { ...g, repeat_count: repeat }
		})
	} else {
		// If rows already reference this group index, recalculateAllRowIndices() will
		// rebuild start/end row indices via syncRowGroupsFromRows().
		internalRowGroups.value = [...list, { index: idx, start_row_index: 0, end_row_index: 0, repeat_count: repeat }]
	}

	recalculateAllRowIndices()
	emitUpdate()
}

const handleCopyRow = (rowIndex) => {
	const arrayIndex = internalRows.value.findIndex(r => r.row_index === rowIndex)
	if (arrayIndex === -1) return

	const rowToCopy = internalRows.value[arrayIndex]
	const newRow = {
		row_index: 0,
		count: rowToCopy.count,
		content: {
			stitch_node_list: JSON.parse(JSON.stringify(rowToCopy.content.stitch_node_list)),
			generate: rowToCopy.content.generate,
			consume: rowToCopy.content.consume
		}
	}

	internalRows.value.push(newRow)
	recalculateAllRowIndices()
	emitUpdate()

	// recalculateAllRowIndices() will compute the correct row_index (which may differ
	// if row groups introduce virtual repeated rows). Focus the actual new row.
	editingRowIndex.value = newRow.row_index
	activeToolbarKey.value = TOOLBAR_KEYS.EDIT
	activeEditTab.value = EDIT_TABS.CROCHET
}

const handleCopyGroup = (groupIndex) => {
	const segments = computeGroupSegments()
	const seg = segments.find(s => s.groupIndex === groupIndex)
	if (!seg) return

	const rows = Array.isArray(internalRows.value) ? internalRows.value : []
	const slice = rows.slice(seg.startArrayIndex, seg.endArrayIndex + 1)
	if (slice.length === 0) return

	const repeatCount = getRepeatCountForGroup(groupIndex)
	const shouldKeepAsGroup = repeatCount > 1
	const nextGroupIndex = shouldKeepAsGroup ? getNextGroupIndex() : null

	if (shouldKeepAsGroup) {
		internalRowGroups.value = [
			...(internalRowGroups.value || []),
			{ index: nextGroupIndex, start_row_index: 0, end_row_index: 0, repeat_count: repeatCount }
		]
	}

	const newRows = slice.map(r => {
		return {
			row_index: 0,
			count: r?.count || 1,
			group_index: nextGroupIndex,
			content: {
				stitch_node_list: JSON.parse(JSON.stringify(r?.content?.stitch_node_list || [])),
				generate: r?.content?.generate || 0,
				consume: r?.content?.consume || 0
			}
		}
	})

	internalRows.value.push(...newRows)
	recalculateAllRowIndices()
	emitUpdate()

	// Focus the newly appended group (first row of it).
	editingRowIndex.value = newRows[0]?.row_index
	activeToolbarKey.value = TOOLBAR_KEYS.EDIT
	activeEditTab.value = EDIT_TABS.ROW
	activeGroupIndex.value = nextGroupIndex
}

const handleDeleteRow = (rowIndex) => {
	const arrayIndex = internalRows.value.findIndex(r => r.row_index === rowIndex)
	if (arrayIndex === -1) return

	internalRows.value.splice(arrayIndex, 1)
	recalculateAllRowIndices()
	emitUpdate()

	if (editingRowIndex.value === rowIndex) {
		editingRowIndex.value = undefined
	}
}

const handleAddRow = async () => {
	// If the user is currently editing a row and has an unconfirmed crochet draft,
	// switching to a new row would clear the draft (and appear as if EditCrochet "disappeared").
	// Confirm before discarding.
	if (hasCrochetDraft.value) {
		if (!await confirmDiscardCrochetDraft()) return
		clearDraft()
	}

	const newRow = {
		row_index: 0,
		count: 1,
		content: {
			stitch_node_list: [],
			generate: 0,
			consume: 0
		}
	}

	internalRows.value.push(newRow)
	recalculateAllRowIndices()
	emitUpdate()
	editingRowIndex.value = newRow.row_index
}

const visibleRows = computed(() => {
	const maxVisible = 100

	const applyDraftToSlice = (slice) => {
		if (
			draftRowIndex.value === null ||
			draftRowIndex.value === undefined ||
			!Array.isArray(draftRootStitchNodeList.value)
		) {
			return slice
		}
		const lookup = stitchLookupForProvide.value || BasicStitch
		const stats = calculateConsumeGenerateCore(draftRootStitchNodeList.value, 1, lookup)
		return slice.map((r) => {
			if (!r || r.row_index !== draftRowIndex.value) return r
			const content = r.content || {}
			return {
				...r,
				content: {
					...content,
					stitch_node_list: draftRootStitchNodeList.value,
					consume: stats.consume,
					generate: stats.generate,
				}
			}
		})
	}

	if (editingRowIndex.value === undefined) {
		return applyDraftToSlice(internalRows.value.slice(-maxVisible))
	}

	const editingIndexInList = internalRows.value.findIndex(row => row.row_index === editingRowIndex.value)
	if (editingIndexInList === -1) {
		return applyDraftToSlice(internalRows.value.slice(-maxVisible))
	}

	const start = Math.max(0, editingIndexInList - Math.floor(maxVisible / 2))
	const end = Math.min(internalRows.value.length, start + maxVisible)
	return applyDraftToSlice(internalRows.value.slice(start, end))
})

const canShowAddNew = computed(() => {
	if (!Array.isArray(internalRows.value) || internalRows.value.length === 0) return true
	const lastRow = internalRows.value[internalRows.value.length - 1]
	if (!lastRow) return false

	const lastRowDraftList =
		(draftRowIndex.value === lastRow.row_index && Array.isArray(draftRootStitchNodeList.value))
			? draftRootStitchNodeList.value
			: lastRow?.content?.stitch_node_list

	const list = Array.isArray(lastRowDraftList) ? lastRowDraftList : []
	return list.length > 0
})

const isEditing = (rowIndex) => {
	return editingRowIndex.value === rowIndex
}

// Multi-row selection: while a row group is active in the toolbar, every row of the group
// shows as selected (not only the one that was tapped).
const isRowSelected = (row) => {
	if (activeToolbarKey.value === TOOLBAR_KEYS.NONE) return false
	const g = activeGroupKey.value
	if (g === null || g === undefined) return false
	return row?.group_index === g
}

const getPreviousGenerate = (rowIndex) => {
	const currentRowArrayIndex = internalRows.value.findIndex(r => r.row_index === rowIndex)
	if (currentRowArrayIndex <= 0) return 0

	const previousRow = internalRows.value[currentRowArrayIndex - 1]
	if (!previousRow) return 0
	return previousRow.content.generate
}
</script>
