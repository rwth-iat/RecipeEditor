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
      <GeneralSideBar
        id="side_bar"
        :allowedProcessElementTypes="allowedProcessElementTypes"
      />
    </template>
    <template #workspace>
      <workspace 
      :key="workspaceKey" 
      :property-window-component="GeneralPropertyWindow"
      id="workspace" 
      ref="workspaceRef"
      @secondary-workspace-context-change="updateSecondaryWorkspaceContext" />
    </template>
  </RecipePageLayout>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import RecipePageLayout from '@/shell/ui/RecipePageLayout.vue'
import Topbar from '@/shell/ui/topbar/TopBar.vue'
import GeneralSideBar from '@/features/general-recipe/ui/sidebar/GeneralSideBar.vue'
import workspace from '@/shell/ui/workspace/WorkspaceContainer.vue'
import GeneralPropertyWindow from '@/features/general-recipe/ui/property-window/GeneralPropertyWindow.vue'
import { useRecipeWorkspace } from '@/shell/composables/useRecipeWorkspace'
import { resolveAllowedProcessElementTypes } from '@/features/general-recipe/ui/sidebar/processSidebarOptions'

const {
  workspaceRef,
  workspaceKey,
  callExportGeneralRecipeFunction,
  triggerResetWorkspace,
  triggerExportWorkspace,
  triggerImportWorkspace
} = useRecipeWorkspace()

const secondaryWorkspaceContext = ref({
  visible: false,
  parentProcessElementType: null,
});

const allowedProcessElementTypes = computed(() =>
  resolveAllowedProcessElementTypes(secondaryWorkspaceContext.value)
);

function resetSecondaryWorkspaceContext() {
  secondaryWorkspaceContext.value = {
    visible: false,
    parentProcessElementType: null,
  };
}

function updateSecondaryWorkspaceContext(context = {}) {
  secondaryWorkspaceContext.value = {
    visible: Boolean(context.visible),
    parentProcessElementType:
      typeof context.parentProcessElementType === 'string'
        ? context.parentProcessElementType
        : null,
  };
}

watch(workspaceKey, () => {
  resetSecondaryWorkspaceContext();
});

</script>
