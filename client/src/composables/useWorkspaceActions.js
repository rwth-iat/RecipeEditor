// src/composables/useWorkspaceActions.js
import { watch, ref } from "vue";
import { useRoute } from "vue-router";

export function useWorkspaceActions(workspaceRef, initialStorageKey) {
  const route = useRoute();
  const workspaceKey = ref(route.fullPath);
  const workspaceStorageKey = ref(initialStorageKey);

  watch(
    () => route.fullPath,
    (newPath) => {
      workspaceKey.value = newPath;
    }
  );

  function callExportGeneralRecipeFunction() {
    if (workspaceRef.value?.export_general_recipe_batchml) {
      workspaceRef.value.export_general_recipe_batchml();
      console.log("aaaa");
    } else {
      console.error("export_general_recipe_batchml not found on workspaceRef");
    }
  }
  function callExportMasterRecipeFunction() {
    if (workspaceRef.value?.export_master_recipe_batchml) {
      workspaceRef.value.export_master_recipe_batchml();
    } else {
      console.error("export_master_recipe_batchml not found on workspaceRef");
    }
  }

  function triggerResetWorkspace() {
    if (workspaceRef.value?.clearWorkspace) {
      workspaceRef.value.clearWorkspace();
    } else {
      console.error("clearWorkspace not found on workspaceRef");
    }
  }

  function triggerSaveWorkspace() {
    if (workspaceRef.value?.saveWorkspaceToLocal) {
      workspaceRef.value.saveWorkspaceToLocal();
      alert("Workspace saved to local storage!");
    } else {
      console.error("saveWorkspaceToLocal not found on workspaceRef");
    }
  }

  function triggerExportWorkspace() {
    if (workspaceRef.value?.exportWorkspaceJson) {
      workspaceRef.value.exportWorkspaceJson();
    } else {
      console.error("exportWorkspaceJson not found on workspaceRef");
    }
  }

  function triggerImportWorkspace(evt) {
    if (workspaceRef.value?.importWorkspaceJson) {
      workspaceRef.value.importWorkspaceJson(evt);
    } else {
      console.error("importWorkspaceJson not found on workspaceRef");
    }
  }

  return {
    workspaceKey,
    workspaceStorageKey,
    callExportGeneralRecipeFunction,
    callExportMasterRecipeFunction,
    triggerResetWorkspace,
    triggerSaveWorkspace,
    triggerExportWorkspace,
    triggerImportWorkspace,
  };
}
