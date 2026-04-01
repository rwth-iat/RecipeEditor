<template>
  <AddDialogContainer :elementType="element_type" @close="$emit('close')">
    <template #header-actions>
      <button
        type="button"
        class="dialog-header-icon-btn"
        @click="readServerOntologies"
        title="Reload ontologies"
        :disabled="isLoadingOntologies || isUploadingOntology || isDeletingOntology"
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
          :disabled="isLoadingOntologies || isUploadingOntology"
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
        <div class="ontology-tree-panel">
          <OntologyClassTree
            v-if="ontology_class_tree.length > 0"
            :items="ontology_class_tree"
            :selectedClass="current_super_class"
            @select="selectSuperClass"
          />
          <p v-else class="ontology-tree-empty">No ontology classes are available for selection.</p>
        </div>
        <div v-if="current_super_class" class="dialog-status dialog-status--info selected-superclass-note">
          Selected superclass: {{ current_super_class }}
        </div>
        <div class="row-flex">
          <button
            id="add_elements_button"
            class="button"
            type="button"
            :disabled="!current_super_class"
            @click="addElements(current_ontology, current_super_class)"
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

const props = defineProps({
  element_type: String
});
const { element_type } = toRefs(props);

const emit = defineEmits(['close', 'add']);

const current_ontology = ref('');
const current_super_class = ref('');
const serverOntologies = ref([]);
const ontology_class_tree = ref([]);
const current_file = ref(null);
const fileInput = ref(null);

const isUploadingOntology = ref(false);
const isLoadingOntologies = ref(false);
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

const canUploadOntology = computed(() => (
  Boolean(current_file.value) && isSelectedFileSupported.value && !isUploadingOntology.value
));

const canDeleteSelectedOntology = computed(() => (
  Boolean(current_ontology.value) &&
  current_ontology.value !== 'new' &&
  !isLoadingOntologies.value &&
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

function normalizeOntologyClassTreePayload(payload) {
  return Array.isArray(payload)
    ? payload.map(item => normalizeOntologyClassTreeNode(item, true))
    : [];
}

function normalizeOntologyClassTreeNode(item, expanded = false) {
  const normalizedChildren = Array.isArray(item?.children)
    ? item.children.map(child => normalizeOntologyClassTreeNode(child))
    : [];

  return {
    ...item,
    expanded,
    children: normalizedChildren,
  };
}

function collectClassNames(tree, classNames = []) {
  for (const node of Array.isArray(tree) ? tree : []) {
    if (typeof node?.name === 'string' && node.name.trim()) {
      classNames.push(node.name);
    }
    if (Array.isArray(node?.children) && node.children.length > 0) {
      collectClassNames(node.children, classNames);
    }
  }
  return classNames;
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
  const previousClassTree = [...ontology_class_tree.value];
  const previousSuperClass = current_super_class.value;
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
    ontology_class_tree.value = previousClassTree;
    current_super_class.value = previousSuperClass;
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
    ontology_class_tree.value = [];
    current_super_class.value = '';
    return;
  }

  try {
    const response = await client.get(`${getOntologyBasePath()}/${encodeURIComponent(name)}/class-tree`);
    const normalizedTree = normalizeOntologyClassTreePayload(response.data);
    const availableClasses = collectClassNames(normalizedTree);
    ontology_class_tree.value = normalizedTree;
    current_super_class.value = availableClasses.includes(current_super_class.value)
      ? current_super_class.value
      : (normalizedTree[0]?.name || '');
  } catch (error) {
    ontology_class_tree.value = [];
    current_super_class.value = '';
    setDialogMessage(
      extractErrorMessage(error, `Failed to load the class tree for ontology '${name}'.`),
      'error'
    );
  }
}

async function onOntologyChange() {
  resetMessages();
  await readServerOntoClassTree(current_ontology.value);
}

function selectSuperClass(className) {
  current_super_class.value = className;
}

function normalizeImportedOntologyNode(item) {
  if (!item || typeof item !== 'object') {
    return item;
  }

  const normalizedChildren = Array.isArray(item.children)
    ? item.children.map(child => normalizeImportedOntologyNode(child))
    : [];

  const normalizedItem = {
    ...item,
    children: normalizedChildren,
  };

  if (ontologyCategory.value === 'materials') {
    normalizedItem.type = MATERIAL_CONTAINER_TYPE;
    normalizedItem.materialElementType = normalizedItem.materialElementType || 'Input';
  }

  return normalizedItem;
}

function normalizeImportedOntologyItems(items) {
  return Array.isArray(items)
    ? items.map(item => normalizeImportedOntologyNode(item))
    : [];
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

async function addOnto(ontoName, className) {
  try {
    const response = await client.get(
      `${getOntologyBasePath()}/${encodeURIComponent(ontoName)}/${encodeURIComponent(className)}/subclasses`
    );
    emit('add', {
      title: getFileNameWithoutExtension(ontoName),
      items: normalizeImportedOntologyItems(response.data)
    });
  } catch (error) {
    setDialogMessage(
      extractErrorMessage(error, `Failed to load subclasses for '${className}'.`),
      'error'
    );
  }
}

function addElements(ontoName, className) {
  addOnto(ontoName, className);
}

onMounted(() => {
  readServerOntologies();
});
</script>

<style scoped>
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

.selected-superclass-note {
  margin-top: -6px;
}
</style>
