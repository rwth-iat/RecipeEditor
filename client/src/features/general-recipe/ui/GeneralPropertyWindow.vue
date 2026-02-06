<template>
  <PropertyWindowBase
    v-bind="props"
    @close="emit('close')"
    @openInWorkspace="emit('openInWorkspace')"
    @deleteElement="emit('deleteElement',$event)"
    @update:selectedElement="emit('update:selectedElement', $event)"
  >
    <template #header="{ emitClose, emitOpenInWorkspace, emitDeleteElement, computedSelectedElement }">
      <PropertyWindowHeaderActions
        :showOpenInWorkspace="computedSelectedElement?.type === 'process'"
        @close="emitClose"
        @openInWorkspace="emitOpenInWorkspace"
        @deleteElement="emitDeleteElement"
      />
    </template>

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
  </PropertyWindowBase>
</template>

<script setup>
import { computed } from 'vue';
import PropertyWindowBase from '@/shell/ui/workspace/PropertyWindowBase.vue';
import PropertyWindowHeaderActions from '@/shell/ui/workspace/PropertyWindowHeaderActions.vue';
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
