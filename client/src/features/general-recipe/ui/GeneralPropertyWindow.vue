<template>
  <PropertyWindowBase
    v-bind="props"
    @close="emit('close')"
    @openInWorkspace="emit('openInWorkspace')"
    @deleteElement="emit('deleteElement',$event)"
    @update:selectedElement="emit('update:selectedElement', $event)"
  >
    <MaterialPropertySection
      v-show="computedSelectedElement?.type === 'material'"
      v-model:selectedElement="computedSelectedElement"
    />

    <ProcessPropertySection
      v-show="computedSelectedElement?.type === 'process'"
      v-model:selectedElement="computedSelectedElement"
    />

    <ChartElementPropertySection
      v-show="computedSelectedElement?.type === 'chart_element'"
      v-model:selectedElement="computedSelectedElement"
    />
  </PropertyWindowBase>
</template>

<script setup>
import { computed } from 'vue';
import PropertyWindowBase from '@/shell/ui/workspace/PropertyWindowBase.vue';
import MaterialPropertySection from '@/features/general-recipe/ui/MaterialPropertySection.vue';
import ProcessPropertySection from '@/features/general-recipe/ui/ProcessPropertySection.vue';
import ChartElementPropertySection from '@/features/general-recipe/ui/ChartElementPropertySection.vue';

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
