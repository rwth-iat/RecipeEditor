<template>
  <PropertyWindowContainer
    v-bind="props"
    :showOpenInWorkspace="showOpenInWorkspace"
    @close="emit('close')"
    @openInWorkspace="emit('openInWorkspace')"
    @deleteElement="emit('deleteElement',$event)"
    @update:selectedElement="emit('update:selectedElement', $event)"
  >
    <MaterialPropertySection
      v-if="computedSelectedElement?.type === 'material_container'"
      v-model:selectedElement="computedSelectedElement"
    />

    <ProcessPropertySection
      v-if="computedSelectedElement?.type === 'process'"
      v-model:selectedElement="computedSelectedElement"
    />

    <ChartElementPropertySection
      v-if="computedSelectedElement?.type === 'chart_element'"
      v-model:selectedElement="computedSelectedElement"
      :connections="connections"
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

const showOpenInWorkspace = computed(() => {
  if (computedSelectedElement.value?.type !== 'process') {
    return false;
  }

  return computedSelectedElement.value?.processElementType?.trim() !== 'Process Action';
});
</script>
