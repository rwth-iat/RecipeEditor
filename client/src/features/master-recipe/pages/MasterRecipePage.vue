<template>
  <RecipePageLayout>
    <template #topbar>
      <Topbar 
      title="Master Recipe Editor" 
      mode="master" 
      style="background-color: var(--dark);"
      @trigger-export="callExportMasterRecipeFunction" @trigger-save="triggerSaveWorkspace"
      @trigger-exportJson="triggerExportWorkspace" @trigger-importJson="triggerImportWorkspace"
      @trigger-reset="triggerResetWorkspace" @trigger-open-config="openMasterRecipeConfig"
      @trigger-export-master-recipe="exportMasterRecipe" />
    </template>
    <template #sidebar>
      <MasterSideBar id="side_bar" />
    </template>
    <template #workspace>
      <workspace 
      :key="workspaceKey" 
      :property-window-component="MasterPropertyWindow"
      :storage-key="workspaceStorageKey"
      :master-recipe-config="masterRecipeConfig" 
      id="workspace" 
      ref="workspaceRef"
      mode="master"  />
    </template>
    <template #overlay>
      <!-- Master Recipe Configuration Modal -->
      <div v-if="showConfigPanel" class="modal-overlay" @click="closeMasterRecipeConfig">
        <MasterRecipeConfig v-model="masterRecipeConfig" @close="closeMasterRecipeConfig" @click.stop />
      </div>
    </template>
  </RecipePageLayout>
</template>

<script setup>
import RecipePageLayout from '@/shell/ui/RecipePageLayout.vue'
import Topbar from '@/shell/ui/topbar/TopBar.vue'
import MasterSideBar from '@/features/master-recipe/ui/sidebar/MasterSideBar.vue'
import workspace from '@/shell/ui/workspace/WorkspaceContainer.vue'
import MasterPropertyWindow from '@/features/master-recipe/ui/property-window/MasterPropertyWindow.vue'
import MasterRecipeConfig from '@/features/master-recipe/ui/MasterRecipeConfig.vue'
import { ref } from 'vue'
import { useRecipeWorkspace } from '@/shell/composables/useRecipeWorkspace'
import { create_validate_download_master_recipe_batchml } from '@/services/recipeExport/new_export_xml.js'
import axios from 'axios'

const {
  workspaceRef,
  workspaceKey,
  workspaceStorageKey,
  callExportMasterRecipeFunction,
  triggerResetWorkspace,
  triggerSaveWorkspace,
  triggerExportWorkspace,
  triggerImportWorkspace
} = useRecipeWorkspace('workspaceState_master')

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
