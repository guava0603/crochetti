<template>
	<div class="crochet-table crochet-table--record row-list-vertical">
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
			:class="{
        'row-container--grouped': row.group_index !== undefined && row.group_index !== null,
				'row-container--grouped-start': isRowContainerGroupedStart(visibleRows, idx)
      }"
			@click.stop="handleRowContainerClick(row.row_index, $event)"
		>
			<CrochetRow
				:ref="setRowRef(row.row_index)"
				:row="visibleRows[idx]"
				:previous-generate="getPreviousGenerate(row.row_index)"
				:is-editing="false"
				:table-type="type"
				@selection-change="handleRowSelectionChange"
			/>
		</div>
	</div>

	<BottomToolbar v-if="activeToolbarKey === TOOLBAR_KEYS.SELECTION_POSITION && activeRow">
		<SetSelectionPosition
			:selection-list="selectionListForPosition"
			:stitch-list="activeRow.content?.stitch_node_list || []"
			:row-index="activeRow.row_index"
			:row-count="activeRow.count || 1"
			@cancel="handleCancelSetSelectionPosition"
			@update-end-at="handleUpdateEndAt"
		/>
	</BottomToolbar>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import CrochetRow from './Crochet/CrochetRow.vue'
import CrochetNode from './Crochet/CrochetNode.vue'
import BottomToolbar from '@/components/BottomToolbar/BottomToolbar.vue'
import SetSelectionPosition from '@/components/BottomToolbar/SetSelectionPosition.vue'
import { isRowContainerGroupedStart } from '@/utils/crochetTable.js'
import { openConfirmation } from '@/services/ui/confirmation'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
	modelValue: {
		type: Array,
		required: true
	},
	rowGroups: {
		type: Array,
		default: () => []
	},
	componentId: {
		type: Number,
		default: 0
	},
	componentName: {
		type: String,
		default: ''
	},
})

const emit = defineEmits(['update-end-at', 'revert-selection'])

// Fixed table type
const type = 'record'

const TOOLBAR_KEYS = Object.freeze({
	NONE: '',
	SELECTION_POSITION: 'selection-position'
})

// Track which row has a selection in record mode
const selectedRowIndex = ref(null)
const rowRefs = new Map()
const pendingApplySelection = ref(null)

const activeToolbarKey = ref(TOOLBAR_KEYS.NONE)
const activeRowIndex = ref(null)
const selectionListForPosition = ref([])
const suppressAutoOpenRowIndex = ref(null)
const promptingCompleteWholeRow = ref(false)
const lastSelectionByRowIndex = new Map()

const isClickOnCrochetNode = (event) => {
	const target = event?.target
	if (!target || typeof target !== 'object') return false
	if (typeof target.closest === 'function') {
		return Boolean(target.closest('.pattern-text'))
	}
	return false
}

const handleRowContainerClick = async (rowIndex, event) => {
	if (promptingCompleteWholeRow.value) return
	// Clicking on a CrochetNode should only trigger selection behavior.
	// CrochetNode uses @click.stop, but keep this guard for safety.
	if (isClickOnCrochetNode(event)) return

	promptingCompleteWholeRow.value = true
	try {
		const ok = await openConfirmation({
			type: {
				id: 'completeWholeRow',
				params: {
					name: String(props.componentName || '').trim(),
					row: rowIndex
				}
			}
		})

		if (ok) {
			const row = visibleRows.value.find(r => r?.row_index === rowIndex) || null
			const generate = Number(row?.content?.generate ?? row?.generate ?? 0)
			if (Number.isFinite(generate) && generate >= 0) {
				emit('update-end-at', rowIndex, generate)
				activeToolbarKey.value = TOOLBAR_KEYS.NONE
				selectionListForPosition.value = []
				activeRowIndex.value = null
				await nextTick()
				emit('revert-selection')
			}
			return
		}

		// If user doesn't complete the whole row, open the selection-position toolbar.
		activeRowIndex.value = rowIndex
		selectionListForPosition.value = lastSelectionByRowIndex.get(rowIndex) || []
		activeToolbarKey.value = TOOLBAR_KEYS.SELECTION_POSITION
	} finally {
		promptingCompleteWholeRow.value = false
	}
}

const handleRowSelectionChange = async (rowIndex, nextSelectionList) => {
	const safeList = Array.isArray(nextSelectionList) ? nextSelectionList : []
	const isSelected = safeList.length > 0
	const prevSelectedRowIndex = selectedRowIndex.value

	lastSelectionByRowIndex.set(rowIndex, safeList)

	if (!isSelected) {
		if (selectedRowIndex.value === rowIndex) selectedRowIndex.value = null
		if (activeRowIndex.value === rowIndex) {
			activeRowIndex.value = null
			selectionListForPosition.value = []
			activeToolbarKey.value = TOOLBAR_KEYS.NONE
		}
		return
	}

	if (selectedRowIndex.value !== null && selectedRowIndex.value !== rowIndex) {
		const prevRowRef = rowRefs.get(selectedRowIndex.value)
		if (prevRowRef && typeof prevRowRef.clearSelection === 'function') {
			prevRowRef.clearSelection()
		}
	}

	selectedRowIndex.value = rowIndex

	activeRowIndex.value = rowIndex
	selectionListForPosition.value = safeList

	if (suppressAutoOpenRowIndex.value === rowIndex) {
		suppressAutoOpenRowIndex.value = null
		return
	}

	const isNewRowSelection = prevSelectedRowIndex !== rowIndex
	if (isNewRowSelection) {
		activeToolbarKey.value = TOOLBAR_KEYS.SELECTION_POSITION
	}
}

const activeRow = computed(() => {
	if (activeRowIndex.value === null) return null
	return visibleRows.value.find(r => r.row_index === activeRowIndex.value) || null
})

const setRowRef = (rowIndex) => (el) => {
	if (el) {
		rowRefs.set(rowIndex, el)
		const pending = pendingApplySelection.value
		if (pending && pending.row_index === rowIndex) {
			pendingApplySelection.value = null
			if (pending.suppressAutoOpen) {
				suppressAutoOpenRowIndex.value = rowIndex
			}
			if (typeof el.setSelection === 'function') {
				el.setSelection(pending.selectionList)
			}
		}
	} else {
		rowRefs.delete(rowIndex)
	}
}

// Keep a local copy so record pages can swap data without breaking refs.
const internalRows = ref([...(props.modelValue || [])])
watch(() => props.modelValue, (newValue) => {
	internalRows.value = [...(newValue || [])]
}, { deep: true })

const applySelection = (endAt) => {
	const { row_index, selectionList } = endAt
	const safeList = Array.isArray(selectionList) ? selectionList : []

	// When parent restores selection (or clears it), never keep the previous
	// component's toolbar state around.
	activeToolbarKey.value = TOOLBAR_KEYS.NONE
	activeRowIndex.value = null
	selectionListForPosition.value = []

	if (safeList.length === 0) {
		if (selectedRowIndex.value !== null) {
			const prevRowRef = rowRefs.get(selectedRowIndex.value)
			if (prevRowRef && typeof prevRowRef.clearSelection === 'function') {
				prevRowRef.clearSelection()
			}
		}
		selectedRowIndex.value = null
		return
	}

	if (selectedRowIndex.value !== null && selectedRowIndex.value !== row_index) {
		const prevRowRef = rowRefs.get(selectedRowIndex.value)
		if (prevRowRef && typeof prevRowRef.clearSelection === 'function') {
			prevRowRef.clearSelection()
		}
	}

	selectedRowIndex.value = row_index
	const rowRef = rowRefs.get(row_index)
	if (rowRef && typeof rowRef.setSelection === 'function') {
		suppressAutoOpenRowIndex.value = row_index
		rowRef.setSelection(safeList)
	} else {
		pendingApplySelection.value = { row_index, selectionList: safeList, suppressAutoOpen: true }
	}
}

const handleCancelSetSelectionPosition = () => {
	activeToolbarKey.value = TOOLBAR_KEYS.NONE
	selectionListForPosition.value = []
	activeRowIndex.value = null
	// Let parent decide how to restore selection.
	emit('revert-selection')
}

const handleUpdateEndAt = (rowIndex, crochetCount) => {
	emit('update-end-at', rowIndex, crochetCount)
	activeToolbarKey.value = TOOLBAR_KEYS.NONE
}

defineExpose({
	applySelection,
	CrochetNode
})

const visibleRows = computed(() => {
	const maxVisible = 400
	const rows = Array.isArray(internalRows.value) ? internalRows.value : []
	const expanded = []
	let currentRowIndex = 1
	let i = 0

	while (i < rows.length) {
		const groupIndex = rows[i]?.group_index
		if (groupIndex === undefined || groupIndex === null) {
			const count = Math.max(1, Number(rows[i]?.count || 1))
			for (let c = 0; c < count; c += 1) {
				expanded.push({
					...rows[i],
					row_index: currentRowIndex,
					count: 1
				})
				currentRowIndex += 1
			}
			i += 1
			continue
		}

		let j = i
		while (j < rows.length && rows[j]?.group_index === groupIndex) {
			j += 1
		}
		const segment = rows.slice(i, j)
		const repeatCount = getRepeatCountForGroup(groupIndex)
		for (let r = 0; r < repeatCount; r += 1) {
			for (const row of segment) {
				const count = Math.max(1, Number(row?.count || 1))
				for (let c = 0; c < count; c += 1) {
					expanded.push({
						...row,
						row_index: currentRowIndex,
						count: 1
					})
					currentRowIndex += 1
				}
			}
		}

		i = j
	}

	return expanded.slice(-maxVisible)
})

const getRepeatCountForGroup = (groupIndex) => {
	const list = Array.isArray(props.rowGroups) ? props.rowGroups : []
	const group = list.find(g => g && g.index === groupIndex)
	return Math.max(1, Number(group?.repeat_count || 1))
}

const getPreviousGenerate = (rowIndex) => {
	const currentRowArrayIndex = visibleRows.value.findIndex(r => r.row_index === rowIndex)
	if (currentRowArrayIndex <= 0) return 0
	const previousRow = visibleRows.value[currentRowArrayIndex - 1]
	if (!previousRow) return 0
	return previousRow.content.generate
}
</script>

<style scoped>
.crochet-table--record.row-list-vertical {
	margin-top: 0.5rem;
}

/* Make each row-container visually shorter in record table */
.crochet-table--record :deep(.row-table-cell) {
	padding: 0.25rem 0.5rem;
	min-height: 34px;
}

.crochet-table--record :deep(.row-table) {
	grid-template-columns: 56px 1fr 72px;
}

.crochet-table--record :deep(.row-number) {
	font-size: 0.9rem;
}

</style>


