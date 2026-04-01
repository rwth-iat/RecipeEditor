<template>
  <div v-if="showBranchCountField" class="chart-element-section">
    <label for="parallelBranchCount">{{ branchCountLabel }}:</label>
    <input
      id="parallelBranchCount"
      v-model.number="branchCountModel"
      type="number"
      :min="minimumBranchCount"
      step="1"
    />
  </div>
</template>

<script setup>
import { computed, watch } from 'vue';
import {
  getMinimumParallelBranchCount,
  getParallelBranchCount,
  isParallelIndicatorType,
  isParallelJoinType,
  normalizeParallelBranchCount,
  PARALLEL_BRANCH_MIN,
} from '@/services/workspace/core/generalParallelIndicatorUtils';

const props = defineProps({
  selectedElement: {
    type: Object,
    required: true
  },
  connections: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:selectedElement']);

const selectedElementModel = computed({
  get: () => props.selectedElement,
  set: (newValue) => emit('update:selectedElement', newValue)
});

const showBranchCountField = computed(() => (
  isParallelIndicatorType(selectedElementModel.value?.procedureChartElementType)
));

const minimumBranchCount = computed(() => {
  if (!showBranchCountField.value) {
    return PARALLEL_BRANCH_MIN;
  }

  return getMinimumParallelBranchCount(
    selectedElementModel.value,
    props.connections
  );
});

const branchCountLabel = computed(() => (
  isParallelJoinType(selectedElementModel.value?.procedureChartElementType)
    ? 'Incoming Branches'
    : 'Outgoing Branches'
));

const branchCountModel = computed({
  get: () => {
    if (!showBranchCountField.value) {
      return PARALLEL_BRANCH_MIN;
    }

    return Math.max(
      minimumBranchCount.value,
      getParallelBranchCount(selectedElementModel.value)
    );
  },
  set: (value) => {
    if (!showBranchCountField.value) {
      return;
    }

    selectedElementModel.value.parallelBranchCount = Math.max(
      minimumBranchCount.value,
      normalizeParallelBranchCount(
        selectedElementModel.value?.procedureChartElementType,
        value
      )
    );
  }
});

watch(
  () => selectedElementModel.value,
  (element) => {
    if (!isParallelIndicatorType(element?.procedureChartElementType)) {
      return;
    }

    const normalizedBranchCount = Math.max(
      minimumBranchCount.value,
      getParallelBranchCount(element)
    );

    if (element.parallelBranchCount !== normalizedBranchCount) {
      element.parallelBranchCount = normalizedBranchCount;
    }
  },
  { immediate: true, deep: true }
);
</script>

<style scoped>
.chart-element-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
