<template>
    <div id="addElements" class="settings">
        <div class="dialog-header">
            <h3>Add {{ element_type }}</h3>
            <button class="close-btn" @click="close" title="Close">
                <span class="material-icons-red">x</span>
            </button>
        </div>
        <div v-if="mode !== 'master'">
            <form class="dialog-form">
                <span>Select Ontology: </span>
                <div class="row-flex">
                    <select v-model="current_ontology" name="Ontology" id="ontoSelect"
                        @change="readServerOntoClasses(current_ontology)">
                        <option :value="item" v-for="item in serverProcessOntologies" :key="item">{{ item }}</option>
                        <option value="new">add new to server</option>
                    </select>
                    <button type='button' class="icon-btn" @click="readServerOntologies" title="Reload ontologies">
                        <span class=reload>&#x21bb;</span>
                    </button>
                </div>
                <div v-if="current_ontology === 'new'">
                    <span>Choose a File or URL</span>
                    <select v-model="addOption" id="addOption">
                        <option value="file">File</option>
                        <option value="url">URL</option>
                    </select>
                    <div v-if="addOption === 'url'">
                        <label for="url_input">Select URL: </label>
                        <input type="url" id="url_input" />
                    </div>
                    <div v-else-if="addOption === 'file'">
                        <label for="file_input">Select File: </label>
                        <input @change="$event => onFileChange($event)" type="file" id="file_input"
                            enctype=multipart/form-data />
                    </div>
                    <div class="row-flex">
                        <label for="add_to_server_btt">Add Ontology to Server: </label>
                        <button class="button" type='button' @click="addOntoToServer('test.owl', current_file)">
                            <h5>ADD Ontology to Server</h5>
                        </button>
                    </div>
                </div>
                <div v-else>
                    <label for="super_class_select">Select Name of Superclass: </label>
                    <select id="super_class_select" v-model="current_super_class" name="super-class">
                        <option v-for="item in onto_classes" :value="item" :key="item">{{ item }}</option>
                    </select>
                    <label for="relation_input">Name of Relation: </label>
                    <input id="relation_input" type="text" value="subclass_of" />
                    <div class="row-flex">
                        <button id="add_elements_button" class="button" type='button'
                            @click="addElements(current_ontology, current_super_class)">
                            <h5>ADD {{ element_type }} to Sidebar</h5>
                        </button>
                    </div>
                </div>
            </form>
        </div>
        <div v-else>
            <!-- MTP and AAS file management -->
            <form class="dialog-form">
                <span>Select MTP/AAS: </span>
                <div class="row-flex">
                    <select v-model="current_file_type" name="FileType" id="fileTypeSelect"
                        @change="readServerFiles(current_file_type)">
                        <option value="">Select file type</option>
                        <option value="mtp">MTP Files</option>
                        <option value="aas">AAS Files</option>
                    </select>
                    <button type='button' class="icon-btn" @click="readServerFiles(current_file_type)" title="Reload files">
                        <span class=reload>&#x21bb;</span>
                    </button>
                </div>
                <div v-if="current_file_type && serverFiles.length > 0">
                    <label for="file_select">Select File: </label>
                    <select id="file_select" v-model="current_file_name" name="file">
                        <option v-for="item in serverFiles" :value="item" :key="item">{{ item }}</option>
                    </select>
                    <div class="row-flex">
                        <button id="add_elements_button" class="button" type='button'
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
                    <div >
                        <input ref="fileInput" @change="onFileChange" type="file"
                            :accept="getFileAcceptTypes(current_file_type)" style="width:100%;" />
                        <div class="row-flex" style="margin-top: 8px;">
                            <button class="button" type='button' @click="uploadFileToServer(current_file_type)"
                                :disabled="isLoadingFiles">
                                <span v-if="isLoadingFiles">Uploading...</span>
                                <span v-else>Upload {{ current_file_type.toUpperCase() }} to Server</span>
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref, toRefs, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'

//we define a prop elementtype so that we can use this component for materials and Processes 
const props = defineProps({
    element_type: String,
    mode: {
        type: String,
        default: 'general'
    }
});
const { element_type, mode } = toRefs(props);

//we define two emit functions to start events in the parent object (sidebar)
//      close - to close it. It is not possible from inside this component
//      add   - to add the elements of an ontology into the sidebar
const emit = defineEmits(['close', 'add'])

//for the dropdown menus we need some reative variables which get dynamically populated
const current_ontology = ref('')
const addOption = ref('')
const current_super_class = ref('')
const serverProcessOntologies = ref([""])
const onto_classes = ref([])
const current_file = ref({})

// New variables for MTP/AAS file management
const current_file_type = ref('')
const current_file_name = ref('')
const serverFiles = ref([])
const fileInput = ref(null)

// Loading states
const isLoadingFiles = ref(false)
const isProcessingFile = ref(false)
const processingProgress = ref('')

// For dynamic positioning next to the + button

onMounted(() => {
    // No longer needed for dynamic positioning
});
onBeforeUnmount(() => {
    // No longer needed for dynamic positioning
});

const client = axios.create({
    //baseURL: process.env.VUE_APP_BASE_URL
    baseURL: ''
});

// Remove unused refs and functions
// const mtpInput = ref(null)
// const aasInput = ref(null)
// function triggerFileInput(type) {
//     if (type === 'mtp') {
//         mtpInput.value?.click()
//     } else if (type === 'aas') {
//         aasInput.value?.click()
//     }
// }

// async function handleFileUpload(type, event) {
//     const file = event.target.files[0];
//     if (!file) return;

//     const formData = new FormData();
//     formData.append('file', file);

//     // Decide backend endpoint based on type
//     const endpoint = type === 'mtp' ? '/parse-mtp' : '/parse-aas';

//     try {
//         const response = await client.post(endpoint, formData, {
//             headers: { 'Content-Type': 'multipart/form-data' },
//         });

//         console.log(`Parsed ${type} result:`, response.data);


//         if (type === 'mtp' && Array.isArray(response.data.procs)) {
//             const mtpProcesses = response.data.procs.map(proc => ({
//                 name: proc.name,                         // display name
//                 type: 'process',
//                 processElementType: 'MTP Operation',
//                 procId: proc.procId,                     // for wiring calls
//                 serviceId: proc.serviceId,               // for OPC-UA binding
//                 selfCompleting: proc.selfCompleting,     // auto-advance?
//                 params: (proc.params || []).map(p => ({
//                     id: p.id,
//                     name: p.name,
//                     default: p.default,
//                     min: p.min,
//                     max: p.max,
//                     unit: p.unit,
//                     dataType: p.paramElem?.Type,
//                 }))
//             }));

//             console.log('Adding parsed MTP processes:', mtpProcesses);
//             emit('add', mtpProcesses);
//         }

//         // If type is 'aas', extract processes and emit
//         if (type === 'aas' && Array.isArray(response.data)) {
//             const parsedProcesses = response.data
//                 .filter(item => item.realized_by && item.realized_by.length > 0)
//                 .map(item => ({
//                     name: item.capability[0].capability_name,
//                     type: 'process',
//                     processElementType: 'AAS Capability'
//                 }));

//             console.log('Adding parsed processes:', parsedProcesses);

//             // Emit to sidebar (you will call the parent's addElements)
//             // Example: if you are inside addDialog.vue, do:
//             emit('add', parsedProcesses);
//         }

//     } catch (error) {
//         console.error(`Error uploading or parsing ${type} file:`, error);
//     }

//     // Clear the input to allow re-uploading the same file
//     event.target.value = '';
// }

//get all names/ids of the ontologies present at the server
function readServerOntologies() {
    client.get('/onto')
        .then(response => {
            // handle success
            console.log("read server ontologies successful")
            serverProcessOntologies.value = response.data
        })
        .catch(error => {
            // handle error
            console.log("error trying to read server ontologies")
            console.log(error)
        })
}

// Get all MTP or AAS files from the server
async function readServerFiles(fileType) {
    if (!fileType) {
        serverFiles.value = []
        return
    }

    isLoadingFiles.value = true
    try {
        const response = await client.get(`/${fileType}`)
        console.log(`read server ${fileType} files successful`)
        serverFiles.value = response.data
    } catch (error) {
        console.log(`error trying to read server ${fileType} files`)
        console.log(error)
        serverFiles.value = []
    } finally {
        isLoadingFiles.value = false
    }
}

// Get file accept types for file input
function getFileAcceptTypes(fileType) {
    if (fileType === 'mtp') {
        return '.mtp,.aml'
    } else if (fileType === 'aas') {
        return '.xml'
    }
    return ''
}

// Upload file to server
async function uploadFileToServer(fileType) {
    if (!current_file.value || !current_file.value.name) {
        console.error('No file selected')
        return
    }

    isLoadingFiles.value = true
    const formData = new FormData()
    formData.append('file', current_file.value)

    try {
        await client.post(`/${fileType}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        console.log(`${fileType} file uploaded successfully`)

        // Refresh the file list
        await readServerFiles(fileType)

        // Clear the file input and reset the form
        current_file.value = {}
        if (fileInput.value) {
            fileInput.value.value = ''
        }
    } catch (error) {
        console.error(`Error uploading ${fileType} file:`, error)
    } finally {
        isLoadingFiles.value = false
    }
}

// Add elements from selected file
async function addElementsFromFile(fileType, fileName) {
    if (!fileType || !fileName) {
        console.error('No file type or file name selected')
        return
    }

    isProcessingFile.value = true
    processingProgress.value = 'Parsing file...'

    try {
        // First get the parsed data for processes
        processingProgress.value = 'Fetching process data...'
        const response = await client.get(`/${fileType}/${encodeURIComponent(fileName)}/parse`)
        console.log(`Parsed ${fileType} result:`, response.data)

        if (fileType === 'mtp' && Array.isArray(response.data.procs)) {
            const mtpProcesses = []

            // Batch process equipment info requests for better performance
            processingProgress.value = 'Processing processes and equipment data...'

            // Create all equipment requests in parallel
            const equipmentPromises = response.data.procs.map(async (proc, index) => {
                processingProgress.value = `Fetching equipment data for ${proc.name} (${index + 1}/${response.data.procs.length})...`
                try {
                    const equipmentResponse = await client.get(`/${fileType}/${encodeURIComponent(fileName)}/master-recipe-equipment/${encodeURIComponent(proc.name)}`)
                    return {
                        proc,
                        equipmentData: equipmentResponse.data
                    }
                } catch (error) {
                    console.warn(`Failed to get equipment data for ${proc.name}:`, error)
                    return {
                        proc,
                        equipmentData: null
                    }
                }
            })

            // Wait for all equipment requests to complete
            const results = await Promise.all(equipmentPromises)

            // Process results
            processingProgress.value = 'Building process objects...'
            results.forEach(({ proc, equipmentData }) => {
                mtpProcesses.push({
                    name: proc.name,
                    type: 'process',
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
                    // Add master recipe specific equipment information for PropertyWindow
                    equipmentInfo: equipmentData
                })
            })

            processingProgress.value = 'Adding processes to sidebar...'
            console.log('Adding parsed MTP processes:', mtpProcesses)
            emit('add', mtpProcesses)
        }

        if (fileType === 'aas' && Array.isArray(response.data)) {
            processingProgress.value = 'Processing AAS capabilities...'
            // For AAS, we still get the full equipment info since AAS doesn't have the same process structure
            const equipmentResponse = await client.get(`/${fileType}/${encodeURIComponent(fileName)}/equipment-info`)
            console.log(`Equipment info for ${fileType}:`, equipmentResponse.data)

            const parsedProcesses = response.data
                .filter(item => item.realized_by && item.realized_by.length > 0)
                .map(item => ({
                    name: item.capability[0].capability_name,
                    type: 'process',
                    processElementType: 'AAS Capability',
                    // Add equipment information for PropertyWindow
                    equipmentInfo: equipmentResponse.data
                }))

            processingProgress.value = 'Adding processes to sidebar...'
            console.log('Adding parsed AAS processes:', parsedProcesses)
            emit('add', parsedProcesses)
        }

    } catch (error) {
        console.error(`Error parsing ${fileType} file:`, error)
        // Show user-friendly error message
        processingProgress.value = `Error: ${error.response?.data?.message || error.message || 'Unknown error occurred'}`
        // Keep error message visible for a few seconds
        setTimeout(() => {
            if (isProcessingFile.value) {
                processingProgress.value = ''
            }
        }, 3000)
    } finally {
        isProcessingFile.value = false
        processingProgress.value = ''
    }
}

function close() {
    emit('close')
}

function addElements(ontoName, className) {
    console.log("adding started")
    console.log(ontoName + className)
    let elements_json = addOnto(ontoName, className)
    console.log(elements_json)
    emit('add', elements_json)
}

// get all classes from Ontology.
// They will be displayed in Dropdown menu to choose a super class when adding Processes/Materials.
function readServerOntoClasses(name) {
    if (name !== "new") {
        client.get('/onto/' + name + '/classes')
            .then(response => {
                // handle success
                onto_classes.value = response.data
            })
            .catch(error => {
                // handle error
                console.log(error.response)
            })
    }
}

function onFileChange($event) {
    const target = $event.target;
    if (target && target.files) {
        current_file.value = target.files[0];
    }
}

//function to upload Ontologie to the server 
function addOntoToServer(name, file) {
    let formData = new FormData();
    formData.append("file", file);
    console.log("test")
    client.post('/onto', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
        .then(response => {
            // handle success
            console.log(response.data)
            console.log("test")
        })
        .catch(error => {
            // handle error
            console.log(error.response)
        })
}

//function to add materials/Processes from Ontology to the Editor
function addOnto(ontoName, className) {
    client.get('/onto/' + ontoName + '/' + className + '/subclasses')
        .then(response => {
            // handle success
            console.log(response.data)
            emit('add', response.data)
        })
        .catch(error => {
            // handle error
            console.log(error.response)
        })
}

readServerOntologies()
</script>

<style lang="scss" scoped>
.settings {
    position: absolute;
    z-index: 5;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: 370px;
    background: #23272f;
    border-radius: 16px;
    border: 1.5px solid #bfc9d1;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    padding: 24px 32px 24px 32px;
    justify-content: center;
    align-items: center;
    color: #f4f6fa;
    transition: box-shadow 0.2s, border 0.2s;
}

// Section divider
.section-divider {
    border-top: 1px solid #e0e4ea;
    margin: 20px 0 18px 0;
}

.dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
    border-bottom: 1px solid #e0e4ea;
    padding-bottom: 8px;
}
.dialog-header h3 {
    color: #fff;
    font-weight: 700;
    font-size: 1.25rem;
    margin: 0;
    letter-spacing: 0.5px;
}
.close-btn {
    background: none;
    border: none;
    color: #e74c3c;
    font-size: 1.7rem;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 50%;
    transition: background 0.2s, box-shadow 0.2s;
    box-shadow: none;
    margin-left: 8px;
}
.close-btn:hover {
    background: #ffeaea;
    box-shadow: 0 2px 8px rgba(231,76,60,0.12);
}
.dialog-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
    width: 100%;
}
.row-flex {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 0;
}
.icon-btn {
    background: none;
    border: none;
    color: #007bff;
    font-size: 1.3rem;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 50%;
    transition: background 0.2s;
}
.icon-btn:hover {
    background: #e0eaff;
}
.button {
    margin-left: 0;
    margin-bottom: 0;
    padding: 10px 22px;
    font-size: 1.08rem;
    font-weight: 600;
    color: #fff;
    background-color: #28a745;
    border-radius: 7px;
    border: none;
    box-shadow: 0 2px 8px rgba(40,167,69,0.08);
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s;
}
.button:disabled {
    background-color: #bfc9d1;
    color: #fff;
    cursor: not-allowed;
    box-shadow: none;
}
.button:hover:not(:disabled) {
    background-color: #218838;
    box-shadow: 0 4px 16px rgba(40,167,69,0.13);
}
select, input[type="file"], input[type="url"], input[type="text"] {
    background: #fff;
    border: 1.2px solid #bfc9d1;
    border-radius: 5px;
    padding: 7px 10px;
    font-size: 1rem;
    color: #222;
    margin-top: 2px;
    margin-bottom: 2px;
    width: 100%;
    box-sizing: border-box;
    transition: border 0.2s;
}
select:focus, input[type="file"]:focus, input[type="url"]:focus, input[type="text"]:focus {
    border: 1.2px solid #007bff;
    outline: none;
}
label {
    font-weight: 500;
    color: #333;
    margin-bottom: 2px;
    margin-top: 4px;
}
.processing-progress {
    margin-top: 10px;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 5px;
    border: 1px solid #dee2e6;
}
.progress-bar {
    width: 100%;
    height: 20px;
    background-color: #e9ecef;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 10px;
}
.progress-fill {
    height: 100%;
    background-color: #007bff;
    width: 0%;
    animation: progress-animation 2s ease-in-out infinite;
}
@keyframes progress-animation {
    0% { width: 0%; }
    50% { width: 70%; }
    100% { width: 100%; }
}
.processing-progress p {
    margin: 0;
    color: #495057;
    font-weight: 500;
    text-align: center;
}
.uploader-section {
    background: #2d323c;
    border: 1px solid #444a58;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    padding: 16px 18px 14px 18px;
    margin-top: 18px;
    margin-bottom: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.uploader-section span {
    font-size: 1rem;
    font-weight: 500;
    color: #f4f6fa;
    margin-bottom: 6px;
    text-align: left;
}
.uploader-section input[type="file"] {
    background: #23272f;
    border: 1px solid #444a58;
    border-radius: 6px;
    padding: 7px 10px;
    font-size: 0.98rem;
    color: #f4f6fa;
    margin-bottom: 0;
    transition: border 0.2s, box-shadow 0.2s;
}
.uploader-section input[type="file"]:hover,
.uploader-section input[type="file"]:focus {
    border: 1.5px solid #6ca0f6;
    box-shadow: 0 0 0 2px #23272f;
}
.uploader-section button {
    margin-top: 8px;
    background: #3b82f6;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 8px 18px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.18s, box-shadow 0.18s;
    box-shadow: 0 1px 4px rgba(59,130,246,0.08);
}
.uploader-section button:hover {
    background: #2563eb;
    box-shadow: 0 2px 8px rgba(59,130,246,0.13);
}
.dialog-form label,
.dialog-form span,
.dialog-form select,
.dialog-form option,
.dialog-form input,
.dialog-form textarea {
    color: #e0e4ea !important;
}

// For selects and inputs, also adjust background and border for dark mode
.dialog-form select {
    background: #f4f6fa !important;
    color: #23272f !important;
    border: 1px solid #444a58;
}
.dialog-form input,
.dialog-form textarea {
    background: #23272f;
    border: 1px solid #444a58;
    color: #e0e4ea;
}
.dialog-form select:focus,
.dialog-form input:focus,
.dialog-form textarea:focus {
    border: 1.5px solid #6ca0f6;
    outline: none;
}
.dialog-form select option {
    color: #23272f !important;
    background: #f4f6fa !important;
}
</style>