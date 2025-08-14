<template>
  <main>
    <Topbar title="Master Recipe Tool" mode="master" style="background-color: var(--dark);"
      @trigger-export="callExportMasterRecipeFunction" @trigger-save="triggerSaveWorkspace"
      @trigger-exportJson="triggerExportWorkspace" @trigger-importJson="triggerImportWorkspace"
      @trigger-reset="triggerResetWorkspace" @trigger-open-config="openMasterRecipeConfig"
      @trigger-export-master-recipe="exportMasterRecipe" />
    <div id="editor">
      <Sidebar id="side_bar" mode="master" />
      <workspace :key="workspaceKey" mode="master" :storage-key="workspaceStorageKey"
        :master-recipe-config="masterRecipeConfig" id="workspace" ref="workspaceRef" />
    </div>

    <!-- Master Recipe Configuration Modal -->
    <div v-if="showConfigPanel" class="modal-overlay" @click="closeMasterRecipeConfig">
      <MasterRecipeConfig v-model="masterRecipeConfig" @close="closeMasterRecipeConfig" @click.stop />
    </div>
  </main>
</template>

<script setup>
import Topbar from '../components/TopBar.vue'
import Sidebar from '../components/SideBar.vue'
import workspace from '../components/WorkspaceContainer.vue'
import MasterRecipeConfig from '../components/MasterRecipeConfig.vue'
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspaceActions } from '@/composables/useWorkspaceActions';
import { create_validate_download_master_recipe_batchml } from '@/components/create_xml/new_export_xml.js';
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
