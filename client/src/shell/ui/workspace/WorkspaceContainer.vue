<template>
  <div id="workspace" @dragenter.prevent @dragover.prevent>
    <div class="workspace-scroll">
      <!-- Main workspace where the top level processes are located -->
      <WorkspaceContent id="main_workspace" ref="mainWorkspaceContent" v-show="!showSecondaryWorkspace"
        :main_workspace_items="main_workspace_items" :workspace_items="main_workspace_items"
        @changeSelectedElement="selectedElement = $event" @openPropertyWindow="openPropertyWindow"
        @update:workspace_items="main_workspace_items = $event" />

      <!-- secondary workspace for when the inner steps of a single process are edited -->
      <WorkspaceContent id="secondary_workspace" ref="secondaryWorkspaceContent" v-show="showSecondaryWorkspace"
        :main_workspace_items="main_workspace_items" :workspace_items="secondary_workspace_items"
        @saveWorkspace="saveSecondaryWorkspace" @changeSelectedElement="selectedElement = $event"
        @openPropertyWindow="openPropertyWindow" @update:workspace_items="secondary_workspace_items = $event" />
    </div>

    <!-- Zoom Buttons-->
    <div class="buttons-container">
      <button class="buttons" @click="zoomIn">
        <span class="icon--dark">+</span>
      </button>
      <button class="buttons" @click="zoomOut">
        <span class="icon--dark">-</span>
      </button>
      <button class="buttons" v-show="showSecondaryWorkspace" @click="showSecondaryWorkspace = false">
        <span class="icon--red">x</span>
      </button>
      <button class="buttons" v-show="showSecondaryWorkspace" @click="saveSecondaryWorkspace">
        <svg xmlns="http://www.w3.org/2000/svg" class="icon--dark" width="24" height="24" viewBox="0 0 24 24">
          <path fill="currentColor"
            d="M21 7v12q0 .825-.588 1.413T19 21H5q-.825 0-1.413-.588T3 19V5q0-.825.588-1.413T5 3h12l4 4Zm-2 .85L16.15 5H5v14h14V7.85ZM12 18q1.25 0 2.125-.875T15 15q0-1.25-.875-2.125T12 12q-1.25 0-2.125.875T9 15q0 1.25.875 2.125T12 18Zm-6-8h9V6H6v4ZM5 7.85V19V5v2.85Z" />
        </svg>
      </button>
    </div>

    <!-- Property window -->
    <div class="property-window-container">
      <transition name="property-window">
        <div v-show="isPropertyWindowOpen">
          <!-- 
          <PropertyWindowContent 
          -->
          <component 
          :is="props.propertyWindowComponent"
          v-model:selectedElement="selectedElement" 
          :mode="mode"
          :workspaceItems="showSecondaryWorkspace ? secondary_workspace_items : main_workspace_items"
          :connections="showSecondaryWorkspace ? secondaryWorkspaceContent?.getConnections() || [] : mainWorkspaceContent?.getConnections() || []"
          @close="closePropertyWindow" 
          @openInWorkspace="openInWorkspace" 
          @deleteElement="deleteElement($event)" />
          
        </div>
      </transition>
    </div>
  </div>
</template>


<script setup>
import { ref, nextTick } from 'vue';
import axios from 'axios'
import { create_validate_download_general_recipe_batchml } from '@/services/recipeExport/new_export_xml.js';
import { create_validate_download_master_recipe_batchml } from '@/services/recipeExport/new_export_xml.js';
//import PropertyWindowContent from '@/shell/ui/workspace/PropertyWindow.vue'; // Import your property window content component
import PropertyWindowContainer from '@/shell/ui/workspace/PropertyWindowContainer.vue';
import WorkspaceContent from '@/shell/ui/workspace/WorkspaceContent.vue';

const props = defineProps({
  mode: { 
    type: String, 
    default: 'general' },
  masterRecipeConfig: { 
    type: Object, 
    default: null },
  propertyWindowComponent: {
    type: Object,
    default: () => PropertyWindowContainer
  }
});
//variables for main workspace
const main_workspace_items = ref([]); //containing processes and materials of the main workspace
const mainWorkspaceContent = ref(null) //reference to the mainWorkspace Component

//variables for secondary workspace
const secondary_workspace_items = ref([]); //containing processes and materials of the secondary workspace
const secondaryWorkspaceContent = ref(null) //reference to the secondary Workspace Component
const secondaryWorkspaceParent = ref(null) //when inspecting subprocesses, the parent object is saved here

//initiate amount to avoid undefined error in property window
let selectedElement = ref({ amount: {} }); // currently selected Element. Its propertys are displayed in the property window. Double click selects an element.

const client = axios.create({
  //baseURL: process.env.VUE_APP_BASE_URL
  baseURL: ''
});

const showSecondaryWorkspace = ref(false)

//handle opening and closing the property window
const isPropertyWindowOpen = ref(false);
function openPropertyWindow() {
  isPropertyWindowOpen.value = true;
}
function closePropertyWindow() {
  isPropertyWindowOpen.value = false;
}

/*
  the following paramters and functions handle the zooming of the workspace
  to zoom the workspace you use the zoomin and zoomout buttons in the upper left corner
*/
function zoomIn() {
  if (!showSecondaryWorkspace.value) {
    mainWorkspaceContent.value.zoomIn()
  } else {
    secondaryWorkspaceContent.value.zoomIn()
  }
}
function zoomOut() {
  if (!showSecondaryWorkspace.value) {
    mainWorkspaceContent.value.zoomOut()
  } else {
    secondaryWorkspaceContent.value.zoomOut()
  }
}

/*
  this function does the following:,
    - it creates the batchml
    - validates it by the servers /validate endpoint
      - if its valid downloads it automatically "Verfahrensrezept.xml"
      - if not warns the user by alert box but downloads as "invalid_Verfahrensrezept"
      - if unknown error while creating or validating it gives the user the error message
*/
function export_general_recipe_batchml() {
  create_validate_download_general_recipe_batchml(main_workspace_items.value, mainWorkspaceContent.value.getConnections(), client)
}

// Property window

function export_master_recipe_batchml() {
  console.log(main_workspace_items.value)
  console.log(mainWorkspaceContent.value.getConnections())

  // Use the master recipe configuration from props
  const config = props.masterRecipeConfig;

  create_validate_download_master_recipe_batchml(
    main_workspace_items.value,
    mainWorkspaceContent.value.getConnections(),
    client,
    config
  )
}



function saveWorkspaceToLocal() {
  // Call the function from the child:
  if (mainWorkspaceContent.value && typeof mainWorkspaceContent.value.saveWorkspaceToLocal === "function") {
    mainWorkspaceContent.value.saveWorkspaceToLocal();
  } else {
    console.error("Child function saveWorkspaceToLocal not found");
  }
}

// after your existing imports and refs...
// (you already have mainWorkspaceContent defined)

const exportWorkspaceJson = () => {
  if (mainWorkspaceContent.value?.exportWorkspace) {
    mainWorkspaceContent.value.exportWorkspace();
  } else {
    console.error("exportWorkspace() not found on mainWorkspaceContent");
  }
};

const importWorkspaceJson = (event) => {
  if (mainWorkspaceContent.value?.importWorkspace) {
    mainWorkspaceContent.value.importWorkspace(event);
  } else {
    console.error("importWorkspace() not found on mainWorkspaceContent");
  }
};

function clearWorkspace() {
  if (mainWorkspaceContent.value && typeof mainWorkspaceContent.value.clearWorkspace === "function") {
    mainWorkspaceContent.value.clearWorkspace();
  } else {
    console.error("Child function clearWorkspace not found");
  }
}

//expose this funciton so that i can be called from the Topbar export button
defineExpose({
  export_general_recipe_batchml,
  export_master_recipe_batchml,
  saveWorkspaceToLocal,
  clearWorkspace,
  exportWorkspaceJson,
  importWorkspaceJson
});


async function openInWorkspace() {
  await secondaryWorkspaceContent.value.clearWorkspace() //reset secondary workspace
  // check if this element already has children processes else define empty list
  if (!Array.isArray(selectedElement.value.processElement)) {
    console.debug("no child processelements: ", selectedElement.value.processElement)
    selectedElement.value.processElement = [];
  }
  // check if this element already has children processes else define empty list
  if (!Array.isArray(selectedElement.value.materials)) {
    console.debug("no child materials: ", selectedElement.value.materials)
    //if no materials exist yet add an input and output knot
    selectedElement.value.materials = [];
    let unique_id = secondaryWorkspaceContent.value.findNextAvailableId(main_workspace_items.value, "Educt")
    selectedElement.value.materials.push({ id: unique_id, description: unique_id, name: "Educt", type: "material", x: 300, y: 100, amount: {}, processElementType: "", procedureChartElementType: "" })
    unique_id = secondaryWorkspaceContent.value.findNextAvailableId(main_workspace_items.value, "Product")
    selectedElement.value.materials.push({ id: unique_id, description: unique_id, name: "Product", type: "material", x: 300, y: 400, amount: {}, processElementType: "", procedureChartElementType: "" })
  }

  await nextTick();
  await nextTick();
  //reset secondary workspace variables
  await secondaryWorkspaceContent.value.addElements(selectedElement.value.materials) //add materials to workspace item list
  await secondaryWorkspaceContent.value.addElements(selectedElement.value.processElement) //add processes to workspace item list
  await secondaryWorkspaceContent.value.addConnections(selectedElement.value.directedLink)
  showSecondaryWorkspace.value = true;//visually open the actual secondary workspace
  secondaryWorkspaceParent.value = selectedElement.value;//set the current parent
}

//function needed to replace the original item with the edited item 
let map = {};
(function recurse(processElements) {
  for (let i = 0; i < processElements.length; i++) {
    let processElement = processElements[i];
    map[processElement.id] = processElement;
    if ("processElement" in processElement)
      recurse(processElement.processElement);
  }
})(main_workspace_items.value);

function updateObjectByID(id, newobj) {
  map[id] = newobj;
}


function saveSecondaryWorkspace() {
  //build the parent object
  console.debug("Saving secondary Workspace: ", secondary_workspace_items.value)
  secondaryWorkspaceParent.value.materials = []
  secondaryWorkspaceParent.value.processElement = []
  secondaryWorkspaceParent.value.procedureChartElement = []
  for (let element of secondary_workspace_items.value) {
    console.debug("adding element: ", element)
    if (element.type == "material") { // add materials
      console.debug("adding as material")
      secondaryWorkspaceParent.value.materials.push(element)
    } else if (element.type == "process") { // add processes
      console.debug("adding as process")
      secondaryWorkspaceParent.value.processElement.push(element)
    } else if (element.type == "chart_element") { // add processes
      console.debug("adding as procedure chart element")
      secondaryWorkspaceParent.value.procedureChartElement.push(element)

    } else if (element.type == "recipe_element") { // add processes
      console.debug("adding as recipe element")
      secondaryWorkspaceParent.value.recipeElement.push(element)
    } else {
      console.debug("type not known")
    }
  }
  secondaryWorkspaceParent.value.directedLink = secondaryWorkspaceContent.value.getConnections() //add connections

  //replace original parent obj with the new build
  updateObjectByID(secondaryWorkspaceParent.value.id, secondaryWorkspaceParent.value)
  console.debug("complete workspace parent object right before saving:", secondaryWorkspaceParent.value)
  console.debug("inserting into Main Workspace items: ", main_workspace_items.value)
}

function deleteElement(element) {
  //try to delete it in both workspaces. As ids are unique and only toplevel of elements are searched this will delete only in one of the two
  mainWorkspaceContent.value.deleteElement(element)
  secondaryWorkspaceContent.value.deleteElement(element)
}
</script>

<style>
#workspace {
  background-color: transparent;
  position: relative;
  overflow: hidden;
  /* enable scrollbars */
  width: 100%;
  height: 100%;
  /*height: calc(100vh - var(--topbar-height));*/
  flex: 1 1 0;
  border-radius: 5px;
  border-width: 1px;
  border-style: solid;
  border-color: black;
  z-index: 0;
}

.workspace-scroll {
  position: absolute;
  inset: 0;
  overflow: auto;
  z-index: 0;
}

#main_workspace {
  background-color: white;
}

#secondary_workspace {
  background-color: white;
}

.property-window-container {
  display: flex;
  position: absolute;
  height: 100%;
  overflow-y: auto;
  top: 0px;
  /* Adjust the top distance as needed */
  right: 0px;
  /* Adjust the right distance as needed */
  z-index: 2;
  /* Ensure property window appears above the workspace content */
}

/* Position buttons and property window */
.buttons-container {
  border-radius: 5px;
  border-width: 1px;
  border-style: solid;
  border-color: black;
  background-color: white;
  position: absolute;
  align-items: center;
  top: 10px;
  /* Adjust the top distance as needed */
  left: 10px;
  /* Adjust the left distance as needed */
  z-index: 2;
  /* Ensure buttons appear above the workspace content */
}

.buttons {
  margin: 10px;
  vertical-align: middle;
}

.property-window-enter-active,
.property-window-leave-active {
  transition: transform 0.5s ease-in-out;
  /* Adjust the duration as needed */
}

.property-window-enter-from,
.property-window-leave-to {
  transform: translateX(100%);
}
</style>
