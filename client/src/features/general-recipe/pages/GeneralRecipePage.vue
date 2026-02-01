<template>
  <main>
    <Topbar 
    title="General Recipe Editor" 
    mode="general"
    @trigger-export="callExportGeneralRecipeFunction"
    @trigger-save="triggerSaveWorkspace" 
    @trigger-exportJson="triggerExportWorkspace"
    @trigger-importJson="triggerImportWorkspace" 
    @trigger-reset="triggerResetWorkspace" />
    <div id="editor">
      <Sidebar 
      id="side_bar" 
      mode="general" />
      <workspace 
      :storage-key="workspaceStorageKey" 
      :key="workspaceKey" 
      :property-window-component="GeneralPropertyWindow"
      id="workspace" 
      ref="workspaceRef" />
    </div>
  </main>
</template>

<script setup>
import Topbar from '@/shell/ui/topbar/TopBar.vue'
import Sidebar from '@/shell/ui/sidebar/SideBar.vue'
import workspace from '@/shell/ui/workspace/WorkspaceContainer.vue'
import GeneralPropertyWindow from '@/features/general-recipe/ui/GeneralPropertyWindow.vue'
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspaceActions } from '@/shell/composables/useWorkspaceActions'


const route = useRoute()

const workspaceRef = ref(null);

watch(() => route.fullPath, (newPath) => {
  workspaceKey.value = newPath // update key when route changes
})

const {
  workspaceKey,
  workspaceStorageKey,
  callExportGeneralRecipeFunction,
  triggerResetWorkspace,
  triggerSaveWorkspace,
  triggerExportWorkspace,
  triggerImportWorkspace
} = useWorkspaceActions(workspaceRef, 'workspaceState_general');

</script>

<style lang="scss">
header {
  background: var(--dark);
}

body {
  background: var(--light);
}

button {
  cursor: pointer;
  appearance: none;
  border: none;
  outline: none;
  background: none;
}

.app {
  display: flex;
}

main {
  display: flex;
  /* Use flexbox to control child elements */
  flex-direction: column;
  /* Stack child elements vertically */
  height: 100vh;
  /* Make the parent container take the full screen height */
  width: 100vw;
  flex-grow: 1;
}

#editor {
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
  display: flex;
  flex-grow: 1;
}
</style>