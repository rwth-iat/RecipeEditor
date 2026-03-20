<template>
  <div id="workspace" @dragenter.prevent @dragover.prevent>
    <div class="workspace-scroll">
      <!-- Main workspace where the top level processes are located -->
      <component
        :is="mainWorkspaceContentComponent"
        id="main_workspace"
        ref="mainWorkspaceContent"
        v-show="!isSecondaryVisible"
        :main_workspace_items="main_workspace_items" :workspace_items="main_workspace_items"
        @changeSelectedElement="selectedElement = $event" @openPropertyWindow="openPropertyWindow"
        @update:workspace_items="main_workspace_items = $event"
      />

      <!-- secondary workspace for when the inner steps of a single process are edited -->
      <component
        :is="secondaryWorkspaceContentComponent"
        id="secondary_workspace"
        ref="secondaryWorkspaceContent"
        v-show="isSecondaryVisible"
        :main_workspace_items="main_workspace_items" :workspace_items="secondary_workspace_items"
        @saveWorkspace="saveSecondaryWorkspace" @changeSelectedElement="selectedElement = $event"
        @openPropertyWindow="openPropertyWindow" @update:workspace_items="secondary_workspace_items = $event"
      />
    </div>

    <!-- Zoom Buttons-->
    <div class="buttons-container">
      <button class="buttons" @click="zoomIn">
        <span class="icon--dark">+</span>
      </button>
      <button class="buttons" @click="zoomOut">
        <span class="icon--dark">-</span>
      </button>
      <button class="buttons" v-show="isSecondaryVisible" @click="closeSecondaryWorkspace">
        <span class="icon--red">x</span>
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
          :workspaceItems="isSecondaryVisible ? secondary_workspace_items : main_workspace_items"
          :connections="isSecondaryVisible ? secondaryWorkspaceContent?.getConnections() || [] : mainWorkspaceContent?.getConnections() || []"
          @close="closePropertyWindow" 
          @openInWorkspace="openInWorkspace" 
          @deleteElement="deleteElement($event)" />
          
        </div>
      </transition>
    </div>
  </div>
</template>


<script setup>
import { computed, ref, nextTick } from 'vue';
import axios from 'axios'
import { downloadTextFile } from "@/services/common/fileDownload";
import {
  buildGeneralRecipeXml,
  buildMaterialInformationXml,
  buildMasterRecipePayload,
  requestMasterRecipeXml,
  validateGeneralRecipeXml,
  validateMaterialInformationXml,
} from "@/services/recipe";
import {
  MaterialBuildStatus,
  MasterRequestStatus,
  XmlValidationStatus,
} from "@/services/recipe/common/types/exportTypes";
//import PropertyWindowContent from '@/shell/ui/workspace/PropertyWindow.vue'; // Import your property window content component
import PropertyWindowContainer from '@/shell/ui/workspace/PropertyWindowContainer.vue';
import GeneralWorkspaceContent from '@/features/general-recipe/ui/workspace/GeneralWorkspaceContent.vue';
import MasterWorkspaceContent from '@/features/master-recipe/ui/workspace/MasterWorkspaceContent.vue';
import {
  isLegacyVisibleMaterialItem,
  isMaterialContainerItem,
  normalizeMaterialContainer,
} from '@/services/recipe/general-recipe/materials/materialContainerUtils';

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
const emit = defineEmits(['secondary-workspace-context-change']);

const showSecondaryWorkspace = ref(false)
const canUseSecondaryWorkspace = computed(() => props.mode === 'general');
const isSecondaryVisible = computed(() => canUseSecondaryWorkspace.value && showSecondaryWorkspace.value);
const mainWorkspaceContentComponent = computed(() =>
  props.mode === 'master' ? MasterWorkspaceContent : GeneralWorkspaceContent
);
// Secondary workspace is currently general-only, but remains centralized in the shell container.
const secondaryWorkspaceContentComponent = computed(() => GeneralWorkspaceContent);
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

//handle opening and closing the property window
const isPropertyWindowOpen = ref(false);
function openPropertyWindow() {
  isPropertyWindowOpen.value = true;
}
function closePropertyWindow() {
  isPropertyWindowOpen.value = false;
}

function normalizeProcessElementType(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue || null;
}

function emitSecondaryWorkspaceContext(visible, parentProcessElementType = null) {
  emit('secondary-workspace-context-change', {
    visible,
    parentProcessElementType: visible
      ? normalizeProcessElementType(parentProcessElementType)
      : null,
  });
}

function shouldInitializeOperationIndicators(processElementType) {
  const normalizedType = normalizeProcessElementType(processElementType);
  return normalizedType === 'Process Stage' || normalizedType === 'Process Operation';
}

function createDefaultOperationIndicators() {
  let uniqueId = secondaryWorkspaceContent.value.findNextAvailableId(
    main_workspace_items.value,
    "Previous Operation Indicator"
  );
  const previousIndicator = {
    id: uniqueId,
    description: uniqueId,
    name: "Previous Operation Indicator",
    type: "chart_element",
    x: 300,
    y: 100,
    amount: {},
    processElementType: "",
    procedureChartElementType: "Previous Operation Indicator",
  };

  uniqueId = secondaryWorkspaceContent.value.findNextAvailableId(
    main_workspace_items.value,
    "Next Operation Indicator"
  );
  const nextIndicator = {
    id: uniqueId,
    description: uniqueId,
    name: "Next Operation Indicator",
    type: "chart_element",
    x: 300,
    y: 600,
    amount: {},
    processElementType: "",
    procedureChartElementType: "Next Operation Indicator",
  };

  return [previousIndicator, nextIndicator];
}

/*
  the following paramters and functions handle the zooming of the workspace
  to zoom the workspace you use the zoomin and zoomout buttons in the upper left corner
*/
function zoomIn() {
  if (isSecondaryVisible.value && secondaryWorkspaceContent.value) {
    secondaryWorkspaceContent.value.zoomIn()
  } else if (mainWorkspaceContent.value) {
    mainWorkspaceContent.value.zoomIn()
  }
}
function zoomOut() {
  if (isSecondaryVisible.value && secondaryWorkspaceContent.value) {
    secondaryWorkspaceContent.value.zoomOut()
  } else if (mainWorkspaceContent.value) {
    mainWorkspaceContent.value.zoomOut()
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
function formatMaterialInformationIssues(issues) {
  if (!Array.isArray(issues) || issues.length === 0) {
    return "";
  }
  const preview = issues
    .slice(0, 5)
    .map((entry) => {
      const materialLabel =
        (typeof entry.materialId === "string" && entry.materialId.trim()) ||
        (typeof entry.itemId === "string" && entry.itemId.trim()) ||
        `#${entry.itemIndex + 1}`;
      return `- Material ${materialLabel}: Property row ${entry.propertyIndex + 1}`;
    })
    .join("\n");
  const remainingCount = issues.length - 5;
  const remainingText = remainingCount > 0 ? `\n...and ${remainingCount} more.` : "";
  return `${preview}${remainingText}`;
}

async function export_general_recipe_batchml() {
  const workspaceItems = main_workspace_items.value;
  const connections = mainWorkspaceContent.value.getConnections();
  const buildResult = buildGeneralRecipeXml({ workspaceItems, connections });

  if (Array.isArray(buildResult.schemaWarnings) && buildResult.schemaWarnings.length > 0) {
    console.warn("General recipe schema warnings:", buildResult.schemaWarnings);
  }
  if (Array.isArray(buildResult.buildWarnings) && buildResult.buildWarnings.length > 0) {
    window.alert(buildResult.buildWarnings.join("\n"));
  }

  const validation = await validateGeneralRecipeXml({
    client,
    xml: buildResult.xml,
  });

  if (validation.status === XmlValidationStatus.VALID) {
    alert("✅ General Recipe successfully validated against XSD schema!\n\nThe XML file will now download.");
    downloadTextFile({
      filename: "Verfahrensrezept.xml",
      content: buildResult.xml,
      mimeType: "application/xml;charset=utf-8",
    });
  } else if (validation.status === XmlValidationStatus.INVALID) {
    downloadTextFile({
      filename: "invalid_Verfahrensrezept.xml",
      content: buildResult.xml,
      mimeType: "application/xml;charset=utf-8",
    });
    window.alert(
      "CAUTION: The generated BatchML is invalid, but is nevertheless downloaded."
    );
  } else if (validation.status === XmlValidationStatus.UNREACHABLE) {
    downloadTextFile({
      filename: "unchecked_Verfahrensrezept.xml",
      content: buildResult.xml,
      mimeType: "application/xml;charset=utf-8",
    });
    window.alert(
      "Error 404: Unable to reach the server when validating BatchML. Are you maybe only running the client code?"
    );
  } else {
    window.alert(
      "Error: BatchML could not be validated. For complete error details, check browser devtools."
    );
  }

  const materialInformation = buildMaterialInformationXml({ workspaceItems });
  if (materialInformation.status === MaterialBuildStatus.BLOCKED) {
    window.alert(
      "WARNING: MaterialInformation.xml will NOT be exported.\n\n" +
        "Reason: At least one MaterialDefinitionProperty has a Description and/or Value but the Property ID is empty.\n\n" +
        "Please fill the Property ID or clear the row.\n\n" +
        `${formatMaterialInformationIssues(materialInformation.issues)}\n\n` +
        "The General Recipe export continues."
    );
    return;
  }

  if (materialInformation.status !== MaterialBuildStatus.READY || !materialInformation.xml) {
    return;
  }

  const materialValidation = await validateMaterialInformationXml({
    client,
    xml: materialInformation.xml,
  });

  if (materialValidation.status === XmlValidationStatus.VALID) {
    downloadTextFile({
      filename: "MaterialInformation.xml",
      content: materialInformation.xml,
      mimeType: "application/xml;charset=utf-8",
    });
  } else if (materialValidation.status === XmlValidationStatus.INVALID) {
    downloadTextFile({
      filename: "invalid_MaterialInformation.xml",
      content: materialInformation.xml,
      mimeType: "application/xml;charset=utf-8",
    });
    window.alert(
      "CAUTION: The generated MaterialInformation is invalid, but is nevertheless downloaded."
    );
  } else if (materialValidation.status === XmlValidationStatus.UNREACHABLE) {
    downloadTextFile({
      filename: "unchecked_MaterialInformation.xml",
      content: materialInformation.xml,
      mimeType: "application/xml;charset=utf-8",
    });
    window.alert(
      "Error 404: Unable to reach the server when validating the MaterialInformation."
    );
  } else {
    window.alert(
      "Error: MaterialInformation could not be validated. For complete error details, check browser devtools."
    );
  }
}

async function export_master_recipe_batchml() {
  const workspaceItems = main_workspace_items.value;
  const connections = mainWorkspaceContent.value.getConnections();
  const config = props.masterRecipeConfig;
  const buildResult = buildMasterRecipePayload({
    workspaceItems,
    connections,
    config,
  });

  if (buildResult.validationWarnings.length > 0) {
    alert(
      `⚠️ Parameter validation warnings found:\n\n${buildResult.validationWarnings.join(
        "\n"
      )}\n\nThe recipe will still be exported, but some parameters may be outside recommended ranges.`
    );
  }

  const response = await requestMasterRecipeXml({
    client,
    payload: buildResult.payload,
  });

  if (response.status === MasterRequestStatus.VALID) {
    alert("✅ Master Recipe successfully created and validated against XSD schema!\n\nThe XML file will now download.");
    downloadTextFile({
      filename: "master_recipe.xml",
      content: response.xml,
      mimeType: "application/xml;charset=utf-8",
    });
    return;
  }

  if (response.status === MasterRequestStatus.INVALID) {
    alert(
      `❌ Master Recipe validation failed!\n\nXSD Schema Error: ${
        response.validationError || "Unknown validation error."
      }\n\nA fallback file will now download.`
    );
    if (response.xml) {
      downloadTextFile({
        filename: "invalid_master_recipe.xml",
        content: response.xml,
        mimeType: "application/xml;charset=utf-8",
      });
    } else {
      downloadTextFile({
        filename: "invalid_master_recipe_validation_error.txt",
        content: `Master Recipe validation failed.\n\nServer response:\n${response.validationError}`,
        mimeType: "text/plain;charset=utf-8",
      });
    }
    return;
  }

  if (response.status === MasterRequestStatus.SERVER_ERROR) {
    alert(
      `🚨 Server error occurred while creating master recipe:\n\n${
        response.validationError || "Unknown server error."
      }`
    );
    return;
  }

  if (response.status === MasterRequestStatus.NETWORK_ERROR) {
    alert(
      "🌐 Network error: Unable to reach the server for validation.\n\nPlease check your connection and try again."
    );
    return;
  }

  alert(
    `❌ Error creating master recipe:\n\n${
      response.validationError || "Unknown master recipe error."
    }`
  );
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
  clearWorkspace,
  exportWorkspaceJson,
  importWorkspaceJson
});


async function openInWorkspace() {
  if (!canUseSecondaryWorkspace.value || !secondaryWorkspaceContent.value) {
    return;
  }
  if (normalizeProcessElementType(selectedElement.value?.processElementType) === 'Process Action') {
    return;
  }
  await secondaryWorkspaceContent.value.clearWorkspace() //reset secondary workspace
  // check if this element already has children processes else define empty list
  if (!Array.isArray(selectedElement.value.processElement)) {
    console.debug("no child processelements: ", selectedElement.value.processElement)
    selectedElement.value.processElement = [];
  }
  if (!Array.isArray(selectedElement.value.materials)) {
    console.debug("no child materials: ", selectedElement.value.materials)
    selectedElement.value.materials = [];
  }
  const legacyChartElements = selectedElement.value.materials.filter(
    (item) => item?.type === 'chart_element'
  );
  selectedElement.value.materials = selectedElement.value.materials.filter(
    (item) => item?.type !== 'chart_element'
  );
  if (!Array.isArray(selectedElement.value.procedureChartElement)) {
    selectedElement.value.procedureChartElement = [];
  }
  if (
    selectedElement.value.procedureChartElement.length === 0 &&
    legacyChartElements.length > 0
  ) {
    selectedElement.value.procedureChartElement = legacyChartElements;
  }
  if (
    selectedElement.value.procedureChartElement.length === 0 &&
    shouldInitializeOperationIndicators(selectedElement.value.processElementType)
  ) {
    selectedElement.value.procedureChartElement = createDefaultOperationIndicators();
  }
  if (!Array.isArray(selectedElement.value.directedLink)) {
    selectedElement.value.directedLink = [];
  }

  await nextTick();
  await nextTick();
  //reset secondary workspace variables
  await secondaryWorkspaceContent.value.addElements(selectedElement.value.materials) //add materials to workspace item list
  await secondaryWorkspaceContent.value.addElements(selectedElement.value.procedureChartElement)
  await secondaryWorkspaceContent.value.addElements(selectedElement.value.processElement) //add processes to workspace item list
  await secondaryWorkspaceContent.value.addConnections(selectedElement.value.directedLink)
  showSecondaryWorkspace.value = true;//visually open the actual secondary workspace
  secondaryWorkspaceParent.value = selectedElement.value;//set the current parent
  emitSecondaryWorkspaceContext(true, selectedElement.value?.processElementType);
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

function closeSecondaryWorkspace() {
  saveSecondaryWorkspace();
  showSecondaryWorkspace.value = false;
  secondaryWorkspaceParent.value = null;
  emitSecondaryWorkspaceContext(false);
}


function saveSecondaryWorkspace() {
  if (!canUseSecondaryWorkspace.value || !secondaryWorkspaceContent.value || !secondaryWorkspaceParent.value) {
    return;
  }
  //build the parent object
  console.debug("Saving secondary Workspace: ", secondary_workspace_items.value)
  secondaryWorkspaceParent.value.materials = []
  secondaryWorkspaceParent.value.processElement = []
  secondaryWorkspaceParent.value.procedureChartElement = []
  for (let element of secondary_workspace_items.value) {
    console.debug("adding element: ", element)
    if (isMaterialContainerItem(element) || isLegacyVisibleMaterialItem(element)) { // add materials
      console.debug("adding as material")
      secondaryWorkspaceParent.value.materials.push(normalizeMaterialContainer(element))
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
  mainWorkspaceContent.value?.deleteElement(element)
  secondaryWorkspaceContent.value?.deleteElement(element)
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

