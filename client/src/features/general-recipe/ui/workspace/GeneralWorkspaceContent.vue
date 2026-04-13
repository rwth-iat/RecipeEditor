<template>
    <div class="workspace_content" ref="workspaceContentRef" :style="workspaceStyle" @drop="$event => onDrop($event)" @dragenter.prevent
        @dragover.prevent draggable="false" @wheel.prevent="onWheel" @mousemove="updateMouse" @mousedown="startPanning">
        <div :class="getWorkspaceElementHostClass(item)" v-for="item in computedWorkspaceItems" :key="item.id"
            :ref="skipUnwrap.jsplumbElements" :id="item.id" @click="handleClick(item)">
            <div v-if="isMaterialContainer(item)" class="flowChartLabel" style="float: right;">
                <span
                    v-for="(labelLine, index) in getMaterialLabelLines(item)"
                    :key="`${item.id}-label-${index}`"
                    :class="index === 0 ? 'flowChartLabelLine flowChartLabelHeading' : 'flowChartLabelLine'"
                >
                    {{ labelLine }}
                </span>
            </div>
            <div :class="getWorkspaceElementClass(item)">
                <span v-if="item.type === 'process'">
                    {{ item.id }}
                </span>
                <span v-else-if="item.procedureChartElementType === 'Annotation'" id="AnnotationSpan">
                    {{ item.description }}
                </span>
            </div>
            <div v-if="isMaterialContainer(item)" class="flowChartLabelSpacer">
                <span
                    v-for="(labelLine, index) in getMaterialLabelLines(item)"
                    :key="`${item.id}-spacer-${index}`"
                    :class="index === 0 ? 'flowChartLabelLine flowChartLabelHeading' : 'flowChartLabelLine'"
                >
                    {{ labelLine }}
                </span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, computed, watch, nextTick } from 'vue';
import { newInstance, ready, EVENT_DRAG_STOP } from "@jsplumb/browser-ui";
import { downloadTextFile } from "@/services/common/fileDownload";
import {
    WorkspaceMode,
    WorkspaceSourceType,
    exportWorkspaceJson,
    importWorkspaceFile,
} from "@/services/workspace";
import { buildGeneralWorkspaceHierarchy } from "@/services/workspace/mapping/generalWorkspaceHierarchy";
import { normalizeConnection } from "@/services/workspace/core/connectionUtils";
import { createDefaultDotEndpointDefinition } from "@/services/workspace/core/jsPlumbEndpointUtils";
import { createJsPlumbElementLayoutObserver } from "@/services/workspace/core/jsPlumbLayoutObserverUtils";
import { reconcileMaterialEndpoints } from "@/services/workspace/core/generalMaterialEndpointUtils";
import {
    ensureParallelIndicatorDefaults,
    getParallelBranchCount,
    getParallelBranchPortId,
    getParallelFixedSourcePortId,
    getParallelFixedTargetPortId,
    isParallelIndicatorItem,
    isParallelIndicatorType,
    isParallelSplitType,
    PARALLEL_INDICATOR_HEIGHT,
    PARALLEL_INDICATOR_MARGIN,
    PARALLEL_INDICATOR_WIDTH,
} from "@/services/workspace/core/generalParallelIndicatorUtils";
import {
    MATERIAL_CONTAINER_TYPE,
    createMaterialContainerItem,
    getContainerMaterials,
    isMaterialContainerItem,
    normalizeMaterialContainer,
} from "@/services/recipe/general-recipe/materials/materialContainerUtils";

const props = defineProps({
    main_workspace_items: Array,
    workspace_items: Array,
});

const emit = defineEmits(['changeSelectedElement', 'openPropertyWindow', 'update:workspace_items', 'saveWorkspace']);
const workspaceContentRef = ref(null);
const jsplumbInstance = ref(null);
const jsplumbElements = ref([]);
const managedElements = ref({});
const layoutObserver = createJsPlumbElementLayoutObserver({
    getInstance: () => jsplumbInstance.value,
});
const zoomLevel = ref(1);
const initialWorkspaceWidth = 10000;
const initialWorkspaceHeight = 10000;
const workspaceWidth = ref(initialWorkspaceWidth);
const workspaceHeight = ref(initialWorkspaceHeight);
const workspaceStyle = computed(() => ({
    width: `${workspaceWidth.value}px`,
    height: `${workspaceHeight.value}px`
}));
const NEXT_OPERATION_INDICATOR_WIDTH = 80;
const NEXT_OPERATION_INDICATOR_HEIGHT = 60;
const PARALLEL_INDICATOR_LINE_ANCHOR_OFFSET = 12;

let skipUnwrap = { jsplumbElements };

onMounted(async () => {
    workspaceContentRef.value?.focus?.();

    if (!workspaceContentRef.value) {
        return;
    }

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

        watch(computedWorkspaceItems, createUpdateItemListHandler(jsplumbInstance, jsplumbElements, managedElements, layoutObserver), { deep: true });
        watch(
            () => getMaterialTypeSignatures(computedWorkspaceItems.value),
            syncMaterialTypeChanges,
            { flush: 'post' }
        );
        watch(
            () => getParallelIndicatorSignatures(computedWorkspaceItems.value),
            syncParallelIndicatorChanges,
            { flush: 'post' }
        );
        watch(computedWorkspaceItems, updateWorkspaceBounds, { deep: true, immediate: true });
    });
});

onBeforeUnmount(() => {
    stopPanning();
    layoutObserver.disconnect();
});

const computedWorkspaceItems = computed({
    get: () => props.workspace_items,
    set: (newValue) => {
        emit('update:workspace_items', newValue);
    },
});

const lastClickTime = ref(0);
const doubleClickThreshold = 300;
const handleClick = (item) => {
    const currentTime = new Date().getTime();
    if (currentTime - lastClickTime.value < doubleClickThreshold) {
        handleDoubleClick(item);
    } else {
        lastClickTime.value = currentTime;
    }
};
const handleDoubleClick = (item) => {
    emit('changeSelectedElement', item);
    emit('openPropertyWindow');
};

let panning = false;
let panStartX = 0;
let panStartY = 0;
let panStartScrollLeft = 0;
let panStartScrollTop = 0;

const startPanning = (event) => {
    if (event.button !== 0) return;
    if (!event.target.classList.contains('workspace_content')) return;
    const container = workspaceContentRef.value?.parentElement;
    if (!container) return;
    event.preventDefault();
    panning = true;
    panStartX = event.clientX;
    panStartY = event.clientY;
    panStartScrollLeft = container.scrollLeft;
    panStartScrollTop = container.scrollTop;
    container.classList.add('is-panning');
    window.addEventListener('mousemove', handlePanning);
    window.addEventListener('mouseup', stopPanning);
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
    if (container) container.classList.remove('is-panning');
    window.removeEventListener('mousemove', handlePanning);
    window.removeEventListener('mouseup', stopPanning);
};

function normalizeDroppedMaterialType(item) {
    if (item?.materialElementType === 'Input' || item?.name === 'Educt') {
        return 'Input';
    }
    if (item?.materialElementType === 'Intermediate' || item?.name === 'Intermediate') {
        return 'Intermediate';
    }
    if (item?.materialElementType === 'Output' || item?.name === 'Product') {
        return 'Output';
    }
    return 'Input';
}

function isNextOperationIndicatorItem(item) {
    return item?.type === 'chart_element' && item?.procedureChartElementType === 'Next Operation Indicator';
}

function onDrop(event) {
    event.preventDefault();

    const droppedItem = JSON.parse(event.dataTransfer.getData('item'));
    const classes = event.dataTransfer.getData('itemClasses');

    let type;
    let xOffset;
    let materialType;
    if (classes.includes('material_element')) {
        type = MATERIAL_CONTAINER_TYPE;
        materialType = normalizeDroppedMaterialType(droppedItem);
        xOffset = 200;
    } else if (classes.includes('process_element')) {
        type = 'process';
        xOffset = 100;
    } else if (classes.includes('chart_element')) {
        type = 'chart_element';
        if (isParallelIndicatorType(droppedItem?.procedureChartElementType)) {
            xOffset = PARALLEL_INDICATOR_WIDTH / 2;
        } else if (droppedItem?.procedureChartElementType === 'Next Operation Indicator') {
            xOffset = NEXT_OPERATION_INDICATOR_WIDTH / 2;
        } else {
            xOffset = 100;
        }
    } else {
        console.error('neither material nor process dropped into workspace');
        return;
    }

    const rect = event.target.getBoundingClientRect();
    const zoom = zoomLevel.value || 1;
    const x = (event.clientX - rect.left) / zoom - xOffset;
    const y = (event.clientY - rect.top) / zoom;

    if (!classes.includes('sidebar_element')) {
        return;
    }

    let uniqueId = findNextAvailableId(props.main_workspace_items, droppedItem.name);
    while (computedWorkspaceItems.value.some(existingItem => existingItem.id === uniqueId)) {
        const baseName = droppedItem.name;
        const currentNumber = parseInt(uniqueId.slice(baseName.length), 10);
        const nextNumber = currentNumber + 1;
        uniqueId = `${baseName}${nextNumber.toString().padStart(3, '0')}`;
    }

    let item;
    if (type === MATERIAL_CONTAINER_TYPE) {
        item = createMaterialContainerItem({
            id: uniqueId,
            description: droppedItem.name,
            materialType,
            x,
            y,
            materials: [
                {
                    id: `${uniqueId}Material001`,
                    description: droppedItem.name,
                    materialID: '',
                    order: '',
                    amount: {},
                    materialSpecificationProperty: [],
                },
            ],
        });
    } else {
        item = ensureParallelIndicatorDefaults({
            ...droppedItem,
            x,
            y,
            type,
            description: droppedItem.name,
            id: uniqueId,
            amount: {},
            procedureChartElementType: droppedItem.procedureChartElementType || '',
            processElementType: droppedItem.processElementType || '',
        });
    }

    computedWorkspaceItems.value.push(item);
    emit('saveWorkspace');
}

function initializeJsPlumb(container) {
    const instance = newInstance({
        container: container.value,
        maxConnections: -1,
        connectionOverlays: [{ type: 'Arrow', options: { location: 1 } }],
        connector: 'Flowchart'
    });
    container.value.style.zoom = '1';
    instance.setZoom(1);
    return instance;
}

async function resetJsPlumb() {
    jsplumbInstance.value.reset();
}

function addEndpoint(instance, element, options) {
    let anchor = options.anchor;
    if (!anchor) {
        if (options.source) {
            anchor = 'Bottom';
        } else if (options.target) {
            anchor = 'Top';
        }
    }

    return instance.addEndpoint(element, {
        source: options.source,
        target: options.target,
        anchor,
        ...createDefaultDotEndpointDefinition(),
        maxConnections: options.maxConnections ?? -1,
        portId: options.portId,
        uuid: options.uuid,
    });
}

function addJsPlumbEndpoints(instance, element, item) {
    if (!element || !instance) {
        return;
    }

    initializeEndpointCollections(item);

    if (isMaterialContainer(item)) {
        syncMaterialEndpoints(instance, element, item);
        return;
    }

    if (item.type === 'process') {
        registerSourceEndpoint(item, addEndpoint(instance, element, { source: true, target: false }));
        registerTargetEndpoint(item, addEndpoint(instance, element, { source: false, target: true }));
    } else if (item.type === 'chart_element') {
        if (item.procedureChartElementType === 'Previous Operation Indicator') {
            registerSourceEndpoint(item, addEndpoint(instance, element, { source: true, target: false }));
        } else if (item.procedureChartElementType === 'Next Operation Indicator') {
            registerTargetEndpoint(item, addEndpoint(instance, element, { source: false, target: true }));
        } else if (isParallelIndicatorItem(item)) {
            addParallelIndicatorEndpoints(instance, element, item);
        } else {
            registerSourceEndpoint(item, addEndpoint(instance, element, { source: true, target: false }));
            registerTargetEndpoint(item, addEndpoint(instance, element, { source: false, target: true }));
        }
    }
}

function syncMaterialEndpoints(instance, elementRef, item) {
    if (!instance || !elementRef || !isMaterialContainer(item)) {
        return;
    }

    const { changed, desired } = reconcileMaterialEndpoints({
        item,
        createSourceEndpoint: () => addEndpoint(instance, elementRef, { source: true, target: false }),
        createTargetEndpoint: () => addEndpoint(instance, elementRef, { source: false, target: true }),
        deleteEndpoint: (endpoint) => deleteEndpoint(item, endpoint),
    });

    if (desired.source === 0 && desired.target === 0 && item.materialType) {
        console.warn('unknown material type:', item.materialType);
    }

    if (changed) {
        instance.revalidate?.(elementRef);
        instance.repaintEverything?.();
        layoutObserver.schedule(elementRef);
    }
}

function getMaterialTypeSignatures(items) {
    return (items || [])
        .filter((item) => isMaterialContainer(item))
        .map((item) => `${item.id}::${item.materialType || ''}`);
}

async function syncMaterialTypeChanges(newSignatures, oldSignatures = []) {
    if (!jsplumbInstance.value || oldSignatures.length === 0) {
        return;
    }

    const previousTypes = new Map(
        oldSignatures.map((signature) => {
            const separatorIndex = signature.indexOf('::');
            return [
                signature.slice(0, separatorIndex),
                signature.slice(separatorIndex + 2),
            ];
        })
    );

    await nextTick();

    computedWorkspaceItems.value
        .filter((item) => isMaterialContainer(item))
        .forEach((item) => {
            const previousType = previousTypes.get(item.id);
            const currentType = item.materialType || '';
            if (previousType === undefined || previousType === currentType) {
                return;
            }

            const elementRef = jsplumbElements.value.find(
                (element) => element.id === item.id
            );
            if (!elementRef) {
                return;
            }

            syncMaterialEndpoints(jsplumbInstance.value, elementRef, item);
        });
}

function getParallelIndicatorSignatures(items) {
    return (items || [])
        .filter((item) => isParallelIndicatorItem(item))
        .map((item) => `${item.id}::${getParallelBranchCount(item)}`);
}

async function syncParallelIndicatorChanges(newSignatures, oldSignatures = []) {
    if (!jsplumbInstance.value || oldSignatures.length === 0) {
        return;
    }

    const previousCounts = new Map(
        oldSignatures.map((signature) => {
            const separatorIndex = signature.indexOf('::');
            return [
                signature.slice(0, separatorIndex),
                Number.parseInt(signature.slice(separatorIndex + 2), 10),
            ];
        })
    );

    await nextTick();

    computedWorkspaceItems.value
        .filter((item) => isParallelIndicatorItem(item))
        .forEach((item) => {
            const previousCount = previousCounts.get(item.id);
            const currentCount = getParallelBranchCount(item);
            if (previousCount === undefined || previousCount === currentCount) {
                return;
            }

            rebuildParallelIndicatorEndpoints(item);
        });
}

function initializeEndpointCollections(item) {
    item.sourceEndpoints = [];
    item.targetEndpoints = [];
    item.sourceEndpointMap = {};
    item.targetEndpointMap = {};
}

function registerSourceEndpoint(item, endpoint) {
    item.sourceEndpoints.push(endpoint);
    if (endpoint?.portId) {
        item.sourceEndpointMap[endpoint.portId] = endpoint;
    }
}

function registerTargetEndpoint(item, endpoint) {
    item.targetEndpoints.push(endpoint);
    if (endpoint?.portId) {
        item.targetEndpointMap[endpoint.portId] = endpoint;
    }
}

function createParallelAnchor(x, y) {
    return [x, y, 0, y === 0 ? -1 : 1, 0, y === 0 ? PARALLEL_INDICATOR_LINE_ANCHOR_OFFSET : -PARALLEL_INDICATOR_LINE_ANCHOR_OFFSET];
}

function getParallelBranchAnchorX(index, branchCount) {
    if (branchCount <= 1) {
        return 0.5;
    }

    const availableWidth = PARALLEL_INDICATOR_WIDTH - (PARALLEL_INDICATOR_MARGIN * 2);
    const branchOffset = ((index - 1) * availableWidth) / (branchCount - 1);
    return (PARALLEL_INDICATOR_MARGIN + branchOffset) / PARALLEL_INDICATOR_WIDTH;
}

function createEndpointUuid(itemId, portId) {
    return `${itemId}:${portId}`;
}

function addParallelIndicatorEndpoints(instance, element, item) {
    const itemType = item.procedureChartElementType;
    const branchCount = getParallelBranchCount(item);

    if (isParallelSplitType(itemType)) {
        const targetPortId = getParallelFixedTargetPortId(itemType);
        registerTargetEndpoint(
            item,
            addEndpoint(instance, element, {
                source: false,
                target: true,
                anchor: createParallelAnchor(0.5, 0),
                maxConnections: 1,
                portId: targetPortId,
                uuid: createEndpointUuid(item.id, targetPortId),
            })
        );

        for (let index = 1; index <= branchCount; index += 1) {
            const portId = getParallelBranchPortId(itemType, index);
            registerSourceEndpoint(
                item,
                addEndpoint(instance, element, {
                    source: true,
                    target: false,
                    anchor: createParallelAnchor(getParallelBranchAnchorX(index, branchCount), 1),
                    maxConnections: 1,
                    portId,
                    uuid: createEndpointUuid(item.id, portId),
                })
            );
        }
        return;
    }

    const sourcePortId = getParallelFixedSourcePortId(itemType);
    registerSourceEndpoint(
        item,
        addEndpoint(instance, element, {
            source: true,
            target: false,
            anchor: createParallelAnchor(0.5, 1),
            maxConnections: 1,
            portId: sourcePortId,
            uuid: createEndpointUuid(item.id, sourcePortId),
        })
    );

    for (let index = 1; index <= branchCount; index += 1) {
        const portId = getParallelBranchPortId(itemType, index);
        registerTargetEndpoint(
            item,
            addEndpoint(instance, element, {
                source: false,
                target: true,
                anchor: createParallelAnchor(getParallelBranchAnchorX(index, branchCount), 0),
                maxConnections: 1,
                portId,
                uuid: createEndpointUuid(item.id, portId),
            })
        );
    }
}

function getStoredConnectionsForItem(itemId) {
    return getJsPlumbConnections().filter(
        (connection) => connection.sourceId === itemId || connection.targetId === itemId
    );
}

function getEndpointForConnection(item, connection, side) {
    const endpointPortId = side === 'source' ? connection?.sourcePortId : connection?.targetPortId;
    const endpointMap = side === 'source' ? item?.sourceEndpointMap : item?.targetEndpointMap;
    const endpoints = side === 'source' ? item?.sourceEndpoints : item?.targetEndpoints;

    if (endpointPortId && endpointMap?.[endpointPortId]) {
        return endpointMap[endpointPortId];
    }

    return endpoints?.[0];
}

function rebuildParallelIndicatorEndpoints(item) {
    if (!jsplumbInstance.value || !isParallelIndicatorItem(item)) {
        return;
    }

    const elementRef = jsplumbElements.value.find(
        (element) => element.id === item.id
    );
    if (!elementRef) {
        return;
    }

    const connectionsToRestore = getStoredConnectionsForItem(item.id);
    jsplumbInstance.value.deleteConnectionsForElement(elementRef);
    jsplumbInstance.value.removeAllEndpoints(elementRef);
    addJsPlumbEndpoints(jsplumbInstance.value, elementRef, item);
    layoutObserver.observe(elementRef);
    jsplumbInstance.value.revalidate?.(elementRef);

    connectionsToRestore.forEach((connection) => {
        connectWorkspaceConnection(connection);
    });

    jsplumbInstance.value.repaintEverything?.();
}

function createUpdateItemListHandler(instance, jsplumbElementsRef, managedElementsRef, layoutObserverRef) {
    return async () => {
        await nextTick();
        await nextTick();

        if (!instance.value) {
            return;
        }

        computedWorkspaceItems.value.forEach((item) => {
            const elementRef = jsplumbElementsRef.value.find(
                (element) => element.id === item.id
            );
            if (!elementRef || managedElementsRef.value[item.id] === true) {
                if (elementRef) {
                    layoutObserverRef.observe(elementRef);
                }
                return;
            }

            layoutObserverRef.observe(elementRef);
            elementRef.style.left = `${item.x}px`;
            elementRef.style.top = `${item.y}px`;
            addJsPlumbEndpoints(instance.value, elementRef, item);
            layoutObserverRef.schedule(elementRef);
            managedElementsRef.value[item.id] = true;
        });
    };
}

function getItemSize(item) {
    if (isMaterialContainer(item)) {
        return { width: 50, height: 50 };
    }
    if (item?.type === 'chart_element') {
        if (isParallelIndicatorItem(item)) {
            return { width: PARALLEL_INDICATOR_WIDTH, height: PARALLEL_INDICATOR_HEIGHT };
        }
        if (isNextOperationIndicatorItem(item)) {
            return { width: NEXT_OPERATION_INDICATOR_WIDTH, height: NEXT_OPERATION_INDICATOR_HEIGHT };
        }
        return { width: 200, height: 80 };
    }
    if (item?.type === 'process') {
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
        if (typeof item?.x !== 'number' || typeof item?.y !== 'number') continue;
        const size = getItemSize(item);
        maxRight = Math.max(maxRight, item.x + size.width);
        maxBottom = Math.max(maxBottom, item.y + size.height);
    }

    workspaceWidth.value = Math.max(initialWorkspaceWidth, minWidth, maxRight + padding);
    workspaceHeight.value = Math.max(initialWorkspaceHeight, minHeight, maxBottom + padding);
}

let zoomincrement = 0.1;
const zoomMin = 0.2;
const zoomMax = 3;
const lastMouse = ref({ x: NaN, y: NaN });

function updateMouse(event) {
    lastMouse.value = { x: event.clientX, y: event.clientY };
}

function clampZoom(value) {
    return Math.min(zoomMax, Math.max(zoomMin, value));
}

function applyZoom(newZoomLevel) {
    zoomLevel.value = clampZoom(newZoomLevel);
    if (workspaceContentRef.value) {
        workspaceContentRef.value.style.zoom = String(zoomLevel.value);
    }
    if (jsplumbInstance.value) {
        jsplumbInstance.value.setZoom(zoomLevel.value);
    }
}

function zoomAt(clientX, clientY, newZoomLevel) {
    const container = workspaceContentRef.value?.parentElement;
    if (!container || !workspaceContentRef.value) {
        applyZoom(newZoomLevel);
        return;
    }

    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left + container.scrollLeft;
    const y = clientY - rect.top + container.scrollTop;
    const oldZoom = zoomLevel.value;

    applyZoom(newZoomLevel);

    const scale = zoomLevel.value / oldZoom;
    container.scrollLeft = x * scale - (clientX - rect.left);
    container.scrollTop = y * scale - (clientY - rect.top);
}

function onWheel(event) {
    const delta = event.deltaY < 0 ? zoomincrement : -zoomincrement;
    zoomAt(event.clientX, event.clientY, zoomLevel.value + delta);
}

function zoomIn() {
    const { x, y } = lastMouse.value;
    if (Number.isFinite(x) && Number.isFinite(y)) {
        zoomAt(x, y, zoomLevel.value + zoomincrement);
    } else {
        applyZoom(zoomLevel.value + zoomincrement);
    }
}

function zoomOut() {
    const { x, y } = lastMouse.value;
    if (Number.isFinite(x) && Number.isFinite(y)) {
        zoomAt(x, y, zoomLevel.value - zoomincrement);
    } else {
        applyZoom(zoomLevel.value - zoomincrement);
    }
}

async function clearWorkspace() {
    jsplumbInstance.value?.deleteEveryConnection();
    for (const item of computedWorkspaceItems.value) {
        const elementRef = jsplumbElements.value.find(
            (element) => element.id === item.id
        );
        if (elementRef !== undefined) {
            layoutObserver.unobserve(elementRef);
            jsplumbInstance.value?.removeAllEndpoints(elementRef);
        }
    }
    managedElements.value = {};
    while (computedWorkspaceItems.value.length > 0) {
        computedWorkspaceItems.value.pop();
    }
    await resetJsPlumb();
}

function deduplicateItems(items) {
    const seen = new Set();
    return items.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });
}

function normalizeWorkspaceElement(item) {
    if (isMaterialContainer(item) || item?.type === 'material') {
        return normalizeMaterialContainer(item);
    }
    const normalizedItem = ensureParallelIndicatorDefaults(item);
    if (normalizedItem?.type !== 'process') {
        return normalizedItem;
    }

    return {
        ...normalizedItem,
        materials: Array.isArray(normalizedItem?.materials)
            ? normalizedItem.materials.map((child) => normalizeWorkspaceElement(child))
            : normalizedItem?.materials,
        procedureChartElement: Array.isArray(normalizedItem?.procedureChartElement)
            ? normalizedItem.procedureChartElement.map((child) => normalizeWorkspaceElement(child))
            : normalizedItem?.procedureChartElement,
        processElement: Array.isArray(normalizedItem?.processElement)
            ? normalizedItem.processElement.map((child) => normalizeWorkspaceElement(child))
            : normalizedItem?.processElement,
    };
}

async function addElements(list) {
    const dedupedList = deduplicateItems((Array.isArray(list) ? list : []).map(normalizeWorkspaceElement).filter(Boolean));
    for (const element of dedupedList) {
        if (isMaterialContainer(element) && !element.materialType) {
            console.warn('Material container imported without explicit materialType:', element.id);
        }

        if (computedWorkspaceItems.value.some(({ id }) => id === element.id)) {
            continue;
        }

        computedWorkspaceItems.value.push(element);
        await nextTick();

        const elementRef = jsplumbElements.value.find(
            (elementRef) => elementRef.id === element.id
        );

        if (elementRef) {
            elementRef.style.left = `${element.x}px`;
            elementRef.style.top = `${element.y}px`;
            await nextTick();
            await addJsPlumbEndpoints(jsplumbInstance.value, elementRef, element);
            layoutObserver.observe(elementRef);
            layoutObserver.schedule(elementRef);
            managedElements.value[element.id] = true;
        }
    }
    await nextTick();
}

function deleteElement(item) {
    const elementRef = jsplumbElements.value.find(
        (element) => element.id === item.id
    );
    if (elementRef !== undefined) {
        layoutObserver.unobserve(elementRef);
        jsplumbInstance.value?.unmanage?.(elementRef, false);
    }

    if (managedElements.value[item.id]) {
        delete managedElements.value[item.id];
    }

    const index = computedWorkspaceItems.value.findIndex(element => element.id === item.id);
    if (index !== -1) {
        computedWorkspaceItems.value.splice(index, 1);
    }

    emit('saveWorkspace');
}

function deleteEndpoint(item, endpoint) {
    const elementRef = jsplumbElements.value.find(
        (element) => element.id === item.id
    );
    if (elementRef !== undefined) {
        jsplumbInstance.value.deleteEndpoint(endpoint);
    }
}

function addConnections(connections) {
    for (const connection of connections || []) {
        connectWorkspaceConnection(connection);
    }
}

function connectWorkspaceConnection(connection) {
    const normalizedConnection = normalizeConnection(connection);
    const sourceElementRef = computedWorkspaceItems.value.find(
        (element) => element.id === normalizedConnection.sourceId
    );
    const targetElementRef = computedWorkspaceItems.value.find(
        (element) => element.id === normalizedConnection.targetId
    );
    if (!sourceElementRef || !targetElementRef) {
        console.warn('either sourceElement or targetElement is undefined', normalizedConnection);
        return;
    }

    const sourceEndpoint = getEndpointForConnection(sourceElementRef, normalizedConnection, 'source');
    const targetEndpoint = getEndpointForConnection(targetElementRef, normalizedConnection, 'target');

    if (!sourceEndpoint || !targetEndpoint) {
        console.warn('Skipping connection due to missing endpoints:', normalizedConnection);
        return;
    }

    jsplumbInstance.value.connect({
        source: sourceEndpoint,
        target: targetEndpoint
    });
}

function createUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function findNextAvailableId(nestedList, basename) {
    const existingIds = [];

    function collectIds(list) {
        for (const item of list || []) {
            if (item?.id?.startsWith?.(basename)) {
                const idNumber = parseInt(item.id.slice(basename.length), 10);
                if (!isNaN(idNumber)) {
                    existingIds.push(idNumber);
                }
            }
            if (item.processElement && item.processElement.length > 0) {
                collectIds(item.processElement);
            }
            if (item.materials && item.materials.length > 0 && item.type === 'process') {
                collectIds(item.materials);
            }
        }
    }

    function collectWorkspaceIds() {
        for (const item of computedWorkspaceItems.value) {
            if (item?.id?.startsWith?.(basename)) {
                const idNumber = parseInt(item.id.slice(basename.length), 10);
                if (!isNaN(idNumber)) {
                    existingIds.push(idNumber);
                }
            }
        }
    }

    collectIds(nestedList);
    collectWorkspaceIds();

    if (existingIds.length === 0) {
        return `${basename}001`;
    }

    const maxId = Math.max(...existingIds, 0);
    const nextIdNumber = maxId + 1;
    return `${basename}${nextIdNumber.toString().padStart(3, '0')}`;
}

function getJsPlumbConnections() {
    return (jsplumbInstance.value?.getConnections?.() || []).map((connection) =>
        normalizeConnection({
            sourceId: connection.sourceId,
            targetId: connection.targetId,
            sourcePortId: connection.endpoints?.[0]?.portId,
            targetPortId: connection.endpoints?.[1]?.portId,
        })
    );
}

function exportWorkspace() {
    const exportResult = exportWorkspaceJson({
        items: computedWorkspaceItems.value,
        connections: getJsPlumbConnections(),
        mode: WorkspaceMode.GENERAL,
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

    await clearWorkspace();

    const importResult = importWorkspaceFile({
        filename: file.name,
        content: text,
        mode: WorkspaceMode.GENERAL,
    });
    if (importResult.warnings.length > 0) {
        importResult.warnings.forEach((warning) => console.warn(warning));
    }
    const hierarchicalImport =
        importResult.sourceType === WorkspaceSourceType.XML
            ? buildGeneralWorkspaceHierarchy(importResult.items, importResult.connections)
            : importResult;

    if (hierarchicalImport.items.length === 0 && hierarchicalImport.connections.length === 0) {
        return;
    }
    await addElements(hierarchicalImport.items);
    await nextTick();
    addConnections(hierarchicalImport.connections);
}

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

function isMaterialContainer(item) {
    return isMaterialContainerItem(item);
}

function toCssToken(value) {
    return (value || '').toString().replace(/\s+/g, '');
}

function getWorkspaceElementClass(item) {
    return [
        isMaterialContainer(item) ? 'material' : item?.type || '',
        item?.type || '',
        isParallelIndicatorItem(item) ? 'parallel_indicator' : '',
        item?.materialType || '',
        toCssToken(item?.processElementType),
        toCssToken(item?.procedureChartElementType)
    ].filter(Boolean).join(' ');
}

function getWorkspaceElementHostClass(item) {
    return [
        'workspace_element',
        isNextOperationIndicatorItem(item) ? 'next_operation_indicator_host' : '',
    ].filter(Boolean).join(' ');
}

function getMaterialLabelLines(item) {
    const materials = getContainerMaterials(item);
    const containerId = item?.id || '';

    if (materials.length === 0) {
        return [containerId];
    }

    return [
        containerId,
        ...materials.map((material) => {
            const materialElementId = material?.id || '';
            const materialID = material?.materialID || '';
            const valueString = material?.amount?.valueString || '';
            return `${materialElementId} ${materialID} = ${valueString}`.replace(/\s+/g, ' ').trim();
        }),
    ];
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

.next_operation_indicator_host {
    width: 80px;
    height: 60px;
    justify-content: center;
    align-items: flex-start;
    overflow: visible;
}

/*
################## here is the visual appearance of the material elements defined ############################
    the process visual is the normal process element and sets a normal border
    -all materials are circles
    -inputs have two borders realized by border shadow
    -intermediates have one thin border
    -outputs have one thick border
    
    label
    -on the left there is a label with a rectangular border
    -we put the same on the right but invisible(spacer) so that the jsplumb endpoint is still at the material circle
*/
.material {
    text-align: center;
    /* Centers the content horizontally */
    background-color: white;
    height: 50px;
    width: 50px;
    border-radius: 50%;
    -moz-border-radius: 50%;
    -webkit-border-radius: 50%;
}

.Input {
    border: 1px solid black;
    box-shadow: inset 0 0 0 1px black, inset 0 0 0 5px white, inset 0 0 0 7px black;
}

.Output {
    border: 5px solid black;
}

.Intermediate {
    border: 1px solid black;
}

.flowChartLabel {
    border: 1px solid black;
    background-color: white;
    border-radius: 5px;
    padding: 5px;
    display: flex;
    flex-direction: column;
    text-align: center;
}

.flowChartLabelSpacer {
    color: transparent;
    /*this label is only for centering the material therefore text_color white*/
    padding: 6px;
    display: flex;
    flex-direction: column;
    text-align: center;
}

.flowChartLabelLine {
    display: block;
}

.flowChartLabelHeading {
    font-size: 0.9em;
    font-weight: 700;
    text-decoration: underline;
    text-align: left;
    margin-bottom: 0.3em;
}


/*
################## here is the visual appearance of the process element defined ############################
    the process visual is the normal process element and sets a normal border
    with the ::before and :: after we are able to set the other two horizontal lines
*/
.process {
    display: flex;
    text-align: center;
    align-items: center;
    justify-content: center;
    background-color: #fff;
    width: 200px;
    height: 80px;
    border-width: 1px;
    border-style: solid;
    border-color: black;
}

.process::before,
.process::after {
    content: "";
    position: absolute;
    width: 100%;
    height: 1px;
    /* Adjust the thickness of the lines */
    background-color: #000;
    /* Line color */
}

.process::before {
    top: 0;
    margin-top: 10px;
    /* Adjust as needed */
}

.process::after {
    bottom: 0;
    margin-bottom: 10px;
    /* Adjust as needed */
}

.ProcessOperation::after {
    display: none;
    /* Hide the bottom line */
}

.ProcessAction::before,
.ProcessAction::after {
    display: none;
    /* Hide both lines */
}

/*######### css for procedure chart elements ##################*/
/* PreviousOperationIndicator */
.PreviousOperationIndicator {
    position: relative;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 50px 50px 0 50px;
    border-color: white transparent transparent transparent;
}

.PreviousOperationIndicator::before {
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

.NextOperationIndicator {
    position: relative;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 50px 50px 50px;
    border-color: transparent transparent white transparent;
}

.NextOperationIndicator::before {
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

/* Parallel indicators are rendered as horizontal synchronization bars. */
.parallel_indicator {
    position: relative;
    width: 450px;
    height: 48px;
    background-color: transparent;
}

.parallel_indicator::before,
.parallel_indicator::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    border-top-width: 4px;
    border-top-style: solid;
    border-top-color: #000;
}

.parallel_indicator::before {
    top: 10px;
}

.parallel_indicator::after {
    bottom: 10px;
}

.StartOptionalParallelIndicator::before,
.StartOptionalParallelIndicator::after,
.EndOptionalParallelIndicator::before,
.EndOptionalParallelIndicator::after {
    border-top-style: dashed;
}

.Annotation {
    min-height: 20px;
    border: 1px solid black;
    background-color: white;
    padding: 5px;
    display: inline-block;
    white-space: normal;
    /* Allow text to wrap */
}

#AnnotationSpan {
    display: inline-block;
    width: 200px;
    /* Adjust the width to your desired fixed width */
    white-space: normal;
    /* Allow text to wrap */
}

.Other {
    min-width: 100px;
    min-height: 20px;
    border: 1px solid black;
    background-color: white;
    border-radius: 5px;
    padding: 5px;
    display: flex;
    text-align: center;
}
</style>
