<template>
  <main>
    <Topbar title="General Recipe Tool" @trigger-export="callExportGeneralRecipeFunction"
      @trigger-save="triggerSaveWorkspace" @trigger-exportJson="triggerExportWorkspace"
      @trigger-importJson="triggerImportWorkspace" @trigger-reset="triggerResetWorkspace" />
    <div id="editor">
      <Sidebar id="side_bar" mode="general" />
      <workspace :storage-key="workspaceStorageKey" :key="workspaceKey" id="workspace" ref="workspaceRef" />
    </div>
  </main>
</template>

<script setup>
import Topbar from '../components/TopBar.vue'
import Sidebar from '../components/SideBar.vue'
import workspace from '../components/WorkspaceContainer.vue'
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspaceActions } from '@/composables/useWorkspaceActions'


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
:root {
  --primary: #4ade80;
  --primary-alt: #22c55e;
  --grey: #64748b;
  --dark: #1e293b;
  --dark-alt: #334155;
  --light: #f1f5f9;
  --red: red;

  --sidebar-width: 300px;
  --topbar-height: auto;
  --element-height: 10px;
}

/*this blocks makes sure that the menu bar on the left is directly at the rim and no gap appears*/
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Fira sans', sans-serif;
}

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