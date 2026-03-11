<template>
	<div ref="tableRef" class="crochet-table crochet-table--edit row-list-vertical">
		<div class="row-container row-container--header" @click.stop>
			<div class="row-table row-table--header">
				<div class="row-table-cell row-number">{{ t('crochetTable.header.rowNumber') }}</div>
				<div class="row-table-cell row-stitches">{{ t('crochetTable.header.stitch') }}</div>
				<div class="row-table-cell row-generate">{{ t('crochetTable.header.totalStitches') }}</div>
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
				:group-start="isRowContainerGroupedStart(visibleRows, idx)"
				:is-editing="isEditing(row.row_index)"
				:table-type="type"
				@edit-row="handleEditRow"
				@open-edit-row="handleOpenEditCrochet"
				@update:row="handleUpdateRow(row.row_index, $event)"
				@selection-change="handleRowSelectionChange"
			>
			</CrochetRow>
		</div>
	</div>

	<AddNew v-if="canShowAddNew" variant="row" size="fab" @click.stop="handleAddRow" />

	<div v-if="activeToolbarKey !== TOOLBAR_KEYS.NONE" ref="toolbarRef">
		<BottomToolbar>
			<EditRowCrochetTabs
				v-if="activeToolbarKey === TOOLBAR_KEYS.EDIT && activeRow"
				v-model:tab="activeEditTab"
				:active-row="activeRow"
				:current-selected-data="currentSelectedData"
				:is-selecting-multiple-rows="isSelectingMultipleRows"
				:can-go-parent="activeSelectionList.length > 0"
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
				@delete-selection="handleDeleteSelection"
				@add-inner-selection="handleAddInnerSelection"
				@draft-pattern-change="handleDraftPatternChange"
				@confirm="handleEditCrochetConfirm"
				@cancel="handleEditCrochetCancel"
				@go-parent="handleGoParent"
			/>
		</BottomToolbar>
	</div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import CrochetRow from './Crochet/CrochetRow.vue'
import CrochetNode from './Crochet/CrochetNode.vue'
import BottomToolbar from '@/components/BottomToolbar/BottomToolbar.vue'
import EditRowCrochetTabs from '@/components/BottomToolbar/EditRowCrochetTabs.vue'
import AddNew from '@/components/buttons/AddNew.vue'
import { computeCurrentSelectedData } from '@/utils/crochetSelection.js'
import { isRowContainerGroupedStart } from '@/utils/crochetTable.js'
import { createSelection, isRangeSelection } from '@/constants/selection'
import { createPattern } from '@/constants/crochetData.js'
import { calculateConsumeGenerate } from '@/utils/calculateConsumeGenerate.js'
import { useSelfDefinedStitchesContext } from '@/composables/selfDefinedStitchesContext'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
	modelValue: {
		type: Array,
		required: true
	},
	helpTopicId: {
		type: String,
		default: ''
	},
	helpTopicIds: {
		type: Object,
		default: null
	},
	componentId: {
		type: Number,
		default: 0
	},
	componentName: {
		type: String,
		default: ''
	},
	rowGroups: {
		type: Array,
		default: () => []
	}
})

const emit = defineEmits(['update:modelValue', 'update:rowGroups'])

// Fixed table type
const type = 'edit'

const selfDefinedCtx = useSelfDefinedStitchesContext()
const selfDefinedStitches = computed(() => selfDefinedCtx.list.value)

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

// Draft stitch nodes for the active row while editing in EditCrochet.
// Used to make pendingPattern selectable immediately without persisting.
const draftRowIndex = ref(null)
const draftRootStitchNodeList = ref(null)
const isCommittingDraft = ref(false)

const clearDraft = () => {
	draftRowIndex.value = null
	draftRootStitchNodeList.value = null
}

const isSelectingMultipleRows = ref(false)
const pendingGroupStartRowIndex = ref(null)
const activeGroupIndex = ref(null)

const activeToolbarKey = ref(TOOLBAR_KEYS.NONE)

const activeEditTab = ref(EDIT_TABS.ROW)
const rowSelectionByIndex = ref({})
const suppressSelectionSideEffects = ref(false)

watch(activeToolbarKey, (next) => {
	if (next !== TOOLBAR_KEYS.NONE && editingRowIndex.value === undefined) {
		activeToolbarKey.value = TOOLBAR_KEYS.NONE
	}
})

const clearAllSelections = () => {
	rowSelectionByIndex.value = {}
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

const activeGroup = computed(() => {
	if (activeGroupKey.value === null || activeGroupKey.value === undefined) return null
	return internalRowGroups.value.find(g => g && g.index === activeGroupKey.value) || null
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
		map[endRow.row_index] = {
			n: seg.rowSpan,
			m: getRepeatCountForGroup(seg.groupIndex)
		}
	}
	return map
})

const activeGroupRowSpan = computed(() => {
	return activeGroupSegment.value?.rowSpan || 1
})

const activeSelectionList = computed(() => {
	if (editingRowIndex.value === undefined) return []
	const list = rowSelectionByIndex.value?.[editingRowIndex.value]
	return Array.isArray(list) ? list : []
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

const buildDraftRootList = (baseRootList, selectionList, nextInnerList, countOverride = null) => {
	const root = Array.isArray(baseRootList) ? baseRootList : []
	const pending = Array.isArray(nextInnerList) ? nextInnerList : []
	const safeSelection = Array.isArray(selectionList) ? selectionList : []

	// No selection means we're editing the whole row pattern (virtualWholeRow).
	if (safeSelection.length === 0) {
		return JSON.parse(JSON.stringify(pending))
	}

	const last = safeSelection[safeSelection.length - 1]
	if (!last || last.start === null || last.start === undefined) {
		return null
	}

	// If selecting a range at the current level, treat pending as that level's list.
	if (isRangeSelection(last)) {
		// Only root-level range is supported in edit table; fall back to whole-row replacement.
		if (safeSelection.length === 1) {
			return JSON.parse(JSON.stringify(pending))
		}
		return null
	}

	const draft = JSON.parse(JSON.stringify(root))
	let currentList = draft
	for (const sel of safeSelection.slice(0, -1)) {
		const idx = sel?.start
		const node = currentList?.[idx]
		if (!node) return null
		if (node.type === 'pattern') {
			if (!Array.isArray(node.pattern)) node.pattern = []
			currentList = node.pattern
			continue
		}
		if (node.type === 'bundle') {
			if (!Array.isArray(node.bundle)) node.bundle = []
			currentList = node.bundle
			continue
		}
		return null
	}

	const leafIdx = last.start
	const leaf = currentList?.[leafIdx]
	if (!leaf) return null

	if (leaf.type === 'pattern') {
		leaf.pattern = JSON.parse(JSON.stringify(pending))
		if (typeof countOverride === 'number' && Number.isFinite(countOverride)) {
			leaf.count = Math.max(1, Number(countOverride) || 1)
		}
		return draft
	}
	if (leaf.type === 'bundle') {
		leaf.bundle = JSON.parse(JSON.stringify(pending))
		if (typeof countOverride === 'number' && Number.isFinite(countOverride)) {
			leaf.count = Math.max(1, Number(countOverride) || 1)
		}
		return draft
	}

	// stitch
	const replacement = pending?.[0]
	if (replacement && typeof replacement === 'object') {
		currentList.splice(leafIdx, 1, JSON.parse(JSON.stringify(replacement)))
	}
	return draft
}

const handleDraftPatternChange = (payload) => {
	if (editingRowIndex.value === undefined) return
	if (payload === null || payload === undefined) {
		clearDraft()
		return
	}

	const nextInnerList = Array.isArray(payload) ? payload : payload?.list
	const countOverride = Array.isArray(payload) ? null : payload?.count
	const selectRootPattern = !Array.isArray(payload) && Boolean(payload?.selectRootPattern)
	if (!Array.isArray(nextInnerList)) return

	const rowIndex = editingRowIndex.value
	const baseRoot =
		rowIndex === draftRowIndex.value && Array.isArray(draftRootStitchNodeList.value)
			? draftRootStitchNodeList.value
			: getActiveRowRootListForSelection()

	let nextRoot = buildDraftRootList(baseRoot, activeSelectionList.value, nextInnerList, countOverride)

	// Virtual whole-row editing: reflect count immediately by drafting a root pattern node.
	// buildDraftRootList() intentionally treats empty selection as "replace whole row list"; we override
	// that here when countOverride is provided.
	if (activeSelectionList.value.length === 0 && typeof countOverride === 'number' && Number.isFinite(countOverride)) {
		const repeatCount = Math.max(1, Number(countOverride) || 1)
		if (repeatCount > 1) {
			nextRoot = [createPattern(repeatCount, nextInnerList.map((n) => JSON.parse(JSON.stringify(n))))]
		} else {
			nextRoot = JSON.parse(JSON.stringify(nextInnerList))
		}
	}
	if (!Array.isArray(nextRoot)) return

	draftRowIndex.value = rowIndex
	draftRootStitchNodeList.value = nextRoot

	if (selectRootPattern && typeof rowRefs.get(rowIndex)?.setSelection === 'function') {
		nextTick(() => {
			const rowRef = rowRefs.get(rowIndex)
			if (rowRef && typeof rowRef.setSelection === 'function') {
				rowRef.setSelection([createSelection(0, 0)])
			}
		})
	}
}

const currentSelectedData = computed(() => {
	const safeRowList = getActiveRowRootListForSelection()

	// Virtual selection: when nothing is selected but the row has content,
	// allow EditCrochet to edit the whole row pattern.
	if (activeSelectionList.value.length === 0) {
		return {
			selectionState: 'select_range',
			selectedNodeType: 'pattern',
			selectedCount: 1,
			currentPattern: safeRowList,
			virtualWholeRow: true
		}
	}

	return computeCurrentSelectedData(activeSelectionList.value, safeRowList)
})

// Click outside handler
const handleClickOutside = (event) => {
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
			handleBlurRow()
		}
	}
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

					// Remove any stale selection state for the removed row.
					const nextSelectionMap = { ...rowSelectionByIndex.value }
					delete nextSelectionMap[prevIndex]
					rowSelectionByIndex.value = nextSelectionMap

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

const addStitch = (stitchId) => {
	const rowRef = getActiveRowRef()
	if (rowRef && typeof rowRef.addStitch === 'function') rowRef.addStitch(stitchId)
}

const addBundle = (bundle) => {
	const rowRef = getActiveRowRef()
	if (rowRef && typeof rowRef.addBundle === 'function') rowRef.addBundle(bundle)
}

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

const handleEditRow = (rowIndex) => {
	editingRowIndex.value = rowIndex
	activeGroupIndex.value = null
	activeToolbarKey.value = TOOLBAR_KEYS.EDIT
	activeEditTab.value = EDIT_TABS.CROCHET
}

const handleBlurRow = () => {
	clearDraft()
	// Don't persist a group if it doesn't actually repeat.
	if (activeGroupIndex.value !== null && activeGroupIndex.value !== undefined) {
		const g = activeGroup.value
		const repeat = Math.max(1, Number(g?.repeat_count || 1))
		if (repeat === 1) {
			deleteGroupByIndex(activeGroupIndex.value)
			recalculateAllRowIndices()
			emitUpdate()
		}
	}

	editingRowIndex.value = undefined
	activeToolbarKey.value = TOOLBAR_KEYS.NONE
	activeGroupIndex.value = null
	pendingGroupStartRowIndex.value = null
	activeEditTab.value = EDIT_TABS.ROW
}

const handleOpenEditCrochet = (rowIndex) => {
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
		pendingGroupStartRowIndex.value = null
	}
}

const handleRowSelectionChange = (rowIndex, nextSelectionList) => {
	const safeList = Array.isArray(nextSelectionList) ? nextSelectionList : []

	// If we are clearing other rows programmatically, ignore the resulting empty selection events
	// so we don't unexpectedly switch editing focus.
	if (suppressSelectionSideEffects.value && safeList.length === 0) {
		return
	}

	if (safeList.length > 0) {
		// One row began selection: clear all other row selections (state + UI).
		rowSelectionByIndex.value = { [rowIndex]: safeList }

		suppressSelectionSideEffects.value = true
		for (const [otherRowIndex, otherRowRef] of rowRefs.entries()) {
			if (otherRowIndex === rowIndex) continue
			if (otherRowRef && typeof otherRowRef.clearSelection === 'function') {
				otherRowRef.clearSelection()
			}
		}
		nextTick(() => {
			suppressSelectionSideEffects.value = false
		})
	} else {
		const next = { ...rowSelectionByIndex.value }
		delete next[rowIndex]
		rowSelectionByIndex.value = next
	}

	editingRowIndex.value = rowIndex
	activeToolbarKey.value = TOOLBAR_KEYS.EDIT
	activeEditTab.value = EDIT_TABS.CROCHET
	if (safeList.length > 0) {
		void scrollToEditingRow(rowIndex)
	}
}

const handleDeleteSelection = async () => {
	const rowRef = getActiveRowRef()
	if (!rowRef || typeof rowRef.deleteSelected !== 'function') return
	if (editingRowIndex.value === undefined || editingRowIndex.value === null) return

	const rowIndex = editingRowIndex.value

	// IMPORTANT: Delete must be a draft-only mutation so that pressing Cancel reverts it.
	// We achieve this by ensuring the draft overlay exists before calling into CrochetDisplay,
	// because handleUpdateRow() already routes updates into draftRootStitchNodeList when draftRowIndex is set.
	if (
		draftRowIndex.value === null ||
		draftRowIndex.value === undefined ||
		draftRowIndex.value !== rowIndex ||
		!Array.isArray(draftRootStitchNodeList.value)
	) {
		const base = activeRow.value?.content?.stitch_node_list
		draftRowIndex.value = rowIndex
		draftRootStitchNodeList.value = Array.isArray(base)
			? JSON.parse(JSON.stringify(base))
			: []
		await nextTick()
	}

	rowRef.deleteSelected()
}

const handleAddInnerSelection = (nextSelection) => {
	const rowRef = getActiveRowRef()
	if (rowRef && typeof rowRef.addInnerSelection === 'function') {
		rowRef.addInnerSelection(nextSelection)
	}
}

const handleGoParent = () => {
	const rowRef = getActiveRowRef()
	if (!rowRef || typeof rowRef.setSelection !== 'function') return

	const safe = Array.isArray(activeSelectionList.value) ? activeSelectionList.value : []
	if (safe.length <= 1) {
		// Root-level: the parent of either a whole-row selection or a single top-level node
		// is the implicit "whole row" editor state (empty selection).
		if (typeof rowRef.clearSelection === 'function') rowRef.clearSelection()
		return
	}
	rowRef.setSelection(safe.slice(0, -1))
}

const handleEditCrochetConfirm = (changes) => {
	const rowRef = getActiveRowRef()
	const data = currentSelectedData.value
	if (!rowRef || !data) return

	// If EditCrochet was editing a draft (pendingPattern reflected into the row),
	// commit the full draft root list first so subsequent operations target real nodes.
	if (
		changes &&
		changes.applyDraft &&
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

	if (data.virtualWholeRow) {
		const nextList = Array.isArray(changes.pattern) ? changes.pattern : null
		const repeatCount = typeof changes.count === 'number' ? changes.count : null

		// If we have a pending pattern list, apply repeatCount directly to that list.
		// This avoids relying on CrochetDisplay reading props.stitchNodeList (which may still be empty).
		if (nextList && typeof rowRef.setStitchNodeList === 'function') {
			if (repeatCount && repeatCount > 1) {
				const cloned = JSON.parse(JSON.stringify(nextList))
				const flattened = cloned.flatMap((node) => {
					if (
						node &&
						node.type === 'pattern' &&
						Array.isArray(node.pattern) &&
						node.pattern.length === 1 &&
						(node.count || 1) === 1
					) {
						return node.pattern.map((innerNode) => ({ ...innerNode }))
					}
					return [{ ...node }]
				})
				const newPattern = createPattern(repeatCount, flattened)
				rowRef.setStitchNodeList([newPattern])
			} else {
				rowRef.setStitchNodeList(nextList)
			}
		} else if (repeatCount && repeatCount > 1 && typeof rowRef.createPatternFromWholeRow === 'function') {
			rowRef.createPatternFromWholeRow(repeatCount)
		}
		if (typeof rowRef.clearSelection === 'function') {
			rowRef.clearSelection()
		}
		handleBlurRow()
		return
	}

	if (data.selectionState === 'select_range') {
		if (typeof rowRef.createPatternFromRange === 'function') {
			rowRef.createPatternFromRange(changes.count)
		}
	} else {
		// IMPORTANT: applying multiple mutations via rowRef.* triggers multiple emits.
		// If we call them back-to-back, later calls may operate on stale props and overwrite earlier changes.
		// Prefer a single replaceSelectedNode for stitch edits when multiple fields change.
		if (data.selectedNodeType === 'stitch' && typeof rowRef.replaceSelectedNode === 'function') {
			if (changes.replaceNode !== undefined) {
				const nextNode = changes.replaceNode
				if (changes.count !== undefined && nextNode && typeof nextNode === 'object') {
					nextNode.count = changes.count
				}
				rowRef.replaceSelectedNode(nextNode)
			} else if ((changes.stitch !== undefined || changes.stitchId !== undefined) && changes.count !== undefined) {
				const stitchId = changes.stitch?.stitch_id ?? changes.stitchId
				const position = typeof changes.stitch?.position === 'string' ? changes.stitch.position.trim().toUpperCase() : ''
				const count = changes.count
				const nextNode = count > 1
					? { type: 'pattern', pattern: [{ type: 'stitch', stitch_id: stitchId, position }], count }
					: { type: 'stitch', stitch_id: stitchId, position }
				if (!position) {
					if (nextNode.type === 'stitch') delete nextNode.position
					if (nextNode.type === 'pattern' && Array.isArray(nextNode.pattern) && nextNode.pattern[0]) delete nextNode.pattern[0].position
				}
				rowRef.replaceSelectedNode(nextNode)
			} else {
				if (changes.count !== undefined && typeof rowRef.updateNodeCount === 'function') {
					rowRef.updateNodeCount(changes.count)
				}
				if ((changes.stitch !== undefined || changes.stitchId !== undefined) && typeof rowRef.changeSelectedStitch === 'function') {
					rowRef.changeSelectedStitch(changes.stitch ?? changes.stitchId)
				}
			}
			// Stitch edits don't use updateNodePattern.
		} else {
			if (changes.replaceNode !== undefined && typeof rowRef.replaceSelectedNode === 'function') {
				const nextNode = changes.replaceNode
				if (changes.count !== undefined && nextNode && typeof nextNode === 'object') {
					nextNode.count = changes.count
				}
				rowRef.replaceSelectedNode(nextNode)
			} else {
				if (changes.count !== undefined && typeof rowRef.updateNodeCount === 'function') {
					rowRef.updateNodeCount(changes.count)
				}
				if ((changes.stitch !== undefined || changes.stitchId !== undefined) && typeof rowRef.changeSelectedStitch === 'function') {
					rowRef.changeSelectedStitch(changes.stitch ?? changes.stitchId)
				}
				if (changes.pattern !== undefined && typeof rowRef.updateNodePattern === 'function') {
					rowRef.updateNodePattern(changes.pattern)
				}
			}
		}
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

const handleAddRow = () => {
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

const setSelectionForRow = (rowIndex, nodeIndex, _innerStitchIndex = null) => {
	void _innerStitchIndex
	// Only first-level selection is supported in edit table.
	// Ensure the row is in editing mode so CrochetDisplay exists.
	if (editingRowIndex.value !== rowIndex) {
		handleEditRow(rowIndex)
	}

	const list = [{ start: nodeIndex, end: nodeIndex }]
	nextTick(() => {
		const rowRef = rowRefs.get(rowIndex)
		if (rowRef && typeof rowRef.setSelection === 'function') {
			rowRef.setSelection(list)
		}
	})

	return true
}

defineExpose({
	addStitch,
	addBundle,
	setSelectionForRow,
	CrochetNode
})

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
		const stats = calculateConsumeGenerate(draftRootStitchNodeList.value, 1, selfDefinedStitches.value)
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
	if (!Array.isArray(internalRows.value) || internalRows.value.length === 0) return false
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

const getPreviousGenerate = (rowIndex) => {
	const currentRowArrayIndex = internalRows.value.findIndex(r => r.row_index === rowIndex)
	if (currentRowArrayIndex <= 0) return 0

	const previousRow = internalRows.value[currentRowArrayIndex - 1]
	if (!previousRow) return 0
	return previousRow.content.generate
}
</script>
