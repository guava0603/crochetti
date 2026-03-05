<template>
	<div class="crochet-table crochet-table--view row-list-vertical">
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
			:class="{'row-container--grouped-start': isRowContainerGroupedStart(visibleRows, idx)}"
			@click.stop
		>
			<CrochetRow
				:row="visibleRows[idx]"
				:previous-generate="getPreviousGenerate(row.row_index)"
				:group-reminder="groupReminderByRowIndex[row.row_index]"
				:is-editing="false"
				:table-type="type"
			/>
		</div>
	</div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CrochetRow from './Crochet/CrochetRow.vue'
import CrochetNode from './Crochet/CrochetNode.vue'
import { isRowContainerGroupedStart } from '@/utils/crochetTable.js'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
	modelValue: {
		type: Array,
		required: true
	},
	rowGroups: {
		type: Array,
		default: () => []
	}
})

const type = 'view'

const visibleRows = computed(() => {
	return Array.isArray(props.modelValue) ? props.modelValue : []
})

const getRepeatCountForGroup = (groupIndex) => {
	const list = Array.isArray(props.rowGroups) ? props.rowGroups : []
	const group = list.find(g => g && g.index === groupIndex)
	return Math.max(1, Number(group?.repeat_count || 1))
}

const groupReminderByRowIndex = computed(() => {
	const rows = Array.isArray(props.modelValue) ? props.modelValue : []
	const map = {}
	let i = 0
	while (i < rows.length) {
		const groupIndex = rows[i]?.group_index
		if (groupIndex === undefined || groupIndex === null) {
			i += 1
			continue
		}
		let j = i
		while (j < rows.length && rows[j]?.group_index === groupIndex) {
			j += 1
		}
		const endRow = rows[j - 1]
		if (endRow) {
			map[endRow.row_index] = {
				n: j - i,
				m: getRepeatCountForGroup(groupIndex)
			}
		}
		i = j
	}
	return map
})

const getPreviousGenerate = (rowIndex) => {
	const list = Array.isArray(props.modelValue) ? props.modelValue : []
	const currentRowArrayIndex = list.findIndex(r => r.row_index === rowIndex)
	if (currentRowArrayIndex <= 0) return 0
	const previousRow = list[currentRowArrayIndex - 1]
	if (!previousRow) return 0
	return previousRow.content.generate
}

defineExpose({
	CrochetNode
})
</script>


