<template>
	<div class="crochet-table-shell">
		<div v-if="showTranslateButton" class="crochet-table__corner-actions" @click.stop>
			<ButtonTranslate />
		</div>
		<div class="crochet-table crochet-table--view row-list-vertical">
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
			:class="{'row-container--grouped-start': isRowContainerGroupedStart(visibleRows, idx)}"
			@click.stop
		>
			<component
				:is="rowComponent"
				:row="visibleRows[idx]"
				:previous-generate="getPreviousGenerate(row.row_index)"
				:group-reminder="groupReminderByRowIndex[row.row_index]"
				:is-editing="false"
				:table-type="type"
				v-bind="rowExtraProps(visibleRows[idx], { groupReminderByRowIndex })"
			/>
		</div>
		</div>
	</div>
</template>

<script setup>
import { computed, provide } from 'vue'
import { useI18n } from 'vue-i18n'
import CrochetRow from './Crochet/CrochetRow.vue'
import ButtonTranslate from '@/components/buttons/svg/ButtonTranslate.vue'
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
	},
	headerKeyPrefix: {
		type: String,
		default: 'crochetTable.header'
	},
	rowComponent: {
		type: Object,
		default: () => CrochetRow
	},
	rowExtraProps: {
		type: Function,
		default: () => ({})
	},
	showTranslateButton: {
		type: Boolean,
		default: true
	},
	// Optional injections for other crafts (e.g. knitting)
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

// Provide craft overrides down to CrochetNode/CrochetPattern tree.
if (props.stitchComponent) provide('stitchComponent', props.stitchComponent)
if (props.bundleComponent) provide('bundleComponent', props.bundleComponent)
if (props.patternComponent) provide('patternComponent', props.patternComponent)
if (props.ropeComponent) provide('ropeComponent', props.ropeComponent)
if (props.showZhRepeatOverride !== null && props.showZhRepeatOverride !== undefined) {
	provide('showZhRepeatOverride', props.showZhRepeatOverride)
}
if (props.stitchLookup) provide('stitchLookup', props.stitchLookup)

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

</script>


