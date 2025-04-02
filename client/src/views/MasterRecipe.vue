<template>
  <main>
    <Topbar style="background-color: var(--dark);" title="Master Recipe Tool" @trigger-export="callExportFunciton" />
    <div id="editor">
      <Sidebar id="side_bar" />
      <workspace id="workspace" ref="workspaceRef" />
    </div>
  </main>
</template>

<script setup>
import Topbar from '../components/TopBar.vue'
import Sidebar from '../components/SideBar.vue'
import workspace from '../components/WorkspaceContainer.vue'
import { ref } from 'vue'

const workspaceRef = ref(null);

const callExportFunciton = () => {
  console.log("function call")
  workspaceRef.value.export_batchml();
};
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
</style>
