<template>
  <SideBarContainer>
    <GeneralElementWindow element_type="Materials" />
    <GeneralElementWindow
      element_type="Processes"
      :allowedProcessElementTypes="allowedProcessElementTypes"
    />
    <GeneralElementWindow element_type="ChartElements" />
  </SideBarContainer>
</template>

<script setup>
import SideBarContainer from '@/shell/ui/sidebar/SideBarContainer.vue';
import GeneralElementWindow from '@/features/general-recipe/ui/sidebar/GeneralElementWindow.vue';
import { DEFAULT_ALLOWED_PROCESS_ELEMENT_TYPES } from '@/features/general-recipe/ui/sidebar/processSidebarOptions';

defineProps({
  allowedProcessElementTypes: {
    type: Array,
    default: () => [...DEFAULT_ALLOWED_PROCESS_ELEMENT_TYPES]
  }
});
</script>
