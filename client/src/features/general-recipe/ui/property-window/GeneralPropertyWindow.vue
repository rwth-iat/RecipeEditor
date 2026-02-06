<template>
  <PropertyWindowContainer
    v-bind="props"
    :showOpenInWorkspace="computedSelectedElement?.type === 'process'"
    @close="emit('close')"
    @openInWorkspace="emit('openInWorkspace')"
    @deleteElement="emit('deleteElement',$event)"
    @update:selectedElement="emit('update:selectedElement', $event)"
  >
    <MaterialPropertySection
      v-if="computedSelectedElement?.type === 'material'"
      v-model:selectedElement="computedSelectedElement"
    />

    <ProcessPropertySection
      v-if="computedSelectedElement?.type === 'process'"
      v-model:selectedElement="computedSelectedElement"
    />

    <ChartElementPropertySection
      v-if="computedSelectedElement?.type === 'chart_element'"
      v-model:selectedElement="computedSelectedElement"
    />
  </PropertyWindowContainer>
</template>

<script setup>
import { computed } from 'vue';
import PropertyWindowContainer from '@/shell/ui/workspace/PropertyWindowContainer.vue';
import MaterialPropertySection from '@/features/general-recipe/ui/property-window/MaterialPropertySection.vue';
import ProcessPropertySection from '@/features/general-recipe/ui/property-window/ProcessPropertySection.vue';
import ChartElementPropertySection from '@/features/general-recipe/ui/property-window/ChartElementPropertySection.vue';

const props = defineProps({
  selectedElement: Object,
  mode: {
    type: String,
    default: 'general'
  },
  workspaceItems: {
    type: Array,
    default: () => []
  },
  connections: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'openInWorkspace', 'deleteElement', 'update:selectedElement']);
const computedSelectedElement = computed({
  get: () => props.selectedElement,
  set: (newValue) => {
    emit('update:selectedElement', newValue);
  },
});
</script>
