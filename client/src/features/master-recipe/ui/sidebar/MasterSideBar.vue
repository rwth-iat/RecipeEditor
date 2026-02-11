<template>
  <SideBarContainer>
    <MasterElementWindow element_type="Procedures" />
    <MasterElementWindow element_type="RecipeElements" />
  </SideBarContainer>
</template>

<script setup>
import SideBarContainer from '@/shell/ui/sidebar/SideBarContainer.vue';
import MasterElementWindow from '@/features/master-recipe/ui/sidebar/MasterElementWindow.vue';
</script>
