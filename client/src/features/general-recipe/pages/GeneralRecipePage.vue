<template>
  <RecipePageLayout>
    <template #topbar>
      <Topbar 
      title="General Recipe Editor" 
      mode="general"
      @trigger-export="callExportGeneralRecipeFunction"
      @trigger-exportJson="triggerExportWorkspace"
      @trigger-importJson="triggerImportWorkspace" 
      @trigger-reset="triggerResetWorkspace" />
    </template>
    <template #sidebar>
      <GeneralSideBar id="side_bar" />
    </template>
    <template #workspace>
      <workspace 
      :key="workspaceKey" 
      :property-window-component="GeneralPropertyWindow"
      id="workspace" 
      ref="workspaceRef" />
    </template>
  </RecipePageLayout>
</template>

<script setup>
import RecipePageLayout from '@/shell/ui/RecipePageLayout.vue'
import Topbar from '@/shell/ui/topbar/TopBar.vue'
import GeneralSideBar from '@/features/general-recipe/ui/sidebar/GeneralSideBar.vue'
import workspace from '@/shell/ui/workspace/WorkspaceContainer.vue'
import GeneralPropertyWindow from '@/features/general-recipe/ui/property-window/GeneralPropertyWindow.vue'
import { useRecipeWorkspace } from '@/shell/composables/useRecipeWorkspace'

const {
  workspaceRef,
  workspaceKey,
  callExportGeneralRecipeFunction,
  triggerResetWorkspace,
  triggerExportWorkspace,
  triggerImportWorkspace
} = useRecipeWorkspace()

</script>
