<template>
    <div class="workspace_content" ref="workspaceContentRef" :style="workspaceStyle" @drop="$event => onDrop($event)" @dragenter.prevent
        @dragover.prevent draggable="false" @wheel.prevent="onWheel" @mousemove="updateMouse" @mousedown="startPanning">
        <!--Draw all workspace elements. Connections are drawn by jsplumb in the background-->
        <div :class="'workspace_element'" v-for="item in computedWorkspaceItems" :key="item.id"
            :ref="skipUnwrap.jsplumbElements" :id="item.id" @click="handleClick(item)">
            <!-- For procedure, use getProcedureClass for shape (reactive to processElementType) -->
            <template v-if="isProcedureItem(item)">
                <div :class="getProcedureClass(item)">
                    <span>{{ item.id }}</span>
                </div>
            </template>
            <!-- For recipe_element, use getRecipeElementClass for shape -->
            <template v-else-if="item.type === 'recipe_element'">
                <div :class="getRecipeElementClass(item)">
                    <template v-if="item.recipeElementType === 'Condition'">
                        <span class="condition-text">{{ generateConditionText(item) }}</span>
                    </template>
                    <!-- Hide name/ID for Begin, End, Allocation, etc. -->
                    <template v-else-if="['Begin', 'End', 'Allocation', 'Begin and end Sequence Selection', 'Begin and end Simultaneous Sequence', 'Synchronization Point', 'Synchronization Line', 'Synchronization Line indicating material transfer'].includes(item.recipeElementType)">
                        <!-- No text shown -->
                    </template>
                    <template v-else>
                        <span>{{ item.id }}</span>
                    </template>
                </div>
            </template>
            <!-- Fallback for other types -->
            <template v-else>
                <div>
                    <span>{{ item.id }}</span>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, computed, watch, nextTick } from 'vue';
import { newInstance, ready, EVENT_DRAG_STOP } from "@jsplumb/browser-ui";
import { downloadTextFile } from "@/services/common/fileDownload";
import {
    WorkspaceMode,
    exportWorkspaceJson,
    importWorkspaceFile,
} from "@/services/workspace";
import { createDefaultDotEndpointDefinition } from "@/services/workspace/core/jsPlumbEndpointUtils";
import { createJsPlumbElementLayoutObserver } from "@/services/workspace/core/jsPlumbLayoutObserverUtils";
import { stringifyConditionGroup } from "@/services/recipe/master-recipe/conditions/conditionGroupUtils";
const props = defineProps({
    main_workspace_items: Array,
    workspace_items: Array,
});

const emit = defineEmits([
    'changeSelectedElement',
    'openPropertyWindow',
    'update:workspace_items',
    'saveWorkspace',
    'workspaceImported'
]);
const workspaceContentRef = ref(null)
const jsplumbInstance = ref(null) //the jsplumb instance, this is a library which handles the drag and drop as well as the connections
const jsplumbElements = ref([])
const managedElements = ref({}) //object to mark to which elements Endpoints where already added. That why when detecting a change in workspace elemets we know which items are new 
const layoutObserver = createJsPlumbElementLayoutObserver({
    getInstance: () => jsplumbInstance.value,
})
const zoomLevel = ref(1)
const initialWorkspaceWidth = 10000
const initialWorkspaceHeight = 10000
const workspaceWidth = ref(initialWorkspaceWidth)
const workspaceHeight = ref(initialWorkspaceHeight)
const workspaceStyle = computed(() => ({
    width: `${workspaceWidth.value}px`,
    height: `${workspaceHeight.value}px`
}))

//need this as the developer server "npm run dev" will run into error using a normal ref of a v-for. This skips the unwrapping
let skipUnwrap = { jsplumbElements }

//here we make the ref to the workspace_content availible in the parent
onMounted(async () => {
    // Focus the workspace container
    workspaceContentRef.value.focus();

    if (workspaceContentRef.value) {
        // Wait for jsPlumb to initialize
        ready(async () => {
            jsplumbInstance.value = initializeJsPlumb(workspaceContentRef);

            jsplumbInstance.value.bind(EVENT_DRAG_STOP, ({ el }) => {
                const id = el.id;
                const x = parseFloat(el.style.left);
                const y = parseFloat(el.style.top);

                const updated = computedWorkspaceItems.value.map(item =>
                    item.id === id
                        ? { ...item, x, y }
                        : item
                );

                emit('update:workspace_items', updated);
            });

            // Set up a watcher to handle further changes in the workspace items
            watch(computedWorkspaceItems, createUpdateItemListHandler(jsplumbInstance, jsplumbElements, managedElements, layoutObserver), { deep: true });
            watch(computedWorkspaceItems, updateWorkspaceBounds, { deep: true, immediate: true });
        });
    }
});

onBeforeUnmount(() => {
    stopPanning();
    layoutObserver.disconnect();
});


// Create a computed property that represents the entire selectedElement
// this is recommended solution to achieve two way binding between the parent and this child component
// this way the parent component is the only one setting values.
// it define a get and set method:
//    -get: take the given object from the parent
//    -set: emit to parent new object. The parent then sets the new value
const computedWorkspaceItems = computed({
    get: () => props.workspace_items,
    set: (newValue) => {
        emit('update:workspace_items', newValue);
    },
});

/*
The follwing Functions handle the opening and closing of the property window.
Every click checks if in the last 300 miliseconds the same target was already clicked.
Then it is registered as a double click and the property window is opened.
*/
//double click opens window
const lastClickTime = ref(0);
const doubleClickThreshold = 300; // Adjust this value as needed (in milliseconds)
const handleClick = (item) => {
    const currentTime = new Date().getTime();
    console.log("click_detected")
    if (currentTime - lastClickTime.value < doubleClickThreshold) {
        handleDoubleClick(item);
    } else {
        lastClickTime.value = currentTime;
    }
};
const handleDoubleClick = (item) => {
    // Logic to handle double click
    emit('changeSelectedElement', item)
    emit('openPropertyWindow')
    console.log('Double click detected!');
};


// Drag-panning via scrollbars (keep top-left reachable)
let panning = false;
let panStartX = 0;
let panStartY = 0;
let panStartScrollLeft = 0;
let panStartScrollTop = 0;

const startPanning = (event) => {
    if (event.button !== 0) return;
    if (!event.target.classList.contains("workspace_content")) return;
    const container = workspaceContentRef.value?.parentElement;
    if (!container) return;
    event.preventDefault();
    panning = true;
    panStartX = event.clientX;
    panStartY = event.clientY;
    panStartScrollLeft = container.scrollLeft;
    panStartScrollTop = container.scrollTop;
    container.classList.add("is-panning");
    window.addEventListener("mousemove", handlePanning);
    window.addEventListener("mouseup", stopPanning);
};

const handlePanning = (event) => {
    if (!panning) return;
    const container = workspaceContentRef.value?.parentElement;
    if (!container) return;
    const dx = event.clientX - panStartX;
    const dy = event.clientY - panStartY;
    container.scrollLeft = panStartScrollLeft - dx;
    container.scrollTop = panStartScrollTop - dy;
};

const stopPanning = () => {
    if (!panning) return;
    panning = false;
    const container = workspaceContentRef.value?.parentElement;
    if (container) container.classList.remove("is-panning");
    window.removeEventListener("mousemove", handlePanning);
    window.removeEventListener("mouseup", stopPanning);
};

// TODO: check if this interfers with js plumb drag and drop as it may be called on every drop event
function onDrop(event) {
    console.log("Drop");
    event.preventDefault();

    let item = JSON.parse(event.dataTransfer.getData("item"));
    let classes = event.dataTransfer.getData("itemClasses");

    let type;
    let x_offset;
    console.log(classes);
    if (classes.includes("procedure_element")) {
        type = "procedure";
        x_offset = 100;
    } else if (classes.includes("recipe_element")) {
        type = "recipe_element";
        x_offset = 100; // or whatever is visually appropriate
    }

    else {
        console.error("neither procedure nor recipe element dropped into workspace");
        return;
    }

    let rect = event.target.getBoundingClientRect();
    const zoom = zoomLevel.value || 1;
    let x = (event.clientX - rect.left) / zoom - x_offset;
    let y = (event.clientY - rect.top) / zoom;

    if (classes.includes("sidebar_element")) {
        console.debug(props);
        
        // Generate a unique ID that considers both sidebar and current workspace
        let uniqueId = findNextAvailableId(props.main_workspace_items, item.name);
        console.log(`Initial ID generated: ${uniqueId}`);
        
        // Double-check that this ID is truly unique in the current workspace
        while (computedWorkspaceItems.value.some(existingItem => existingItem.id === uniqueId)) {
            // Extract the base name and current number
            const baseName = item.name;
            const currentNumber = parseInt(uniqueId.slice(baseName.length), 10);
            const nextNumber = currentNumber + 1;
            uniqueId = `${baseName}${nextNumber.toString().padStart(3, '0')}`;
            console.log(`ID conflict detected, generating new ID: ${uniqueId}`);
        }
        
        console.log(`Final unique ID: ${uniqueId}`);
        console.log(`Current workspace items:`, computedWorkspaceItems.value.map(i => i.id));
        
        item.x = x;
        item.y = y;
        item.type = type;
        item.description = item.name;
        item.id = uniqueId;
        if (type === "procedure" && (item.processElementType === undefined || item.processElementType === null || item.processElementType === "")) {
            item.processElementType = "Recipe Procedure Containing Lower Level PFC";
        }
        item.amount = {};

        // Add the new item to the workspace (no need to check for existing since we ensured uniqueness)
        computedWorkspaceItems.value.push(item);
        console.log(`Added item ${uniqueId} to workspace`);

        emit("saveWorkspace");

        // Check and add connections if necessary
        // addConnectionsForDroppedItem(item);
    }
}

// Function to initialize jsPlumb
function initializeJsPlumb(container) {
    let instance = newInstance({
        container: container.value,
        maxConnections: -1,
        connectionOverlays: [{ type: "Arrow", options: { location: 1 } }],
        connector: "Flowchart"
    });
    container.value.style.zoom = '1';
    instance.setZoom(1);
    return instance
}

async function resetJsPlumb() {
    jsplumbInstance.value.reset()
    console.debug("resetted jsplumb:", jsplumbInstance.value)
}

function addEndpoint(instance, element, options) {
    let anchor
    if (options.source) { anchor = "Bottom" }
    else if (options.target) { anchor = "Top" }

    const sourceEndpoint = instance.addEndpoint(element, {
        source: options.source,
        target: options.target,
        anchor: anchor,
        ...createDefaultDotEndpointDefinition(),
    });
    return sourceEndpoint
}

// add endpoints and attach the element id as data to the endpoint. 
// When exporting to xml we can iterate through the connections and when accessing the source Endpoint and Target endpoint we can now read the corresponding element
function addJsPlumbEndpoints(instance, element, item) {
    console.log("Adding JS Endpoints to new Element", element);

    if (element) {
        console.log("iselement", item.type)
        console.log("item itself", item)
        let sourceEndpoints = [];
        let targetEndpoints = [];

        if (isProcedureItem(item)) {
            sourceEndpoints.push(addEndpoint(instance, element, { source: true, target: false }));
            targetEndpoints.push(addEndpoint(instance, element, { source: false, target: true }));
            console.debug("added Source and Target Endpoint to procedure");
        }
        else if (item.type === "recipe_element") {
            console.log("Adding endpoints to recipe_element:", item.id);

            const type = item.recipeElementType;

            // Add endpoints conditionally based on the element type
            if (type === "Condition" || type === "Implicit Transition") {
                // Transitions can have one input and one output
                sourceEndpoints.push(addEndpoint(instance, element, { source: true, target: false }));
                targetEndpoints.push(addEndpoint(instance, element, { source: false, target: true }));
                console.debug(`Added source and target endpoints to ${type}`);
            } else if (type === "Begin") {
                // Begin elements only have outputs
                sourceEndpoints.push(addEndpoint(instance, element, { source: true, target: false }));
                console.log(`Added source endpoint to ${type}`);
            } else if (type === "End") {
                // End elements only have inputs
                targetEndpoints.push(addEndpoint(instance, element, { source: false, target: true }));
                console.debug(`Added target endpoint to ${type}`);
            } else if (type === "Synchronization Point") {
                // Synchronization Point can have multiple inputs and outputs
                // Add multiple endpoints for multiple connections
                for (let i = 0; i < 4; i++) { // Allow up to 4 connections
                    sourceEndpoints.push(addEndpoint(instance, element, { source: true, target: false }));
                    targetEndpoints.push(addEndpoint(instance, element, { source: false, target: true }));
                }
                console.debug(`Added multiple endpoints to Synchronization Point`);
            } else if (type === "Synchronization Line" || type === "Synchronization Line Indicating Material Transfer") {
                // Synchronization Line can have multiple inputs and outputs
                // Add multiple endpoints for multiple connections
                for (let i = 0; i < 6; i++) { // Allow up to 6 connections for lines
                    sourceEndpoints.push(addEndpoint(instance, element, { source: true, target: false }));
                    targetEndpoints.push(addEndpoint(instance, element, { source: false, target: true }));
                }
                console.debug(`Added multiple endpoints to ${type}`);
            } else if (type === "Begin Simultaneous Sequence" || type === "End Simultaneous Sequence") {
                // Begin/End Simultaneous Sequence can have multiple connections
                for (let i = 0; i < 4; i++) { // Allow up to 4 connections
                    sourceEndpoints.push(addEndpoint(instance, element, { source: true, target: false }));
                    targetEndpoints.push(addEndpoint(instance, element, { source: false, target: true }));
                }
                console.debug(`Added multiple endpoints to ${type}`);
            } else if (type === "Begin Sequence Selection" || type === "End Sequence Selection") {
                // Begin/End Sequence Selection can have multiple connections
                for (let i = 0; i < 4; i++) { // Allow up to 4 connections
                    sourceEndpoints.push(addEndpoint(instance, element, { source: true, target: false }));
                    targetEndpoints.push(addEndpoint(instance, element, { source: false, target: true }));
                }
                console.debug(`Added multiple endpoints to ${type}`);
            } else {
                // Default: allow at least one input and one output for other recipe elements
                sourceEndpoints.push(addEndpoint(instance, element, { source: true, target: false }));
                targetEndpoints.push(addEndpoint(instance, element, { source: false, target: true }));
                console.debug(`Added default endpoints to ${type}`);
            }
        }
        item.sourceEndpoints = sourceEndpoints;
        item.targetEndpoints = targetEndpoints;
    }
}

function checkEndpoints(instance, elementRef, item) {
    //this function checks if the input/output endpoints of a given item are still correct and adds/deletes some if needed
    console.debug("check endpoints")
    if (item.type === "recipe_element") {
        console.debug("element is recipe_element")
        const type = item.recipeElementType;
        
        // Handle different recipe element types
        if (type === "Condition" || type === "Implicit Transition") {
            // Ensure transitions have exactly one input and one output
            if (item.sourceEndpoints.length === 0) {
                item.sourceEndpoints.push(addEndpoint(instance, elementRef, { source: true, target: false }))
            }
            if (item.targetEndpoints.length === 0) {
                item.targetEndpoints.push(addEndpoint(instance, elementRef, { source: false, target: true }))
            }
        } else if (type === "Begin") {
            // Begin elements only have outputs
            if (item.sourceEndpoints.length === 0) {
                item.sourceEndpoints.push(addEndpoint(instance, elementRef, { source: true, target: false }))
            }
            // Remove any target endpoints
            if (item.targetEndpoints.length !== 0) {
                for (let endpoint of item.targetEndpoints) {
                    deleteEndpoint(item, endpoint)
                }
                item.targetEndpoints = []
            }
        } else if (type === "End") {
            // End elements only have inputs
            if (item.targetEndpoints.length === 0) {
                item.targetEndpoints.push(addEndpoint(instance, elementRef, { source: false, target: true }))
            }
            // Remove any source endpoints
            if (item.sourceEndpoints.length !== 0) {
                for (let endpoint of item.sourceEndpoints) {
                    deleteEndpoint(item, endpoint)
                }
                item.sourceEndpoints = []
            }
        } else if (type === "Synchronization Point") {
            // Ensure Synchronization Point has multiple endpoints (up to 4)
            const maxEndpoints = 4;
            while (item.sourceEndpoints.length < maxEndpoints) {
                item.sourceEndpoints.push(addEndpoint(instance, elementRef, { source: true, target: false }))
            }
            while (item.targetEndpoints.length < maxEndpoints) {
                item.targetEndpoints.push(addEndpoint(instance, elementRef, { source: false, target: true }))
            }
        } else if (type === "Synchronization Line" || type === "Synchronization Line Indicating Material Transfer") {
            // Ensure Synchronization Line has multiple endpoints (up to 6)
            const maxEndpoints = 6;
            while (item.sourceEndpoints.length < maxEndpoints) {
                item.sourceEndpoints.push(addEndpoint(instance, elementRef, { source: true, target: false }))
            }
            while (item.targetEndpoints.length < maxEndpoints) {
                item.targetEndpoints.push(addEndpoint(instance, elementRef, { source: false, target: true }))
            }
        } else if (type === "Begin Simultaneous Sequence" || type === "End Simultaneous Sequence" || 
                   type === "Begin Sequence Selection" || type === "End Sequence Selection") {
            // Ensure sequence elements have multiple endpoints (up to 4)
            const maxEndpoints = 4;
            while (item.sourceEndpoints.length < maxEndpoints) {
                item.sourceEndpoints.push(addEndpoint(instance, elementRef, { source: true, target: false }))
            }
            while (item.targetEndpoints.length < maxEndpoints) {
                item.targetEndpoints.push(addEndpoint(instance, elementRef, { source: false, target: true }))
            }
        } else {
            // Default: ensure at least one input and one output
            if (item.sourceEndpoints.length === 0) {
                item.sourceEndpoints.push(addEndpoint(instance, elementRef, { source: true, target: false }))
            }
            if (item.targetEndpoints.length === 0) {
                item.targetEndpoints.push(addEndpoint(instance, elementRef, { source: false, target: true }))
            }
        }
    }
}

function createUpdateItemListHandler(instance, jsplumbElements, managedElements, layoutObserverRef) {
    return async (newItems) => {
        console.debug("workspace_items updated, watcher triggered");
        await nextTick(); //wait one tick otherwise the new workspace item is not yet in jsplumbElements
        await nextTick();

        // only handle elements that were added to the list (pushed), not removed ones (popped)
        const pushedItems = computedWorkspaceItems.value.filter((item) => newItems.includes(item));
        pushedItems.forEach((pushedItem) => {
            console.debug("New pushed element found:", pushedItem);
            // Handle the pop operation here
            const elementRef = jsplumbElements.value.find(
                (element) => element.id === pushedItem.id
            );
            if (!elementRef) {
                console.debug("pushed element not found in jsplumbelements:", pushedItem)
                return; // onoly returns the pushedItems.forEach function, effectively working as a continue
            }

            layoutObserverRef.observe(elementRef)
            if (managedElements.value[pushedItem.id] === true) {
                console.debug("pushed element already managed: ", pushedItem);
                checkEndpoints(instance.value, elementRef, pushedItem)
                layoutObserverRef.schedule(elementRef)
                return;
            }

            console.debug("changed element not managed yet, placing in workspace and adding endpoints:", pushedItem);
            elementRef.style.left = pushedItem.x + "px";
            elementRef.style.top = pushedItem.y + "px";
            addJsPlumbEndpoints(instance.value, elementRef, pushedItem);
            layoutObserverRef.schedule(elementRef)
            managedElements.value[pushedItem.id] = true;
        });
    };
}

function getItemSize(item) {
    if (item?.type === "recipe_element") {
        // recipe elements vary; use a safe default
        return { width: 200, height: 80 };
    }
    if (isProcedureItem(item)) {
        return { width: 200, height: 80 };
    }
    return { width: 200, height: 80 };
}

function updateWorkspaceBounds() {
    const container = workspaceContentRef.value?.parentElement;
    const minWidth = container?.clientWidth || 5000;
    const minHeight = container?.clientHeight || 5000;

    let maxRight = 0;
    let maxBottom = 0;
    const padding = 200;

    const items = computedWorkspaceItems.value || [];
    if (items.length === 0) {
        workspaceWidth.value = Math.max(initialWorkspaceWidth, minWidth);
        workspaceHeight.value = Math.max(initialWorkspaceHeight, minHeight);
        return;
    }

    for (const item of items) {
        if (typeof item?.x !== "number" || typeof item?.y !== "number") continue;
        const size = getItemSize(item);
        maxRight = Math.max(maxRight, item.x + size.width);
        maxBottom = Math.max(maxBottom, item.y + size.height);
    }

    workspaceWidth.value = Math.max(initialWorkspaceWidth, minWidth, maxRight + padding);
    workspaceHeight.value = Math.max(initialWorkspaceHeight, minHeight, maxBottom + padding);
}

let zoomincrement = 0.1
const zoomMin = 0.2
const zoomMax = 3
const lastMouse = ref({ x: NaN, y: NaN })

function updateMouse(event) {
    lastMouse.value = { x: event.clientX, y: event.clientY }
}

function clampZoom(value) {
    return Math.min(zoomMax, Math.max(zoomMin, value))
}

function applyZoom(newZoomLevel) {
    zoomLevel.value = clampZoom(newZoomLevel)
    if (workspaceContentRef.value) {
        workspaceContentRef.value.style.zoom = String(zoomLevel.value)
    }
    if (jsplumbInstance.value) {
        jsplumbInstance.value.setZoom(zoomLevel.value)
    }
}

function zoomAt(clientX, clientY, newZoomLevel) {
    const container = workspaceContentRef.value?.parentElement
    if (!container || !workspaceContentRef.value) {
        applyZoom(newZoomLevel)
        return
    }

    const rect = container.getBoundingClientRect()
    const x = clientX - rect.left + container.scrollLeft
    const y = clientY - rect.top + container.scrollTop
    const oldZoom = zoomLevel.value

    applyZoom(newZoomLevel)

    const scale = zoomLevel.value / oldZoom
    container.scrollLeft = x * scale - (clientX - rect.left)
    container.scrollTop = y * scale - (clientY - rect.top)
}

function onWheel(event) {
    const delta = event.deltaY < 0 ? zoomincrement : -zoomincrement
    zoomAt(event.clientX, event.clientY, zoomLevel.value + delta)
}

// Zoom in by incrementing the zoom level
function zoomIn() {
    const { x, y } = lastMouse.value
    if (Number.isFinite(x) && Number.isFinite(y)) {
        zoomAt(x, y, zoomLevel.value + zoomincrement)
    } else {
        applyZoom(zoomLevel.value + zoomincrement)
    }
}
// Zoom out by decrementing the zoom level
function zoomOut() {
    const { x, y } = lastMouse.value
    if (Number.isFinite(x) && Number.isFinite(y)) {
        zoomAt(x, y, zoomLevel.value - zoomincrement)
    } else {
        applyZoom(zoomLevel.value - zoomincrement)
    }
}

async function clearWorkspace() {
    jsplumbInstance.value.deleteEveryConnection();
    for (let item of computedWorkspaceItems.value) {
        const elementRef = jsplumbElements.value.find(
            (element) => element.id === item.id
        );
        if (elementRef !== undefined) {
            layoutObserver.unobserve(elementRef);
            jsplumbInstance.value.removeAllEndpoints(elementRef);
        }
    }
    //jsplumbElements.value=[]
    managedElements.value = {};
    while (computedWorkspaceItems.value.length > 0) { //simply setting to [] did not work
        console.debug("pop item out of computedWorkspaceItems")
        computedWorkspaceItems.value.pop();
    }
    await resetJsPlumb()
    console.log("deleted all Elements from secondary workspace")
}

// Deduplicate items by id before rendering and adding endpoints
function deduplicateItems(items) {
    const seen = new Set();
    return items.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });
}

async function addElements(list) {
    console.log('addElements received:', list.map(i => ({id: i.id, type: i.type})));
    const masterElements = list.filter(item => item.type === 'procedure' || item.type === 'recipe_element');
    const dedupedList = deduplicateItems(masterElements);
    console.log('dedupedList:', dedupedList.map(i => ({id: i.id, type: i.type})));
    for (let element of dedupedList) {
        if (!(computedWorkspaceItems.value.some(({ id }) => id === element.id))) { // Check if element already exists
            console.log("add element to second workspace programmatically: ", element);

            // Add the element to the workspace
            computedWorkspaceItems.value.push(element);

            // Wait for the DOM to update before applying positions
            await nextTick(); // Ensure the DOM elements are updated

            const elementRef = jsplumbElements.value.find(
                (elementRef) => elementRef.id === element.id
            );

            if (elementRef) {
                // Apply the x and y positions to the element immediately
                console.log("Applying positions for:", element.id, " x:", element.x, " y:", element.y);
                elementRef.style.left = `${element.x}px`;
                elementRef.style.top = `${element.y}px`;

                // Wait for the DOM to update before calling jsPlumb
                await nextTick(); // Wait until next DOM update

                // Add the necessary jsPlumb endpoints for this element
                await addJsPlumbEndpoints(jsplumbInstance.value, elementRef, element);
                layoutObserver.observe(elementRef);
                layoutObserver.schedule(elementRef);
            }
        }
    }

    // Repaint all jsPlumb elements and ensure positions are correct
    await nextTick(); // Ensure the DOM is updated before continuing
}

function deleteElement(item) {
    const elementRef = jsplumbElements.value.find(
        (element) => element.id === item.id
    );
    if (elementRef !== undefined) {
        layoutObserver.unobserve(elementRef);
        jsplumbInstance.value.removeAllEndpoints(elementRef);
        jsplumbInstance.value.deleteConnectionsForElement(elementRef)
        elementRef.remove();
    }
    
    // Clean up managed elements tracking
    if (managedElements.value[item.id]) {
        delete managedElements.value[item.id];
    }
    
    //search for item in also delete from workspaceitemslist
    let index = computedWorkspaceItems.value.findIndex(element => element.id === item.id);
    if (index !== -1) {
        computedWorkspaceItems.value.splice(index, 1);
    }
    
    // Save workspace state after deletion
    emit("saveWorkspace");
}
function deleteEndpoint(item, endpoint) {
    const elementRef = jsplumbElements.value.find(
        (element) => element.id === item.id
    );
    if (elementRef !== undefined) {
        jsplumbInstance.value.deleteEndpoint(endpoint);
    }
}

// In addConnections, only add if both source and target exist and have endpoints
function addConnections(connections) {
    for (let connectionId in connections) {
        let connection = connections[connectionId];
        let sourceId = connection.sourceId;
        let targetId = connection.targetId;
        const sourceElementRef = computedWorkspaceItems.value.find(
            (element) => element.id === sourceId
        );
        const targetElementRef = computedWorkspaceItems.value.find(
            (element) => element.id === targetId
        );
        if (!sourceElementRef || !targetElementRef) {
            console.warn("either sourceElement: ", sourceElementRef, " or targetElement:", targetElementRef, " is undefined");
            continue;
        }
        if (!sourceElementRef.sourceEndpoints || !targetElementRef.targetEndpoints) {
            console.warn("either sourceEndpoint: ", sourceElementRef.sourceEndpoints, " or targetEndpoint:", targetElementRef.targetEndpoints, " is undefined");
            continue;
        }
        nextTick();
        jsplumbInstance.value.connect({ source: sourceElementRef.sourceEndpoints[0], target: targetElementRef.targetEndpoints[0] });
    }
}
function createUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
function findNextAvailableId(nestedList, basename) {
    // Create an array to store existing IDs for the given basename
    const existingIds = [];

    // Recursive function to collect existing IDs
    function collectIds(list) {
        for (const item of list) {
            if (item.id.startsWith(basename)) {
                // Extract the number part of the ID and push it to the existingIds array
                const idNumber = parseInt(item.id.slice(basename.length), 10);
                if (!isNaN(idNumber)) {
                    existingIds.push(idNumber);
                }

            }
            if (item.processElement && item.processElement.length > 0) {
                // Recursively search in child items
                collectIds(item.processElement);
            }
            if (item.materials && item.materials.length > 0) {
                // Recursively search in child items
                collectIds(item.materials);
            }
        }
    }
    
    // Also check the current workspace items to avoid conflicts with deleted elements
    function collectWorkspaceIds() {
        for (const item of computedWorkspaceItems.value) {
            if (item.id.startsWith(basename)) {
                const idNumber = parseInt(item.id.slice(basename.length), 10);
                if (!isNaN(idNumber)) {
                    existingIds.push(idNumber);
                }
            }
        }
    }
    
    console.log("test1")
    // Call the recursive function to collect existing IDs from sidebar
    collectIds(nestedList);
    // Also collect IDs from current workspace to avoid conflicts
    collectWorkspaceIds();
    console.log("test2")

    console.log("existing ids:", existingIds)
    console.log("sidebar items checked:", nestedList.map(i => i.id))
    console.log("workspace items checked:", computedWorkspaceItems.value.map(i => i.id))

    // If no existing IDs found, create an initial element
    if (existingIds.length === 0) {
        const initialId = `${basename}001`;
        console.log(`No existing IDs found, using initial ID: ${initialId}`);
        return initialId;
    }

    console.log("test3")
    // Find the next available ID by incrementing the maximum existing ID by 1
    const maxId = Math.max(...existingIds, 0);
    const nextIdNumber = maxId + 1;

    // Format the next ID with leading zeros (e.g., "Begin003")
    const nextId = `${basename}${nextIdNumber.toString().padStart(3, '0')}`;
    console.log(`Generated next ID: ${nextId} (max existing: ${maxId}, next number: ${nextIdNumber})`);

    return nextId;
}

function getJsPlumbConnections() {
    return (jsplumbInstance.value?.getConnections?.() || []).map((connection) => ({
        sourceId: connection.sourceId,
        targetId: connection.targetId,
    }));
}

function exportWorkspace() {
    const exportResult = exportWorkspaceJson({
        items: computedWorkspaceItems.value,
        connections: getJsPlumbConnections(),
        mode: WorkspaceMode.MASTER,
    });
    downloadTextFile({
        filename: exportResult.filename,
        content: exportResult.content,
        mimeType: exportResult.mimeType,
    });
}

async function importWorkspace(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();

    // 1) Clear existing
    await clearWorkspace();

    const importResult = importWorkspaceFile({
        filename: file.name,
        content: text,
        mode: WorkspaceMode.MASTER,
    });
    if (importResult.warnings.length > 0) {
        importResult.warnings.forEach((warning) => console.warn(warning));
    }
    if (importResult.items.length === 0 && importResult.connections.length === 0) {
        return;
    }
    await addElements(importResult.items);
    await nextTick();
    addConnections(importResult.connections);
    emit('workspaceImported', {
        config: importResult.config || null,
        sourceType: importResult.sourceType,
        warnings: importResult.warnings || [],
    });
}



//expose this funciton so that i can be called from the Topbar export button
defineExpose({
    zoomIn,
    zoomOut,
    clearWorkspace,
    addElements,
    addConnections,
    deleteElement,
    createUniqueId,
    findNextAvailableId,
    exportWorkspace,
    importWorkspace,
    getWorkspaceItems: () => computedWorkspaceItems.value,
    getConnections: getJsPlumbConnections
});

// Add this function to map recipeElementType to the correct CSS class
function getRecipeElementClass(item) {
    if (item.type !== 'recipe_element') return '';
    const map = {
        'Begin': 'Begin',
        'End': 'End',
        'Allocation': 'Allocation',
        'Condition': 'Condition',
        'Begin and end Sequence Selection': 'BeginAndEndSequenceSelection',
        'Begin and end Simultaneous Sequence': 'BeginAndEndSimultaneousSequence',
        'Synchronization Point': 'SynchronizationPoint',
        'Synchronization Line': 'SynchronizationLine',
        'Synchronization Line indicating material transfer': 'SynchronizationLineIndicatingMaterialTransfer',
        // Add the following for master recipe elements:
        'Recipe Procedure containing a lower level PFC': 'RecipeProcedureContainingALowerLevelPFC',
        'Recipe Unit Procedure containing a lower level PFC': 'RecipeUnitProcedureContainingALowerLevelPFC',
        'Recipe Operation containing a lower level PFC': 'RecipeOperationContainingALowerLevelPFC',
        'Recipe Procedure that references an equipment procedure': 'RecipeProcedureThatReferencesEquipmentProcedure',
        'Recipe Unit Procedure that references an equipment unit procedure': 'RecipeUnitProcedureThatReferencesEquipmentUnitProcedure',
        'Recipe Operation that references an equipment operation': 'RecipeOperationThatReferencesEquipmentOperation',
        'Recipe Phase that references an equipment phase': 'RecipePhaseThatReferencesEquipmentPhase',
        'Directed Link': 'DirectedLink',
    };
    return map[item.recipeElementType] || 'RecipeElementFallback';
}

// Add this function to map processElementType to the correct CSS class for process elements
function isProcedureItem(item) {
    return item?.type === 'procedure';
}

function getProcedureClass(item) {
    if (!isProcedureItem(item)) return '';
    const map = {
        // Sidebar-imported master procedures should render like "Recipe Procedure"
        'MTP Operation': 'RecipeProcedureContainingALowerLevelPFC',
        'AAS Capability': 'RecipeProcedureContainingALowerLevelPFC',
        // For master recipe types, map to the same as recipe_element for visual consistency
        'Recipe Procedure Containing Lower Level PFC': 'RecipeProcedureContainingALowerLevelPFC',
        'Recipe Unit Procedure Containing Lower Level PFC': 'RecipeUnitProcedureContainingALowerLevelPFC',
        'Recipe Operation Containing Lower Level PFC': 'RecipeOperationContainingALowerLevelPFC',
        'Recipe Procedure Referencing Equipment Procedure': 'RecipeProcedureThatReferencesEquipmentProcedure',
        'Recipe Unit Procedure Referencing Equipment Unit Procedure': 'RecipeUnitProcedureThatReferencesEquipmentUnitProcedure',
        'Recipe Operation Referencing Equipment Operation': 'RecipeOperationThatReferencesEquipmentOperation',
        'Recipe Phase Referencing Equipment Phase': 'RecipePhaseThatReferencesEquipmentPhase',
    };
    // Try both original and no-case versions for robustness
    return map[item.processElementType] || map[item.processElementType?.replace(/\s+/g, ' ')] || 'RecipeProcedureContainingALowerLevelPFC';
}

function generateConditionText(item) {
  if (item.recipeElementType !== 'Condition') {
    return item.condition || 'Condition';
  }
  const conditionText = stringifyConditionGroup(item.conditionGroup, {
    quoteStepInstance: true,
    resolveStepLabel: (stepId) => {
      const targetItem = computedWorkspaceItems.value.find((candidate) => candidate.id === stepId);
      if (!targetItem) {
        return stepId;
      }
      if (Array.isArray(targetItem.description) && targetItem.description.length > 0) {
        return targetItem.description[0] || targetItem.name || targetItem.id;
      }
      return targetItem.name || targetItem.id;
    },
  });
  return conditionText || 'True';
}
</script>

<style>
.workspace_content {
    position: relative;
    transform-origin: 0 0;
    background-size: 50px 50px;
    background-image: radial-gradient(circle, #000 1px, rgba(0, 0, 0, 0) 1px);
    z-index: 1;
}

.workspace_content {
    cursor: grab;
}
.workspace-scroll.is-panning .workspace_content {
    cursor: grabbing;
}

.workspace_element {
    display: flex;
    position: absolute;
    text-align: center;
    align-items: center;
}


.Begin {
    position: relative;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 50px 50px 0 50px;
    border-color: white transparent transparent transparent;
}

.Begin::before {
    content: '';
    position: absolute;
    left: -60px;
    top: -54px;
    width: 0;
    z-index: -1;
    height: 0;
    border-style: solid;
    border-width: 60px 60px 0 60px;
    border-color: black transparent transparent transparent;
}

.End {
    position: relative;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 50px 50px 50px;
    border-color: transparent transparent white transparent;
}

.End::before {
    content: '';
    position: absolute;
    left: -60px;
    top: -6px;
    width: 0;
    z-index: -1;
    height: 0;
    border-style: solid;
    border-width: 0 60px 60px 60px;
    border-color: transparent transparent black transparent;
}

/* Allocation - oval */
.Allocation {
    width: 120px;
    height: 50px;
    background-color: white;
    border: 2px solid black;
    border-radius: 40px / 25px;
    /* oval shape */
    margin: 10px auto;
}

/* Recipe Procedure containing a lower level PFC (rectangle with two small angled corners top-left & bottom-right) */
.RecipeProcedureContainingALowerLevelPFC,
.RecipeUnitProcedureContainingALowerLevelPFC,
.RecipeOperationContainingALowerLevelPFC {
    --hype-half: 1px; /* 2px total line thickness */
    width: 300px;
    height: 120px;
    background: white;
    border: 2px solid black;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    margin: 10px auto;
    border-radius: 0px;
}

.RecipeProcedureContainingALowerLevelPFC::before,
.RecipeUnitProcedureContainingALowerLevelPFC::before,
.RecipeOperationContainingALowerLevelPFC::before {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    /*
    border-top: 20px solid black;
    border-right: 20px solid transparent;
    */
    width: 25px;
    height: 25px;
    background:
        linear-gradient(
            to bottom left,
            transparent calc(50% - var(--hype-half)),
            #000 calc(50% - var(--hype-half)) calc(50% + var(--hype-half)),
            transparent calc(50% + var(--hype-half))
        ),
        linear-gradient(#000, #000) top / 100% 0px no-repeat,
        linear-gradient(#000, #000) right / 0px 100% no-repeat;
    clip-path: polygon(100% 0, 0 0, 100% 100%);
}
/*
.RecipeProcedureContainingALowerLevelPFC::after,
.RecipeUnitProcedureContainingALowerLevelPFC::after,
.RecipeOperationContainingALowerLevelPFC::after {
    content: "";
    position: absolute;
    bottom: 0;
    right: 0;
    border-bottom: 20px solid black;
    border-left: 20px solid transparent;
}
*/
/* Recipe Procedure that references an equipment procedure (rectangle with small angled corner top-left) */
.RecipeProcedureThatReferencesEquipmentProcedure,
.RecipeUnitProcedureThatReferencesEquipmentUnitProcedure,
.RecipeOperationThatReferencesEquipmentOperation {
    width: 200px;
    height: 80px;
    background: white;
    border: 2px solid black;
    position: relative;
    margin: 10px auto;
    border-radius: 4px;
}

.RecipeProcedureThatReferencesEquipmentProcedure::before,
.RecipeUnitProcedureThatReferencesEquipmentUnitProcedure::before,
.RecipeOperationThatReferencesEquipmentOperation::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    border-top: 20px solid black;
    border-right: 20px solid transparent;
}

/* Recipe Phase that references an equipment phase - simple rectangle */
.RecipePhaseThatReferencesEquipmentPhase {
    width: 200px;
    height: 80px;
    background: white;
    border: 2px solid black;
    margin: 10px auto;
    border-radius: 4px;
}

/* Directed Link - vertical line */
.DirectedLink {
    width: 2px;
    height: 60px;
    background-color: black;
    margin: 10px auto;
}

.RecipeElementFallback {
    min-width: 100px;
    min-height: 20px;
    border: 1px solid black;
    background-color: white;
    border-radius: 5px;
    padding: 5px;
    display: flex;
    text-align: center;
}

/* Condition - two separate horizontal lines with 'Condition' text (handle text outside of CSS) */
.Condition {
    width: 200px;
    height: 12px;
    margin: 10px auto;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background-color: black;
}

.Condition::before {
    content: "";
    width: 100%;
    height: 2px;
    background-color: black;
    position: absolute;
    top: 0;
}

.Condition::after {
    content: "";
    width: 100%;
    height: 2px;
    background-color: black;
    position: absolute;
    bottom: 0;
}

/* Add a pseudo-element for the condition text */
.Condition .condition-text {
    position: absolute;
    top: 50%;
    left: 100%;
    transform: translateY(-50%);
    font-size: 12px;
    font-weight: bold;
    background: white;
    padding: 2px 6px;
    margin-left: 8px;
    white-space: nowrap;
    border: 1px solid #ccc;
    border-radius: 3px;
    z-index: 10;
}

/* Begin and end Sequence Selection - solid horizontal line */
.BeginAndEndSequenceSelection {
    width: 200px;
    height: 6px;
    background-color: black;
    margin: 10px auto;
}

/* Begin and end Simultaneous Sequence - double horizontal line */
.BeginAndEndSimultaneousSequence {
    width: 200px;
    height: 8px;
    border-top: 2px double black;
    margin: 10px auto;
}

/* Synchronization Point - small rectangle */
.SynchronizationPoint {
    width: 50px;
    height: 30px;
    border: 2px solid black;
    background-color: white;
    margin: 10px auto;
}

/* Synchronization Line - dashed horizontal line */
.SynchronizationLine {
    width: 200px;
    height: 4px;
    border-top: 2px dashed black;
    margin: 10px auto;
}

/* Synchronization Line indicating material transfer - dashed line with arrow */
/* Arrow is typically handled by jsPlumb, so only dashed line here */
.SynchronizationLineIndicatingMaterialTransfer {
    width: 200px;
    height: 4px;
    border-top: 2px dashed black;
    margin: 10px auto;
    position: relative;
}

/* Optional arrow styling (if you want a pure CSS arrow on right) */
.SynchronizationLineIndicatingMaterialTransfer::after {
    content: "";
    position: absolute;
    right: 0;
    top: -6px;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-left: 12px solid black;
}
</style>
