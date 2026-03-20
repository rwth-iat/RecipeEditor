<template>
  <RecipePageLayout>
    <template #topbar>
      <Topbar 
      title="Master Recipe Editor" 
      mode="master" 
      style="background-color: var(--dark);"
      @trigger-export="callExportMasterRecipeFunction"
      @trigger-exportJson="triggerExportWorkspace" @trigger-importJson="triggerImportWorkspace"
      @trigger-reset="triggerResetWorkspace" @trigger-open-config="openMasterRecipeConfig" />
    </template>
    <template #sidebar>
      <MasterSideBar id="side_bar" />
    </template>
    <template #workspace>
      <workspace 
      :key="workspaceKey" 
      :property-window-component="MasterPropertyWindow"
      :master-recipe-config="masterRecipeConfig" 
      id="workspace" 
      ref="workspaceRef"
      mode="master"
      @master-config-imported="onMasterConfigImported" />
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

const {
  workspaceRef,
  workspaceKey,
  callExportMasterRecipeFunction,
  triggerResetWorkspace,
  triggerExportWorkspace,
  triggerImportWorkspace
} = useRecipeWorkspace()

function createDefaultMasterRecipeConfig() {
  return {
    listHeaderId: 'ListHeadID',
    listHeaderCreateDate: '',
    batchInfoDescription: '',
    masterRecipeId: 'MasterRecipeHC',
    masterRecipeVersion: '',
    masterRecipeVersionDate: '',
    masterRecipeDescription: '',
    productId: '',
    productName: '',
    version: '',
    description: '',
    formulaParameters: [],
    equipmentRequirements: []
  };
}

function normalizeImportedMasterRecipeConfig(config) {
  const baseConfig = createDefaultMasterRecipeConfig();
  const importedConfig = config || {};

  return {
    ...baseConfig,
    ...importedConfig,
    version:
      typeof importedConfig.version === 'string'
        ? importedConfig.version
        : (typeof importedConfig.masterRecipeVersion === 'string'
          ? importedConfig.masterRecipeVersion
          : baseConfig.version),
    description:
      typeof importedConfig.description === 'string'
        ? importedConfig.description
        : (typeof importedConfig.masterRecipeDescription === 'string'
          ? importedConfig.masterRecipeDescription
          : (typeof importedConfig.batchInfoDescription === 'string'
            ? importedConfig.batchInfoDescription
            : baseConfig.description)),
    formulaParameters: Array.isArray(importedConfig.formulaParameters)
      ? importedConfig.formulaParameters
      : baseConfig.formulaParameters,
    equipmentRequirements: Array.isArray(importedConfig.equipmentRequirements)
      ? importedConfig.equipmentRequirements
      : baseConfig.equipmentRequirements,
  };
}

const masterRecipeConfig = ref(createDefaultMasterRecipeConfig());

// Load saved configuration with robust fallback
const savedConfig = localStorage.getItem('masterRecipeConfig');
if (savedConfig) {
  try {
    const parsed = JSON.parse(savedConfig);
    masterRecipeConfig.value = normalizeImportedMasterRecipeConfig(parsed);
  } catch (e) {
    masterRecipeConfig.value = createDefaultMasterRecipeConfig();
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

function onMasterConfigImported(payload) {
  const importedConfig = normalizeImportedMasterRecipeConfig(payload?.config);
  masterRecipeConfig.value = importedConfig;
  localStorage.setItem('masterRecipeConfig', JSON.stringify(importedConfig));
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
