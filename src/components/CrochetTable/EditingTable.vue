<template>
	<div ref="tableRef" class="crochet-table crochet-table--edit row-list-vertical">
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

		<AddNew variant="row" @click="handleAddRow" />
	</div>

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
				@confirm="handleEditCrochetConfirm"
				@cancel="handleEditCrochetCancel"
				@go-parent="handleGoParent"
			/>
		</BottomToolbar>
	</div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import CrochetRow from './Crochet/CrochetRow.vue'
import CrochetNode from './Crochet/CrochetNode.vue'
import BottomToolbar from '@/components/BottomToolbar/BottomToolbar.vue'
import EditRowCrochetTabs from '@/components/BottomToolbar/EditRowCrochetTabs.vue'
import AddNew from '@/components/buttons/AddNew.vue'
import { computeCurrentSelectedData } from '@/utils/crochetSelection.js'
import { isRowContainerGroupedStart } from '@/utils/crochetTable.js'
import { createSelection, isRangeSelection } from '@/constants/selection'
import { createPattern } from '@/constants/crochetData.js'

const props = defineProps({
	modelValue: {
		type: Array,
		required: true
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

// Sync internalRows when parent updates modelValue
let isEmitting = false
watch(() => props.modelValue, (newValue) => {
	if (!isEmitting) {
		internalRows.value = [...(newValue || [])]
		recalculateAllRowIndices()
	}
}, { deep: true })

watch(() => props.rowGroups, (newValue) => {
	if (!isEmitting) {
		internalRowGroups.value = [...(newValue || [])]
		recalculateAllRowIndices()
	}
}, { deep: true })

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

const currentSelectedData = computed(() => {
	const rowList = activeRow.value?.content?.stitch_node_list
	const safeRowList = Array.isArray(rowList) ? rowList : []

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
	(next) => {
		void scrollToEditingRow(next)
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

const handleDeleteSelection = () => {
	const rowRef = getActiveRowRef()
	if (rowRef && typeof rowRef.deleteSelected === 'function') {
		rowRef.deleteSelected()
	}
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
		const stitchNodeList = activeRow.value?.content?.stitch_node_list
		const len = Array.isArray(stitchNodeList) ? stitchNodeList.length : 0
		const isLastLevel = safe.length === 0 || isRangeSelection(safe[safe.length - 1]) || len <= 1
		if (isLastLevel) {
			if (typeof rowRef.clearSelection === 'function') rowRef.clearSelection()
			activeToolbarKey.value = TOOLBAR_KEYS.NONE
		} else {
			// Not last level (single top-level node selected): parent is the whole row.
			rowRef.setSelection([createSelection(0, len - 1)])
		}
		return
	}
	rowRef.setSelection(safe.slice(0, -1))
}

const handleEditCrochetConfirm = (changes) => {
	const rowRef = getActiveRowRef()
	const data = currentSelectedData.value
	if (!rowRef || !data) return

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
			} else if (changes.stitchId !== undefined && changes.count !== undefined) {
				const stitchId = changes.stitchId
				const count = changes.count
				const nextNode = count > 1
					? { type: 'pattern', pattern: [{ type: 'stitch', stitch_id: stitchId }], count }
					: { type: 'stitch', stitch_id: stitchId }
				rowRef.replaceSelectedNode(nextNode)
			} else {
				if (changes.count !== undefined && typeof rowRef.updateNodeCount === 'function') {
					rowRef.updateNodeCount(changes.count)
				}
				if (changes.stitchId !== undefined && typeof rowRef.changeSelectedStitch === 'function') {
					rowRef.changeSelectedStitch(changes.stitchId)
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
				if (changes.stitchId !== undefined && typeof rowRef.changeSelectedStitch === 'function') {
					rowRef.changeSelectedStitch(changes.stitchId)
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
	const rowRef = getActiveRowRef()
	if (rowRef && typeof rowRef.clearSelection === 'function') {
		rowRef.clearSelection()
	}
	handleBlurRow()
}

const handleUpdateRow = (rowIndex, updatedRow) => {
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

	if (editingRowIndex.value === undefined) {
		return internalRows.value.slice(-maxVisible)
	}

	const editingIndexInList = internalRows.value.findIndex(row => row.row_index === editingRowIndex.value)
	if (editingIndexInList === -1) {
		return internalRows.value.slice(-maxVisible)
	}

	const start = Math.max(0, editingIndexInList - Math.floor(maxVisible / 2))
	const end = Math.min(internalRows.value.length, start + maxVisible)
	return internalRows.value.slice(start, end)
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
