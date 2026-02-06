<template>
  <SideBarContainer>
    <GeneralElementWindow element_type="Materials" />
    <div class="element_spacer"></div>
    <GeneralElementWindow element_type="Processes" />
    <div class="element_spacer"></div>
    <GeneralElementWindow element_type="ChartElements" />
  </SideBarContainer>
</template>

<script setup>
import SideBarContainer from '@/shell/ui/sidebar/SideBarContainer.vue';
import GeneralElementWindow from '@/features/general-recipe/ui/sidebar/GeneralElementWindow.vue';
</script>
