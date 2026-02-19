<template>
  <AddDialogContainer :elementType="element_type" @close="$emit('close')">
    <form class="dialog-form">
      <span>Select MTP/AAS:</span>
      <div class="row-flex">
        <select v-model="current_file_type" name="FileType" id="fileTypeSelect"
          :disabled="isProcessingFile" @change="readServerFiles(current_file_type)">
          <!--<option value="">Select file type</option>-->
          <option value="mtp">MTP Files</option>
          <option value="aas">AAS Files</option>
        </select>
        <button type="button" class="icon-btn" @click="readServerFiles(current_file_type)" title="Reload files"
          :disabled="isProcessingFile || isLoadingFiles">
          <span class="reload">&#x21bb;</span>
        </button>
      </div>
      <div v-if="current_file_type && serverFiles.length > 0">
        <label for="file_select">Select File: </label>
        <select id="file_select" v-model="current_file_name" name="file" :disabled="isProcessingFile">
          <option v-for="item in serverFiles" :value="item" :key="item">{{ item }}</option>
        </select>
        <div class="row-flex">
          <button id="add_elements_button" class="button" type="button"
            @click="addElementsFromFile(current_file_type, current_file_name)" :disabled="isProcessingFile">
            <span v-if="isProcessingFile">Processing...</span>
            <span v-else>ADD {{ element_type }} to Sidebar</span>
          </button>
        </div>
        <div v-if="isProcessingFile" class="processing-progress">
          <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"
            :aria-valuenow="progressPercent">
            <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
          </div>
          <p>{{ processingProgress }}</p>
          <div class="progress-meta">
            <span>{{ progressCounterText }}</span>
            <span>{{ progressPercent }}%</span>
          </div>
        </div>
      </div>
      <div v-if="current_file_type" class="uploader-section">
        <span>Upload new {{ current_file_type.toUpperCase() }} file:</span>
        <div>
          <input ref="fileInput" @change="onFileChange" type="file"
            :accept="getFileAcceptTypes(current_file_type)" style="width:100%;"
            :disabled="isProcessingFile || isLoadingFiles" />
          <div class="row-flex" style="margin-top: 8px;">
            <button class="button" type="button" @click="uploadFileToServer(current_file_type)"
              :disabled="isLoadingFiles || isProcessingFile">
              <span v-if="isLoadingFiles">Uploading...</span>
              <span v-else>Upload {{ current_file_type.toUpperCase() }} to Server</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  </AddDialogContainer>
</template>

<script setup>
import { computed, onMounted, ref, toRefs } from 'vue';
import axios from 'axios';
import AddDialogContainer from '@/shell/ui/sidebar/AddDialogContainer.vue';

const props = defineProps({
  element_type: String
});
const { element_type } = toRefs(props);

const emit = defineEmits(['close', 'add']);

const current_file_type = ref('mtp');
const current_file_name = ref('');
const serverFiles = ref([]);
const fileInput = ref(null);

const isLoadingFiles = ref(false);
const isProcessingFile = ref(false);
const processingProgress = ref('');
const progressTotalProcedures = ref(0);
const progressLoadedProcedures = ref(0);
const progressParseDone = ref(false);

const client = axios.create({
  baseURL: ''
});

const progressPercent = computed(() => {
  const totalUnits = progressTotalProcedures.value + 1;
  const doneUnits = (progressParseDone.value ? 1 : 0) + progressLoadedProcedures.value;
  const rawPercent = Math.round((doneUnits / totalUnits) * 100);
  if (!Number.isFinite(rawPercent)) return 0;
  return Math.max(0, Math.min(100, rawPercent));
});

const progressCounterText = computed(
  () => `${progressLoadedProcedures.value}/${progressTotalProcedures.value}`
);

onMounted(() => {
  readServerFiles(current_file_type.value);
});

function getFileNameWithoutExtension(name) {
  if (!name || typeof name !== 'string') return 'Imported Elements';
  const normalized = name.replace(/\\/g, '/').split('/').pop() || '';
  return normalized.replace(/\.[^/.]+$/, '') || normalized || 'Imported Elements';
}

function resetProgressState() {
  progressTotalProcedures.value = 0;
  progressLoadedProcedures.value = 0;
  progressParseDone.value = false;
  processingProgress.value = '';
}

function initializeProgress(totalProcedures) {
  progressTotalProcedures.value = Math.max(0, Number(totalProcedures) || 0);
  progressLoadedProcedures.value = 0;
  progressParseDone.value = false;
}

function markParseDone() {
  progressParseDone.value = true;
}

function markProcedureLoaded() {
  if (progressLoadedProcedures.value < progressTotalProcedures.value) {
    progressLoadedProcedures.value += 1;
  }
}

function setProgressMessage(message) {
  processingProgress.value = message || '';
}

async function readServerFiles(fileType) {
  if (!fileType) {
    serverFiles.value = [];
    return;
  }

  isLoadingFiles.value = true;
  try {
    const response = await client.get(`/${fileType}`);
    console.log(`read server ${fileType} files successful`);
    serverFiles.value = response.data;
  } catch (error) {
    console.log(`error trying to read server ${fileType} files`);
    console.log(error);
    serverFiles.value = [];
  } finally {
    isLoadingFiles.value = false;
  }
}

function getFileAcceptTypes(fileType) {
  if (fileType === 'mtp') {
    return '.mtp,.aml';
  } else if (fileType === 'aas') {
    return '.xml';
  }
  return '';
}

async function uploadFileToServer(fileType) {
  if (!current_file.value || !current_file.value.name) {
    console.error('No file selected');
    return;
  }

  isLoadingFiles.value = true;
  const formData = new FormData();
  formData.append('file', current_file.value);

  try {
    await client.post(`/${fileType}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    console.log(`${fileType} file uploaded successfully`);

    await readServerFiles(fileType);

    current_file.value = {};
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  } catch (error) {
    console.error(`Error uploading ${fileType} file:`, error);
  } finally {
    isLoadingFiles.value = false;
  }
}

async function addElementsFromFile(fileType, fileName) {
  if (!fileType || !fileName) {
    console.error('No file type or file name selected');
    return;
  }

  isProcessingFile.value = true;
  initializeProgress(0);
  setProgressMessage('Parsing file...');

  try {
    setProgressMessage('Fetching process data...');
    const response = await client.get(`/${fileType}/${encodeURIComponent(fileName)}/parse`);
    console.log(`Parsed ${fileType} result:`, response.data);

    if (fileType === 'mtp' && Array.isArray(response.data.procs)) {
      const procedures = response.data.procs;
      initializeProgress(procedures.length);
      markParseDone();
      if (procedures.length > 0) {
        setProgressMessage(`Loading procedures ${progressCounterText.value}...`);
      } else {
        setProgressMessage('No procedures found.');
      }

      const equipmentPromises = procedures.map(async (proc) => {
        try {
          const equipmentResponse = await client.get(`/${fileType}/${encodeURIComponent(fileName)}/master-recipe-equipment/${encodeURIComponent(proc.name)}`);
          return {
            proc,
            equipmentData: equipmentResponse.data
          };
        } catch (error) {
          console.warn(`Failed to get equipment data for ${proc.name}:`, error);
          return {
            proc,
            equipmentData: null
          };
        } finally {
          markProcedureLoaded();
          setProgressMessage(`Loading procedures ${progressCounterText.value}...`);
        }
      });

      const results = await Promise.all(equipmentPromises);

      setProgressMessage('Building process objects...');
      const mtpProcesses = results.map(({ proc, equipmentData }) => ({
          name: proc.name,
          type: 'procedure',
          processElementType: 'MTP Operation',
          procId: proc.procId,
          serviceId: proc.serviceId,
          selfCompleting: proc.selfCompleting,
          params: (proc.params || []).map(p => ({
            id: p.id,
            name: p.name,
            default: p.default,
            min: p.min,
            max: p.max,
            unit: p.unit,
            dataType: p.paramElem?.Type,
          })),
          equipmentInfo: equipmentData
        }));

      setProgressMessage('Adding processes to sidebar...');
      console.log('Adding parsed MTP processes:', mtpProcesses);
      emit('add', {
        title: getFileNameWithoutExtension(fileName),
        items: mtpProcesses
      });
    }

    if (fileType === 'aas' && Array.isArray(response.data)) {
      const importableCapabilities = response.data
        .filter(item => item.realized_by && item.realized_by.length > 0);

      initializeProgress(importableCapabilities.length);
      setProgressMessage('Fetching equipment info...');
      const equipmentResponse = await client.get(`/${fileType}/${encodeURIComponent(fileName)}/equipment-info`);
      console.log(`Equipment info for ${fileType}:`, equipmentResponse.data);

      markParseDone();
      if (importableCapabilities.length > 0) {
        setProgressMessage(`Loading procedures ${progressCounterText.value}...`);
      } else {
        setProgressMessage('No procedures found.');
      }

      const parsedProcesses = importableCapabilities.map(item => {
        markProcedureLoaded();
        setProgressMessage(`Loading procedures ${progressCounterText.value}...`);
        return {
          name: item.capability[0].capability_name,
          type: 'procedure',
          processElementType: 'AAS Capability',
          equipmentInfo: equipmentResponse.data
        };
      });

      setProgressMessage('Adding processes to sidebar...');
      console.log('Adding parsed AAS processes:', parsedProcesses);
      emit('add', {
        title: getFileNameWithoutExtension(fileName),
        items: parsedProcesses
      });
    }

  } catch (error) {
    console.error(`Error parsing ${fileType} file:`, error);
    setProgressMessage(`Error: ${error.response?.data?.message || error.message || 'Unknown error occurred'}`);
  } finally {
    isProcessingFile.value = false;
    resetProgressState();
  }
}

const current_file = ref({});

function onFileChange($event) {
  const target = $event.target;
  if (target && target.files) {
    current_file.value = target.files[0];
  }
}
</script>
