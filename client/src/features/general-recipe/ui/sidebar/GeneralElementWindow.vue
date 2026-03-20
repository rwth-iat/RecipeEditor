<template>
  <ElementWindowContainer
    :elementType="normalizedElementType"
    :displayTitle="displayTitle"
    :elementClass="elementClass"
    :allowAddDialog="allowAddDialog"
    :initialPackages="initialPackages"
  >
    <template #dialog="{ open, close, addElements, elementType }">
      <GeneralAddDialog
        v-show="open"
        :element_type="elementType"
        @close="close"
        @add="addElements"
      />
    </template>
  </ElementWindowContainer>
</template>

<script setup>
import { computed } from 'vue';
import ElementWindowContainer from '@/shell/ui/sidebar/ElementWindowContainer.vue';
import GeneralAddDialog from '@/features/general-recipe/ui/sidebar/GeneralAddDialog.vue';
import { MATERIAL_CONTAINER_TYPE } from '@/services/recipe/general-recipe/materials/materialContainerUtils';
import {
  DEFAULT_ALLOWED_PROCESS_ELEMENT_TYPES,
  getProcessSidebarPackages,
} from '@/features/general-recipe/ui/sidebar/processSidebarOptions';

const props = defineProps({
  element_type: String,
  allowedProcessElementTypes: {
    type: Array,
    default: () => [...DEFAULT_ALLOWED_PROCESS_ELEMENT_TYPES]
  }
});

const normalizedElementType = computed(() => {
  if (props.element_type === 'Chart Elements') return 'ChartElements';
  return props.element_type;
});

const displayTitle = computed(() => {
  if (normalizedElementType.value === 'ChartElements') return 'Chart Elements';
  return normalizedElementType.value || '';
});

const allowAddDialog = computed(() => {
  return normalizedElementType.value === 'Materials' || normalizedElementType.value === 'Processes';
});

const elementClass = computed(() => {
  switch (normalizedElementType.value) {
    case 'Materials':
      return 'material_element sidebar_element';
    case 'Processes':
      return 'process_element sidebar_element';
    case 'ChartElements':
      return 'chart_element sidebar_element';
    default:
      return '';
  }
});

const initialPackages = computed(() => {
  switch (normalizedElementType.value) {
    case 'Materials':
      return [
        { type: MATERIAL_CONTAINER_TYPE, name: 'Educt', materialElementType: 'Input'},
        { type: MATERIAL_CONTAINER_TYPE, name: 'Intermediate', materialElementType: 'Intermediate'},
        { type: MATERIAL_CONTAINER_TYPE, name: 'Product', materialElementType: 'Output'},
      ];
    case 'Processes':
      return getProcessSidebarPackages(props.allowedProcessElementTypes);
    case 'ChartElements':
      return [
          { type: 'chart_element', name: 'Previous Operation Indicator', procedureChartElementType: 'Previous Operation Indicator' },
          { type: 'chart_element', name: 'Next Operation Indicator', procedureChartElementType: 'Next Operation Indicator' }/*,
          { type: 'chart_element', name: 'Start Parallel Indicator', procedureChartElementType: 'Start Parallel Indicator' },
          { type: 'chart_element', name: 'End Parallel Indicator', procedureChartElementType: 'End Parallel Indicator' },
          { type: 'chart_element', name: 'Start Optional Parallel Indicator', procedureChartElementType: 'Start Optional Parallel Indicator' },
          { type: 'chart_element', name: 'End Optional Parallel Indicator', procedureChartElementType: 'End Optional Parallel Indicator' },
          { type: 'chart_element', name: 'Annotation', procedureChartElementType: 'Annotation' },
          { type: 'chart_element', name: 'Other', procedureChartElementType: 'Other' }
           */
      ];
    default:
      return [];
  }
});
</script>
