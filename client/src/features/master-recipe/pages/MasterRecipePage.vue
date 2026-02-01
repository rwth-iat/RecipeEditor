<template>
  <main>
    <Topbar 
    title="Master Recipe Editor" 
    mode="master" 
    style="background-color: var(--dark);"
    @trigger-export="callExportMasterRecipeFunction" @trigger-save="triggerSaveWorkspace"
    @trigger-exportJson="triggerExportWorkspace" @trigger-importJson="triggerImportWorkspace"
    @trigger-reset="triggerResetWorkspace" @trigger-open-config="openMasterRecipeConfig"
    @trigger-export-master-recipe="exportMasterRecipe" />
    <div id="editor">
      <Sidebar 
      id="side_bar" 
      mode="master" />
      <workspace 
      :key="workspaceKey" 
      :property-window-component="MasterPropertyWindow"
      :storage-key="workspaceStorageKey"
      :master-recipe-config="masterRecipeConfig" 
      id="workspace" 
      ref="workspaceRef"
      mode="master"  />
    </div>

    <!-- Master Recipe Configuration Modal -->
    <div v-if="showConfigPanel" class="modal-overlay" @click="closeMasterRecipeConfig">
      <MasterRecipeConfig v-model="masterRecipeConfig" @close="closeMasterRecipeConfig" @click.stop />
    </div>
  </main>
</template>

<script setup>
import Topbar from '@/shell/ui/topbar/TopBar.vue'
import Sidebar from '@/shell/ui/sidebar/SideBar.vue'
import workspace from '@/shell/ui/workspace/WorkspaceContainer.vue'
import MasterPropertyWindow from '@/features/master-recipe/ui/MasterPropertyWindow.vue'
import MasterRecipeConfig from '@/features/master-recipe/ui/MasterRecipeConfig.vue'
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspaceActions } from '@/shell/composables/useWorkspaceActions';
import { create_validate_download_master_recipe_batchml } from '@/services/recipeExport/new_export_xml.js';
import axios from 'axios';

const route = useRoute()

const workspaceRef = ref(null);

// Master Recipe Configuration (fully empty by default)
const masterRecipeConfig = ref({
  productId: '',
  productName: '',
  version: '',
  description: '',
  formulaParameters: [],
  equipmentRequirements: []
});

// Load saved configuration with robust fallback
const savedConfig = localStorage.getItem('masterRecipeConfig');
if (savedConfig) {
  try {
    const parsed = JSON.parse(savedConfig);
    masterRecipeConfig.value = {
      productId: typeof parsed.productId === 'string' ? parsed.productId : '',
      productName: typeof parsed.productName === 'string' ? parsed.productName : '',
      version: typeof parsed.version === 'string' ? parsed.version : '',
      description: typeof parsed.description === 'string' ? parsed.description : '',
      formulaParameters: Array.isArray(parsed.formulaParameters) ? parsed.formulaParameters : [],
      equipmentRequirements: Array.isArray(parsed.equipmentRequirements) ? parsed.equipmentRequirements : []
    };
  } catch (e) {
    masterRecipeConfig.value = {
      productId: '',
      productName: '',
      version: '',
      description: '',
      formulaParameters: [],
      equipmentRequirements: []
    };
    console.warn('Failed to load saved master recipe config:', e);
  }
}

const showConfigPanel = ref(false);

function openMasterRecipeConfig() {
  showConfigPanel.value = true;
}

function closeMasterRecipeConfig() {
  showConfigPanel.value = false;
}

watch(() => route.fullPath, (newPath) => {
  workspaceKey.value = newPath
})

const {
  workspaceKey,
  workspaceStorageKey,
  callExportMasterRecipeFunction,
  triggerResetWorkspace,
  triggerSaveWorkspace,
  triggerExportWorkspace,
  triggerImportWorkspace
} = useWorkspaceActions(workspaceRef, 'workspaceState_master');


// --- Export Master Recipe ---
const client = axios.create({ baseURL: '' });
function exportMasterRecipe() {
  if (!workspaceRef.value) {
    alert('Workspace not ready!');
    return;
  }
  const workspaceItems = workspaceRef.value.getWorkspaceItems();
  const connections = workspaceRef.value.getConnections();
  const config = masterRecipeConfig.value;

  // Validation
  if (!config.productId || !config.productName || !config.version) {
    alert('Please fill out all required fields in the Master Recipe configuration (Product ID, Product Name, Version).');
    return;
  }
  if (!workspaceItems.some(item => item.type === 'process')) {
    alert('Please add at least one process step to the workspace.');
    return;
  }

  create_validate_download_master_recipe_batchml(
    workspaceItems,
    connections,
    client,
    config
  );
}
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
}

#editor {
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
  display: flex;
  flex-grow: 1;
}

/* Modal overlay for configuration panel */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
