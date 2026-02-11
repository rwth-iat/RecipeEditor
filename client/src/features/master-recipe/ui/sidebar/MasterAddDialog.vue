<template>
  <AddDialogContainer :elementType="element_type" @close="$emit('close')">
    <form class="dialog-form">
      <span>Select MTP/AAS: </span>
      <div class="row-flex">
        <select v-model="current_file_type" name="FileType" id="fileTypeSelect"
          @change="readServerFiles(current_file_type)">
          <option value="">Select file type</option>
          <option value="mtp">MTP Files</option>
          <option value="aas">AAS Files</option>
        </select>
        <button type="button" class="icon-btn" @click="readServerFiles(current_file_type)" title="Reload files">
          <span class="reload">&#x21bb;</span>
        </button>
      </div>
      <div v-if="current_file_type && serverFiles.length > 0">
        <label for="file_select">Select File: </label>
        <select id="file_select" v-model="current_file_name" name="file">
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
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
          <p>{{ processingProgress }}</p>
        </div>
      </div>
      <div v-if="current_file_type" class="uploader-section">
        <span>Upload new {{ current_file_type.toUpperCase() }} file:</span>
        <div>
          <input ref="fileInput" @change="onFileChange" type="file"
            :accept="getFileAcceptTypes(current_file_type)" style="width:100%;" />
          <div class="row-flex" style="margin-top: 8px;">
            <button class="button" type="button" @click="uploadFileToServer(current_file_type)"
              :disabled="isLoadingFiles">
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
import { ref, toRefs } from 'vue';
import axios from 'axios';
import AddDialogContainer from '@/shell/ui/sidebar/AddDialogContainer.vue';

const props = defineProps({
  element_type: String
});
const { element_type } = toRefs(props);

const emit = defineEmits(['close', 'add']);

const current_file_type = ref('');
const current_file_name = ref('');
const serverFiles = ref([]);
const fileInput = ref(null);

const isLoadingFiles = ref(false);
const isProcessingFile = ref(false);
const processingProgress = ref('');

const client = axios.create({
  baseURL: ''
});

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
  processingProgress.value = 'Parsing file...';

  try {
    processingProgress.value = 'Fetching process data...';
    const response = await client.get(`/${fileType}/${encodeURIComponent(fileName)}/parse`);
    console.log(`Parsed ${fileType} result:`, response.data);

    if (fileType === 'mtp' && Array.isArray(response.data.procs)) {
      const mtpProcesses = [];

      processingProgress.value = 'Processing processes and equipment data...';

      const equipmentPromises = response.data.procs.map(async (proc, index) => {
        processingProgress.value = `Fetching equipment data for ${proc.name} (${index + 1}/${response.data.procs.length})...`;
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
        }
      });

      const results = await Promise.all(equipmentPromises);

      processingProgress.value = 'Building process objects...';
      results.forEach(({ proc, equipmentData }) => {
        mtpProcesses.push({
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
        });
      });

      processingProgress.value = 'Adding processes to sidebar...';
      console.log('Adding parsed MTP processes:', mtpProcesses);
      emit('add', mtpProcesses);
    }

    if (fileType === 'aas' && Array.isArray(response.data)) {
      processingProgress.value = 'Processing AAS capabilities...';
      const equipmentResponse = await client.get(`/${fileType}/${encodeURIComponent(fileName)}/equipment-info`);
      console.log(`Equipment info for ${fileType}:`, equipmentResponse.data);

      const parsedProcesses = response.data
        .filter(item => item.realized_by && item.realized_by.length > 0)
        .map(item => ({
          name: item.capability[0].capability_name,
          type: 'procedure',
          processElementType: 'AAS Capability',
          equipmentInfo: equipmentResponse.data
        }));

      processingProgress.value = 'Adding processes to sidebar...';
      console.log('Adding parsed AAS processes:', parsedProcesses);
      emit('add', parsedProcesses);
    }

  } catch (error) {
    console.error(`Error parsing ${fileType} file:`, error);
    processingProgress.value = `Error: ${error.response?.data?.message || error.message || 'Unknown error occurred'}`;
    setTimeout(() => {
      if (isProcessingFile.value) {
        processingProgress.value = '';
      }
    }, 3000);
  } finally {
    isProcessingFile.value = false;
    processingProgress.value = '';
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
