<template>
  <header id="topbar">
    <div class="dropdown actions-dropdown">
      <button class="button-with-border settings-button" @click="toggleActionsDropdown">
        Actions
      </button>
      <div v-if="actionsDropdownVisible" class="dropdown-menu">
        <button class="dropdown-item" @click="triggerExportInWorkspace">
          Export BatchML Recipe
        </button>

        <button v-if="mode === 'master'" class="dropdown-item" @click="triggerOpenConfig">
          Configure Recipe
        </button>
        <button class="dropdown-item" @click="triggerExportWorkspace">
          Export Workspace
        </button>
        <button class="dropdown-item" @click="triggerSaveWorkspace">
          Save Workspace
        </button>
        <button class="dropdown-item" @click="$refs.importInput.click()">
          Import Recipe
        </button>
        <button class="dropdown-item" @click="triggerResetWorkspace">
          Reset Workspace
        </button>
      </div>
    </div>

    <h3 style="color: lightgray"> {{ title }}</h3>
    <div class="dropdown">
      <button class="button-with-border settings-button" @click="toggleSettingsDropdown">
        ⚙ Settings
      </button>
      <div v-if="settingsDropdownVisible" class="dropdown-menu">
        <router-link to="/" class="dropdown-item">General Recipe</router-link>
        <router-link to="/master-recipe" class="dropdown-item">Master Recipe</router-link>
        <a :href="apiDocsLink" target="_blank" class="dropdown-item">API Docs</a>
      </div>
    </div>
    <input type="file" accept=".json,.xml" ref="importInput" style="display: none" @change="onImportSelected" />
  </header>
</template>

<script setup>
const apiDocsLink = window.location.origin.replace(/:\d+$/, ":5000") + "/apidocs";
import { ref } from "vue";

defineProps({
  title: String,
  mode: {
    type: String,
    default: 'general'
  }
});
const emit = defineEmits(["trigger-export", "trigger-save", "trigger-reset", "trigger-importJson", "trigger-exportJson", "trigger-open-config", "trigger-export-master-recipe"]);
const actionsDropdownVisible = ref(false);
const settingsDropdownVisible = ref(false);

const toggleActionsDropdown = () => {
  actionsDropdownVisible.value = !actionsDropdownVisible.value;
};

const toggleSettingsDropdown = () => {
  settingsDropdownVisible.value = !settingsDropdownVisible.value;
};
const triggerExportInWorkspace = () => {
  console.log("trigger-export");
  emit("trigger-export");
};

const triggerOpenConfig = () => {
  console.log("trigger-open-config");
  emit("trigger-open-config");
};

const triggerSaveWorkspace = () => {
  console.log("trigger-save");
  emit("trigger-save");
};

const triggerResetWorkspace = () => {
  console.log("trigger-reset");
  emit("trigger-reset");
};

function onImportSelected(e) {
  emit('trigger-importJson', e);
}

const triggerExportWorkspace = () => {
  console.log("trigger-exportJson");
  emit("trigger-exportJson");
};

const triggerExportMasterRecipe = () => {
  console.log("trigger-export-master-recipe");
  emit("trigger-export-master-recipe");
};

</script>

<style lang="scss">
/*container for the page heading*/
#topbar {
  display: flex;
  align-items: center;
  width: 100vw;
  text-align: center;
  background-color: var(--primary);
  color: white;
}

h3 {
  flex-grow: 1;
  text-align: center;
  margin: 0;
  border: 0 !important;
}

#exportBtt {
  display: flex;
}

/* Dropdown container */
.dropdown {
  position: relative;
}

/* Settings Button */
.settings-button {
  cursor: pointer;
  padding: 8px 12px;
  background: white;
  border: 1px solid var(--primary);
  border-radius: 5px;
}

/* Dropdown menu */
.dropdown-menu {
  position: absolute;
  top: 40px;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 5px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
  min-width: 150px;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

/* Dropdown menu items */
.dropdown-item {
  padding: 10px;
  text-decoration: none;
  color: black;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #f1f1f1;
}

.actions-dropdown .dropdown-menu {
  right: auto;
  left: 0;
  top: 100%;
}
</style>
