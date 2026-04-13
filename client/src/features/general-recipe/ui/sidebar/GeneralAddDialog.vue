<template>
  <AddDialogContainer :elementType="element_type" @close="$emit('close')">
    <template #header-actions>
      <button
        type="button"
        class="dialog-header-icon-btn"
        @click="readServerOntologies"
        title="Reload ontologies"
        :disabled="isLoadingOntologies || isLoadingOntologyTree || isUploadingOntology || isDeletingOntology"
      >
        <span class="reload">&#x21bb;</span>
      </button>
    </template>

    <form class="dialog-form">
      <span>Select Ontology: </span>
      <div class="row-flex">
        <select
          v-model="current_ontology"
          name="Ontology"
          id="ontoSelect"
          :disabled="isLoadingOntologies || isLoadingOntologyTree || isUploadingOntology"
          @change="onOntologyChange"
        >
          <option
            v-for="item in serverOntologies"
            :key="item"
            :value="item"
          >
            {{ item }}
          </option>
          <option value="new">add new to server</option>
        </select>
        <button
          type="button"
          class="button-with-border--red dialog-delete-btn"
          @click="deleteSelectedOntology"
          title="Delete selected ontology from server"
          :disabled="!canDeleteSelectedOntology"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M7 21q-.825 0-1.413-.588T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.588 1.413T17 21H7ZM17 6H7v13h10V6ZM9 17h2V8H9v9Zm4 0h2V8h-2v9Z"
            />
          </svg>
        </button>
      </div>

      <p v-if="isLoadingOntologies" class="ontology-tree-empty ontology-loading-note" aria-live="polite">
        Loading ontologies from server. Large ontology files can take some time.
      </p>

      <div v-if="dialogMessage" class="dialog-status" :class="dialogStatusClass">
        {{ dialogMessage }}
      </div>

      <div v-if="current_ontology === 'new'" class="uploader-section">
        <span>Upload ontology for {{ ontologyCategoryLabel }}:</span>
        <div>
          <label for="file_input">Select File: </label>
          <input
            ref="fileInput"
            @change="onFileChange"
            type="file"
            id="file_input"
            enctype="multipart/form-data"
            :accept="acceptedOntologyTypes"
            :disabled="isUploadingOntology"
          />
        </div>

        <div v-if="precheckMessage" class="dialog-status" :class="precheckStatusClass">
          {{ precheckMessage }}
        </div>

        <div class="row-flex">
          <label for="add_to_server_btt">Add Ontology to Server: </label>
          <button
            id="add_to_server_btt"
            class="button"
            type="button"
            :disabled="!canUploadOntology"
            @click="addOntoToServer"
          >
            <span v-if="isUploadingOntology">Uploading...</span>
            <h5 v-else>ADD Ontology to Server</h5>
          </button>
        </div>
      </div>

      <div v-else-if="current_ontology">
        <label>Select Name of Superclass: </label>
        <div class="ontology-sort-controls">
          <span>Class order:</span>
          <label class="ontology-sort-controls__option">
            <input
              v-model="isOntologyTreeAlphabetical"
              type="checkbox"
            />
            <span>A-Z</span>
          </label>
        </div>
        <div class="ontology-tree-panel">
          <p v-if="isLoadingOntologyTree" class="ontology-tree-empty">
            Loading ontology classes. Large ontologies can take some time.
          </p>
          <OntologyClassTree
            v-else-if="ontology_class_tree.length > 0"
            :items="ontology_class_tree"
            :selectedClassIri="current_super_class_iri"
            :sortMode="ontologyTreeSortMode"
            @select="selectSuperClass"
            @toggle="toggleOntologyTreeNode"
          />
          <p v-else class="ontology-tree-empty">No ontology classes are available for selection.</p>
        </div>
        <div v-if="current_super_class_iri" class="dialog-status dialog-status--info selected-superclass-note">
          Selected superclass: {{ current_super_class }}
        </div>
        <div class="row-flex">
          <button
            id="add_elements_button"
            class="button"
            type="button"
            :disabled="!current_super_class_iri || isLoadingOntologyTree"
            @click="addElements(current_ontology, current_super_class_iri, current_super_class)"
          >
            <h5>ADD {{ element_type }} to Sidebar</h5>
          </button>
        </div>
      </div>
    </form>
  </AddDialogContainer>
</template>

<script setup>
import { computed, onMounted, ref, toRefs } from 'vue';
import axios from 'axios';
import AddDialogContainer from '@/shell/ui/sidebar/AddDialogContainer.vue';
import OntologyClassTree from '@/features/general-recipe/ui/sidebar/OntologyClassTree.vue';
import { MATERIAL_CONTAINER_TYPE } from '@/services/recipe/general-recipe/materials/materialContainerUtils';
import {
  ONTOLOGY_TREE_SORT_MODE_ALPHABETICAL,
  ONTOLOGY_TREE_SORT_MODE_DEFAULT,
} from '@/services/common/ontologyTreeSort';

const props = defineProps({
  element_type: String
});
const { element_type } = toRefs(props);

const emit = defineEmits(['close', 'add']);

const current_ontology = ref('');
const current_super_class = ref('');
const current_super_class_iri = ref('');
const serverOntologies = ref([]);
const ontology_class_graph = ref(createEmptyOntologyClassGraph());
const ontology_class_tree = ref([]);
const ontologyTreeSortMode = ref(ONTOLOGY_TREE_SORT_MODE_DEFAULT);
const current_file = ref(null);
const fileInput = ref(null);

const isUploadingOntology = ref(false);
const isLoadingOntologies = ref(false);
const isLoadingOntologyTree = ref(false);
const isDeletingOntology = ref(false);

const dialogMessage = ref('');
const dialogStatus = ref('info');
const precheckMessage = ref('');
const precheckStatus = ref('info');
const isSelectedFileSupported = ref(false);

const client = axios.create({
  baseURL: ''
});

const acceptedOntologyTypes = '.owl,.omn,.ttl,.rdf,.xml,.nt';

const ontologyCategory = computed(() => (
  element_type.value === 'Processes' ? 'processes' : 'materials'
));

const ontologyCategoryLabel = computed(() => (
  ontologyCategory.value === 'processes' ? 'processes' : 'materials'
));

const dialogStatusClass = computed(() => `dialog-status--${dialogStatus.value}`);
const precheckStatusClass = computed(() => `dialog-status--${precheckStatus.value}`);
const isOntologyTreeAlphabetical = computed({
  get: () => ontologyTreeSortMode.value === ONTOLOGY_TREE_SORT_MODE_ALPHABETICAL,
  set: (value) => {
    ontologyTreeSortMode.value = value
      ? ONTOLOGY_TREE_SORT_MODE_ALPHABETICAL
      : ONTOLOGY_TREE_SORT_MODE_DEFAULT;
  },
});

const canUploadOntology = computed(() => (
  Boolean(current_file.value) && isSelectedFileSupported.value && !isUploadingOntology.value
));

const canDeleteSelectedOntology = computed(() => (
  Boolean(current_ontology.value) &&
  current_ontology.value !== 'new' &&
  !isLoadingOntologies.value &&
  !isLoadingOntologyTree.value &&
  !isUploadingOntology.value &&
  !isDeletingOntology.value
));

function getOntologyBasePath() {
  return `/onto/${ontologyCategory.value}`;
}

function getFileNameWithoutExtension(name) {
  if (!name || typeof name !== 'string') return 'Imported Elements';
  const normalized = name.replace(/\\/g, '/').split('/').pop() || '';
  return normalized.replace(/\.[^/.]+$/, '') || normalized || 'Imported Elements';
}

function resetMessages() {
  dialogMessage.value = '';
  dialogStatus.value = 'info';
}

function setDialogMessage(message, status = 'info') {
  dialogMessage.value = message || '';
  dialogStatus.value = status;
}

function clearSelectedFileState() {
  current_file.value = null;
  precheckMessage.value = '';
  precheckStatus.value = 'info';
  isSelectedFileSupported.value = false;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

function normalizeOntologyListPayload(payload) {
  return Array.isArray(payload)
    ? payload
        .filter(item => typeof item === 'string' && item.trim().length > 0)
        .map(item => item.trim())
    : [];
}

function createEmptyOntologyClassGraph() {
  return {
    rootIris: [],
    nodes: {},
  };
}

function normalizeOntologyClassGraphPayload(payload) {
  const normalizedGraph = createEmptyOntologyClassGraph();
  const rawNodes = payload?.nodes && typeof payload.nodes === 'object' ? payload.nodes : {};

  for (const [rawNodeKey, rawNodeValue] of Object.entries(rawNodes)) {
    const iri = normalizeOntologyClassIri(rawNodeValue?.iri || rawNodeKey);
    if (!iri) {
      continue;
    }

    normalizedGraph.nodes[iri] = {
      iri,
      name: normalizeOntologyClassName(rawNodeValue, iri),
      label: normalizeOntologyClassLabel(rawNodeValue),
      childIris: normalizeOntologyClassIriList(rawNodeValue?.childIris),
      parentIris: normalizeOntologyClassIriList(rawNodeValue?.parentIris),
      otherInformation: Array.isArray(rawNodeValue?.otherInformation) ? rawNodeValue.otherInformation : [],
    };
  }

  for (const node of Object.values(normalizedGraph.nodes)) {
    node.childIris = node.childIris.filter(childIri => normalizedGraph.nodes[childIri] && childIri !== node.iri);
    node.parentIris = node.parentIris.filter(parentIri => normalizedGraph.nodes[parentIri] && parentIri !== node.iri);
  }

  normalizedGraph.rootIris = normalizeOntologyClassIriList(payload?.rootIris)
    .filter(rootIri => normalizedGraph.nodes[rootIri]);

  if (normalizedGraph.rootIris.length === 0) {
    normalizedGraph.rootIris = Object.values(normalizedGraph.nodes)
      .filter(node => node.parentIris.length === 0)
      .map(node => node.iri);
  }

  return normalizedGraph;
}

function normalizeOntologyClassIri(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOntologyClassIriList(values) {
  const normalizedValues = [];
  const seen = new Set();

  for (const value of Array.isArray(values) ? values : []) {
    const normalizedValue = normalizeOntologyClassIri(value);
    if (!normalizedValue || seen.has(normalizedValue)) {
      continue;
    }
    seen.add(normalizedValue);
    normalizedValues.push(normalizedValue);
  }

  return normalizedValues;
}

function normalizeOntologyClassName(item, iri) {
  if (typeof item?.name === 'string' && item.name.trim()) {
    return item.name.trim();
  }

  if (!iri) {
    return 'Unnamed Class';
  }

  const iriSuffix = iri.includes('#')
    ? iri.split('#').pop()
    : iri.split('/').pop();

  return iriSuffix || 'Unnamed Class';
}

function normalizeOntologyClassLabel(item) {
  return typeof item?.label === 'string' ? item.label.trim() : '';
}

function getOntologyClassDisplayText(item, iri) {
  const label = normalizeOntologyClassLabel(item);
  if (label) {
    return label;
  }

  return normalizeOntologyClassName(item, iri);
}

function createOntologyTreeNodeFromGraph(graph, iri) {
  const normalizedIri = normalizeOntologyClassIri(iri);
  const graphNode = graph?.nodes?.[normalizedIri];
  if (!graphNode) {
    return null;
  }

  return {
    iri: normalizedIri,
    name: graphNode.name,
    label: graphNode.label,
    displayName: getOntologyClassDisplayText(graphNode, normalizedIri),
    childIris: [...graphNode.childIris],
    parentIris: [...graphNode.parentIris],
    otherInformation: [...graphNode.otherInformation],
    children: [],
    childrenLoaded: false,
    expanded: false,
  };
}

function buildOntologyClassTreeFromGraph(graph, preferredSelectionIri = '') {
  const items = normalizeOntologyClassIriList(graph?.rootIris)
    .map(rootIri => createOntologyTreeNodeFromGraph(graph, rootIri))
    .filter(Boolean);

  const selectedIri = graph?.nodes?.[normalizeOntologyClassIri(preferredSelectionIri)]
    ? normalizeOntologyClassIri(preferredSelectionIri)
    : (
        items.find(item => Array.isArray(item?.childIris) && item.childIris.length > 0)?.iri ||
        items[0]?.iri ||
        ''
      );

  if (selectedIri) {
    applyExpandedSelectionPath(items, selectedIri, graph);
  }

  return {
    items,
    selectedNode: selectedIri
      ? {
          iri: selectedIri,
          name: getOntologyClassDisplayText(graph.nodes[selectedIri], selectedIri),
        }
      : null,
  };
}

function ensureOntologyTreeNodeChildrenLoaded(item, graph = ontology_class_graph.value) {
  if (!item || typeof item !== 'object' || item.childrenLoaded) {
    return;
  }

  item.children = normalizeOntologyClassIriList(item.childIris)
    .map(childIri => createOntologyTreeNodeFromGraph(graph, childIri))
    .filter(Boolean);
  item.childrenLoaded = true;
}

function collapseOntologyClassTree(items) {
  for (const item of Array.isArray(items) ? items : []) {
    item.expanded = false;
    collapseOntologyClassTree(item.children);
  }
}

function findOntologyClassPathIris(graph, selectedIri) {
  const normalizedIri = normalizeOntologyClassIri(selectedIri);
  if (!normalizedIri || !graph?.nodes?.[normalizedIri]) {
    return [];
  }

  const pathIris = [];
  const visited = new Set();
  let currentIri = normalizedIri;

  while (currentIri && graph.nodes[currentIri] && !visited.has(currentIri)) {
    visited.add(currentIri);
    pathIris.push(currentIri);
    currentIri = graph.nodes[currentIri].parentIris.find(parentIri => graph.nodes[parentIri]) || '';
  }

  return pathIris.reverse();
}

function findOntologyTreeItemByIri(items, iri) {
  return (Array.isArray(items) ? items : []).find(item => item?.iri === iri) || null;
}

function applyExpandedSelectionPath(items, selectedIri, graph = ontology_class_graph.value) {
  const pathIris = findOntologyClassPathIris(graph, selectedIri);
  let currentItems = Array.isArray(items) ? items : [];

  for (const pathIri of pathIris) {
    const currentItem = findOntologyTreeItemByIri(currentItems, pathIri);
    if (!currentItem) {
      break;
    }

    currentItem.expanded = true;
    ensureOntologyTreeNodeChildrenLoaded(currentItem, graph);
    currentItems = currentItem.children;
  }
}

function toggleOntologyTreeNode(item) {
  if (!item || typeof item !== 'object') {
    return;
  }

  if (!item.expanded) {
    ensureOntologyTreeNodeChildrenLoaded(item);
  }

  item.expanded = !item.expanded;
}

function extractErrorMessage(error, fallbackMessage) {
  const payload = error?.response?.data;
  if (payload?.error && payload?.details) {
    return `${payload.error} ${payload.details}`;
  }
  if (payload?.error) {
    return payload.error;
  }
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }
  return fallbackMessage;
}

function normalizeDetectedFormat(format) {
  switch (format) {
    case 'manchester':
      return 'Manchester Syntax';
    case 'rdfxml':
      return 'RDF/XML';
    case 'owlxml':
      return 'OWL/XML';
    case 'ntriples':
      return 'N-Triples';
    case 'turtle':
      return 'Turtle';
    default:
      return format;
  }
}

function looksLikeManchesterOntology(text) {
  const meaningfulLines = (text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .slice(0, 20);

  return meaningfulLines.some(line => (
    line.startsWith('Prefix:') ||
    line.startsWith('Ontology:') ||
    line.startsWith('Class:') ||
    line.startsWith('ObjectProperty:') ||
    line.startsWith('DataProperty:') ||
    line.startsWith('Individual:') ||
    line.startsWith('AnnotationProperty:')
  ));
}

function detectOntologyFormatFromContent(text) {
  const normalizedText = (text || '').trimStart();
  if (looksLikeManchesterOntology(normalizedText)) {
    return 'manchester';
  }
  if (normalizedText.startsWith('@prefix') || normalizedText.startsWith('@base')) {
    return 'turtle';
  }
  if (normalizedText.includes('<rdf:RDF') || (normalizedText.startsWith('<?xml') && normalizedText.includes('<rdf:RDF'))) {
    return 'rdfxml';
  }
  if (normalizedText.includes('<Ontology') || normalizedText.includes('<!DOCTYPE Ontology')) {
    return 'owlxml';
  }
  const firstMeaningfulLine = normalizedText
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line && !line.startsWith('#'));
  if (firstMeaningfulLine?.startsWith('<') && firstMeaningfulLine.endsWith('.')) {
    return 'ntriples';
  }
  return 'unknown';
}

async function readFilePreview(file) {
  if (typeof file?.text === 'function') {
    const text = await file.text();
    return text.slice(0, 2048);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').slice(0, 2048));
    reader.onerror = () => reject(new Error('Failed to read the selected ontology file.'));
    reader.readAsText(file);
  });
}

async function readServerOntologies({ preferredOntology = null } = {}) {
  isLoadingOntologies.value = true;
  resetMessages();
  const previousOntologies = [...serverOntologies.value];
  const previousOntology = current_ontology.value;
  const previousClassGraph = ontology_class_graph.value;
  const previousClassTree = [...ontology_class_tree.value];
  const previousSuperClass = current_super_class.value;
  const previousSuperClassIri = current_super_class_iri.value;
  try {
    const response = await client.get(getOntologyBasePath());
    const normalizedOntologies = normalizeOntologyListPayload(response.data);
    serverOntologies.value = normalizedOntologies;

    let nextOntology = preferredOntology;
    if (!nextOntology || !normalizedOntologies.includes(nextOntology)) {
      if (normalizedOntologies.includes(current_ontology.value)) {
        nextOntology = current_ontology.value;
      } else if (normalizedOntologies.length > 0) {
        nextOntology = normalizedOntologies[0];
      } else {
        nextOntology = 'new';
      }
    }

    current_ontology.value = nextOntology;
  } catch (error) {
    serverOntologies.value = previousOntologies;
    current_ontology.value = previousOntology || (previousOntologies[0] || 'new');
    ontology_class_graph.value = previousClassGraph;
    ontology_class_tree.value = previousClassTree;
    current_super_class.value = previousSuperClass;
    current_super_class_iri.value = previousSuperClassIri;
    setDialogMessage(
      extractErrorMessage(error, 'Failed to load ontologies from the server.'),
      'error'
    );
    return;
  } finally {
    isLoadingOntologies.value = false;
  }

  await onOntologyChange();
}

async function readServerOntoClassTree(name) {
  if (!name || name === 'new') {
    ontology_class_graph.value = createEmptyOntologyClassGraph();
    ontology_class_tree.value = [];
    current_super_class.value = '';
    current_super_class_iri.value = '';
    return;
  }

  const preferredSelectionIri = current_super_class_iri.value;
  isLoadingOntologyTree.value = true;
  ontology_class_graph.value = createEmptyOntologyClassGraph();
  ontology_class_tree.value = [];
  current_super_class.value = '';
  current_super_class_iri.value = '';

  try {
    const response = await client.get(`${getOntologyBasePath()}/${encodeURIComponent(name)}/class-tree`);
    const normalizedGraph = normalizeOntologyClassGraphPayload(response.data);
    const normalizedTreePayload = buildOntologyClassTreeFromGraph(normalizedGraph, preferredSelectionIri);
    ontology_class_graph.value = normalizedGraph;
    ontology_class_tree.value = normalizedTreePayload.items;
    current_super_class.value = normalizedTreePayload.selectedNode?.name || '';
    current_super_class_iri.value = normalizedTreePayload.selectedNode?.iri || '';
  } catch (error) {
    ontology_class_graph.value = createEmptyOntologyClassGraph();
    ontology_class_tree.value = [];
    current_super_class.value = '';
    current_super_class_iri.value = '';
    setDialogMessage(
      extractErrorMessage(error, `Failed to load the class tree for ontology '${name}'.`),
      'error'
    );
  } finally {
    isLoadingOntologyTree.value = false;
  }
}

async function onOntologyChange() {
  resetMessages();
  await readServerOntoClassTree(current_ontology.value);
}

function selectSuperClass(selection) {
  const selectedIri = normalizeOntologyClassIri(selection?.iri);
  if (!selectedIri) {
    return;
  }

  current_super_class.value = getOntologyClassDisplayText(selection, selectedIri);
  current_super_class_iri.value = selectedIri;
  collapseOntologyClassTree(ontology_class_tree.value);
  applyExpandedSelectionPath(ontology_class_tree.value, selectedIri);
}

function createImportedOntologyItemDefaults() {
  if (ontologyCategory.value === 'materials') {
    return {
      type: MATERIAL_CONTAINER_TYPE,
      materialElementType: 'Input',
    };
  }

  return {};
}

function createImportedOntologySidebarItem(graph, iri) {
  const normalizedIri = normalizeOntologyClassIri(iri);
  const graphNode = graph?.nodes?.[normalizedIri];
  if (!graphNode) {
    return null;
  }

  const displayName = getOntologyClassDisplayText(graphNode, normalizedIri);
  return {
    ...createImportedOntologyItemDefaults(),
    iri: normalizedIri,
    name: displayName,
    displayName,
    ontologyClassName: graphNode.name,
    label: graphNode.label,
    childIris: [...graphNode.childIris],
    otherInformation: [...graphNode.otherInformation],
    children: [],
    childrenLoaded: false,
    expanded: false,
  };
}

function buildImportedOntologyPayload(ontoName, classIri) {
  const importedItem = createImportedOntologySidebarItem(ontology_class_graph.value, classIri);
  if (!importedItem) {
    return null;
  }

  return {
    title: getFileNameWithoutExtension(ontoName),
    items: [importedItem],
    graphNodes: ontology_class_graph.value.nodes,
    itemDefaults: createImportedOntologyItemDefaults(),
  };
}

async function assessSelectedFile(file) {
  if (!file) {
    precheckMessage.value = '';
    precheckStatus.value = 'info';
    isSelectedFileSupported.value = false;
    return;
  }

  const extension = (file.name.split('.').pop() || '').toLowerCase();
  const likelySupportedExtension = ['owl', 'ttl', 'rdf', 'xml', 'nt'].includes(extension);
  const previewText = await readFilePreview(file);
  const detectedFormat = detectOntologyFormatFromContent(previewText);

  if (detectedFormat === 'turtle') {
    isSelectedFileSupported.value = true;
    precheckStatus.value = 'info';
    precheckMessage.value = likelySupportedExtension
      ? 'Detected Turtle ontology. The server will normalize it to RDF/XML before storing it.'
      : 'Detected Turtle ontology with an unusual extension. The server will validate it and normalize it to RDF/XML.';
    return;
  }

  if (detectedFormat === 'manchester') {
    isSelectedFileSupported.value = true;
    precheckStatus.value = 'info';
    precheckMessage.value = likelySupportedExtension
      ? 'Detected Manchester ontology. The server will convert it to RDF/XML before storing it.'
      : 'Detected Manchester ontology with an unusual extension. The server will validate it and convert it to RDF/XML.';
    return;
  }

  if (['rdfxml', 'owlxml', 'ntriples'].includes(detectedFormat)) {
    isSelectedFileSupported.value = true;
    precheckStatus.value = 'success';
    precheckMessage.value = `Detected ${normalizeDetectedFormat(detectedFormat)} ontology. The server will validate and store it as RDF/XML.`;
    return;
  }

  isSelectedFileSupported.value = false;
  precheckStatus.value = 'error';
  precheckMessage.value = likelySupportedExtension
    ? 'The selected file could not be recognized as Manchester, Turtle, RDF/XML, OWL/XML, or N-Triples.'
    : 'Unsupported ontology file type. Please select a Manchester, Turtle, RDF/XML, OWL/XML, or N-Triples file.';
}

async function onFileChange(event) {
  resetMessages();
  const target = event.target;
  const file = target?.files?.[0] || null;
  current_file.value = file;
  await assessSelectedFile(file);
}

async function addOntoToServer() {
  if (!canUploadOntology.value) {
    setDialogMessage('Select a supported ontology file before uploading.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('file', current_file.value);

  isUploadingOntology.value = true;
  resetMessages();
  try {
    const response = await client.post(getOntologyBasePath(), formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    await readServerOntologies({ preferredOntology: response.data.filename });
    setDialogMessage(
      `${response.data.message} Stored as ${response.data.filename}.`,
      'success'
    );
    clearSelectedFileState();
  } catch (error) {
    setDialogMessage(
      extractErrorMessage(error, 'Uploading ontology failed.'),
      'error'
    );
  } finally {
    isUploadingOntology.value = false;
  }
}

async function deleteSelectedOntology() {
  if (!canDeleteSelectedOntology.value) {
    return;
  }

  isDeletingOntology.value = true;
  resetMessages();
  try {
    const response = await client.delete(
      `${getOntologyBasePath()}/${encodeURIComponent(current_ontology.value)}`
    );
    await readServerOntologies();
    setDialogMessage(
      response.data?.message || `Ontology '${current_ontology.value}' deleted successfully.`,
      'success'
    );
  } catch (error) {
    setDialogMessage(
      extractErrorMessage(error, `Failed to delete ontology '${current_ontology.value}'.`),
      'error'
    );
  } finally {
    isDeletingOntology.value = false;
  }
}

function addOnto(ontoName, classIri, className) {
  const importedPayload = buildImportedOntologyPayload(ontoName, classIri);
  if (!importedPayload) {
    setDialogMessage(
      `Failed to add ontology class '${className || classIri}' to the sidebar.`,
      'error'
    );
    return;
  }

  emit('add', importedPayload);
}

function addElements(ontoName, classIri, className) {
  addOnto(ontoName, classIri, className);
}

onMounted(() => {
  readServerOntologies();
});
</script>

<style scoped>
.ontology-sort-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  color: #e0e4ea;
}

.ontology-sort-controls__option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: #e0e4ea;
}

.ontology-sort-controls__option input {
  width: auto;
  height: auto;
  margin: 0;
}

.ontology-tree-panel {
  max-height: 260px;
  overflow: auto;
  border: 1px solid #444a58;
  border-radius: 8px;
  background: #23272f;
  padding: 10px 8px;
}

.ontology-tree-empty {
  margin: 0;
  color: #c8d1dc;
  font-size: 0.95rem;
}

.ontology-loading-note {
  margin-top: 10px;
}

.selected-superclass-note {
  margin-top: -6px;
}
</style>
