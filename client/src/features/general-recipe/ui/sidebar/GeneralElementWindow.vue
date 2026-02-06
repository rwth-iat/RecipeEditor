<template>
  <ElementWindowContainer
    :elementType="element_type"
    :elementClass="elementClass"
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

const props = defineProps({
  element_type: String
});

const elementClass = computed(() => {
  switch (props.element_type) {
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
  switch (props.element_type) {
    case 'Materials':
      return [
        {
          name: 'Basic-Materials',
          type: 'material',
          children: [
            { type: 'material', name: 'Educt' },
            { type: 'material', name: 'Intermediate' },
            { type: 'material', name: 'Product' }
          ]
        }
      ];
    case 'Processes':
      return [
        { name: 'Dosage Prep Stage:', type: 'process', processElementType: 'Process Stage' },
        { name: 'Packaging Stage:', type: 'process', processElementType: 'Process Stage' },
        { name: 'Wet Mixing Operation:', type: 'process', processElementType: 'Process Operation' },
        { name: 'Dry Mixing Operation:', type: 'process', processElementType: 'Process Operation' },
        { name: 'Tableting Operation:', type: 'process', processElementType: 'Process Operation' },
        { name: 'Charge:', type: 'process', processElementType: 'Process Action' },
        { name: 'Charge with Agitation:', type: 'process', processElementType: 'Process Action' },
        { name: 'Charge to adjust pH:', type: 'process', processElementType: 'Process Action' }
      ];
    case 'ChartElements':
      return [
        {
          name: 'Basic',
          type: 'chart_element',
          children: [
            { type: 'chart_element', name: 'Previous Operation Indicator', procedureChartElementType: 'Previous Operation Indicator' },
            { type: 'chart_element', name: 'Next Operation Indicator', procedureChartElementType: 'Next Operation Indicator' },
            { type: 'chart_element', name: 'Start Parallel Indicator', procedureChartElementType: 'Start Parallel Indicator' },
            { type: 'chart_element', name: 'End Parallel Indicator', procedureChartElementType: 'End Parallel Indicator' },
            { type: 'chart_element', name: 'Start Optional Parallel Indicator', procedureChartElementType: 'Start Optional Parallel Indicator' },
            { type: 'chart_element', name: 'End Optional Parallel Indicator', procedureChartElementType: 'End Optional Parallel Indicator' },
            { type: 'chart_element', name: 'Annotation', procedureChartElementType: 'Annotation' },
            { type: 'chart_element', name: 'Other', procedureChartElementType: 'Other' }
          ]
        }
      ];
    default:
      return [];
  }
});
</script>
