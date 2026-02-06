<template>
    <div class="master-recipe-config-panel">
        <div class="config-header">
            <h2>Master Recipe Configuration</h2>
            <button class="close-button" @click="$emit('close')">
                <span class="icon--light">×</span>
            </button>
        </div>

        <!-- ListHeader -->
        <div class="config-section">
            <h3>Batch List Header</h3>
            <div class="form-group">
                <label for="listHeaderId">ListHeader ID:</label>
                <input type="text" id="listHeaderId" v-model="safeConfig.listHeaderId" placeholder="e.g., ListHeadID" />
            </div>
            <div class="form-group">
                <label for="listHeaderCreateDate">Create Date:</label>
                <input type="text" id="listHeaderCreateDate" :value="currentCreateDate" disabled />
            </div>
        </div>

        <!-- BatchInformation Description -->
        <div class="config-section">
            <h3>Batch Information Description</h3>
            <div class="form-group">
                <label for="batchInfoDescription">Description:</label>
                <textarea id="batchInfoDescription" v-model="safeConfig.batchInfoDescription"
                    placeholder="Description of the batch information"></textarea>
            </div>
        </div>

        <!-- MasterRecipe Info -->
        <div class="config-section">
            <h3>Master Recipe Info</h3>
            <div class="form-group">
                <label for="masterRecipeId">MasterRecipe ID:</label>
                <input type="text" id="masterRecipeId" v-model="safeConfig.masterRecipeId"
                    placeholder="e.g., MasterRecipeHC" />
            </div>
            <div class="form-group">
                <label for="masterRecipeVersion">Version:</label>
                <input type="text" id="masterRecipeVersion" v-model="safeConfig.masterRecipeVersion"
                    placeholder="e.g., 1.0.0" />
            </div>
            <div class="form-group">
                <label for="masterRecipeVersionDate">Version Date:</label>
                <input type="datetime-local" id="masterRecipeVersionDate"
                    v-model="safeConfig.masterRecipeVersionDate" />
            </div>
            <div class="form-group">
                <label for="masterRecipeDescription">Description:</label>
                <textarea id="masterRecipeDescription" v-model="safeConfig.masterRecipeDescription"
                    placeholder="Description of the master recipe"></textarea>
            </div>
        </div>

        <!-- Recipe Header -->
        <div class="config-section">
            <h3>Recipe Header</h3>
            <div class="form-group">
                <label for="productId">Product ID:</label>
                <input type="text" id="productId" v-model="safeConfig.productId" placeholder="e.g., StirredWater1" />
            </div>
            <div class="form-group">
                <label for="productName">Product Name:</label>
                <input type="text" id="productName" v-model="safeConfig.productName"
                    placeholder="e.g., Stirred Water" />
            </div>
            <div class="form-group">
                <label for="recipeVersion">Version:</label>
                <input type="text" id="recipeVersion" v-model="safeConfig.version" placeholder="e.g., 1.0.0" />
            </div>
            <div class="form-group">
                <label for="recipeDescription">Description:</label>
                <textarea id="recipeDescription" v-model="safeConfig.description"
                    placeholder="Description of the master recipe"></textarea>
            </div>
        </div>

        <!-- Formula Parameters -->
        <div class="config-section">
            <h3>Formula Parameters</h3>
            <div v-for="(parameter, index) in safeConfig.formulaParameters" :key="index" class="parameter-config">
                <div class="form-group">
                    <label :for="'paramId_' + index">Parameter ID:</label>
                    <input type="text" :id="'paramId_' + index" v-model="parameter.id"
                        placeholder="e.g., Stirring Time HC10" />
                </div>
                <div class="form-group">
                    <label :for="'paramValue_' + index">Value:</label>
                    <input type="text" :id="'paramValue_' + index" v-model="parameter.value" placeholder="e.g., 10" />
                </div>
                <div class="form-group">
                    <label :for="'paramDataType_' + index">Data Type:</label>
                    <select :id="'paramDataType_' + index" v-model="parameter.dataType">
                        <option value="duration">Duration</option>
                        <option value="temperature">Temperature</option>
                        <option value="pressure">Pressure</option>
                        <option value="flow">Flow</option>
                        <option value="level">Level</option>
                        <option value="speed">Speed</option>
                        <option value="weight">Weight</option>
                    </select>
                </div>
                <div class="form-group">
                    <label :for="'paramUnit_' + index">Unit:</label>
                    <input type="text" :id="'paramUnit_' + index" v-model="parameter.unit"
                        placeholder="e.g., seconds" />
                </div>
                <button class="remove-button" @click="removeFormulaParameter(index)" title="Remove parameter">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                        <path fill="currentColor"
                            d="M7 21q-.825 0-1.413-.588T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.588 1.413T17 21H7ZM17 6H7v13h10V6ZM9 17h2V8H9v9Zm4 0h2V8h-2v9ZM7 6v13V6Z" />
                    </svg>
                </button>
            </div>
            <button @click="addFormulaParameter" class="add-button">
                + Add Formula Parameter
            </button>
        </div>

        <!-- Equipment Requirements -->
        <div class="config-section">
            <h3>Equipment Requirements</h3>
            <div v-for="(requirement, index) in safeConfig.equipmentRequirements" :key="index"
                class="requirement-config">
                <div class="form-group">
                    <label :for="'reqId_' + index">Requirement ID:</label>
                    <input type="text" :id="'reqId_' + index" v-model="requirement.id"
                        placeholder="e.g., Equipment Requirement for the HCs" />
                </div>
                <div class="form-group">
                    <label :for="'reqConstraint_' + index">Constraint:</label>
                    <input type="text" :id="'reqConstraint_' + index" v-model="requirement.constraint"
                        placeholder="e.g., Material == H2O" />
                </div>
                <div class="form-group">
                    <label :for="'reqDescription_' + index">Description:</label>
                    <textarea :id="'reqDescription_' + index" v-model="requirement.description"
                        placeholder="Description of the equipment requirement"></textarea>
                </div>
                <button class="remove-button" @click="removeEquipmentRequirement(index)" title="Remove requirement">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                        <path fill="currentColor"
                            d="M7 21q-.825 0-1.413-.588T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.588 1.413T17 21H7ZM17 6H7v13h10V6ZM9 17h2V8H9v9Zm4 0h2V8h-2v9ZM7 6v13V6Z" />
                    </svg>
                </button>
            </div>
            <button @click="addEquipmentRequirement" class="add-button">
                + Add Equipment Requirement
            </button>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
            <button @click="saveConfig" class="save-button">Save Configuration</button>
            <button @click="resetConfig" class="reset-button">Reset to Defaults</button>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    modelValue: {
        type: Object,
        default: () => ({
            listHeaderId: 'ListHeadID',
            listHeaderCreateDate: '',
            batchInfoDescription: '',
            masterRecipeId: 'MasterRecipeHC',
            masterRecipeVersion: '1.0.0',
            masterRecipeVersionDate: '',
            masterRecipeDescription: '',
            productId: '',
            productName: '',
            version: '',
            description: '',
            formulaParameters: [],
            equipmentRequirements: []
        })
    }
});

const emit = defineEmits(['update:modelValue', 'close']);

function getSafeConfig(obj) {
    // Defensive: always return a config with all fields present and correct types
    return {
        listHeaderId: typeof obj?.listHeaderId === 'string' ? obj.listHeaderId : 'ListHeadID',
        listHeaderCreateDate: typeof obj?.listHeaderCreateDate === 'string' ? obj.listHeaderCreateDate : '',
        batchInfoDescription: typeof obj?.batchInfoDescription === 'string' ? obj.batchInfoDescription : '',
        masterRecipeId: typeof obj?.masterRecipeId === 'string' ? obj.masterRecipeId : 'MasterRecipeHC',
        masterRecipeVersion: typeof obj?.masterRecipeVersion === 'string' ? obj.masterRecipeVersion : '1.0.0',
        masterRecipeVersionDate: typeof obj?.masterRecipeVersionDate === 'string' ? obj.masterRecipeVersionDate : '',
        masterRecipeDescription: typeof obj?.masterRecipeDescription === 'string' ? obj.masterRecipeDescription : '',
        productId: typeof obj?.productId === 'string' ? obj.productId : '',
        productName: typeof obj?.productName === 'string' ? obj.productName : '',
        version: typeof obj?.version === 'string' ? obj.version : '',
        description: typeof obj?.description === 'string' ? obj.description : '',
        formulaParameters: Array.isArray(obj?.formulaParameters) ? obj.formulaParameters.map(p => ({
            id: typeof p?.id === 'string' ? p.id : '',
            value: typeof p?.value === 'string' ? p.value : '',
            dataType: typeof p?.dataType === 'string' ? p.dataType : '',
            unit: typeof p?.unit === 'string' ? p.unit : ''
        })) : [],
        equipmentRequirements: Array.isArray(obj?.equipmentRequirements) ? obj.equipmentRequirements.map(r => ({
            id: typeof r?.id === 'string' ? r.id : '',
            constraint: typeof r?.constraint === 'string' ? r.constraint : '',
            description: typeof r?.description === 'string' ? r.description : ''
        })) : []
    };
}

const safeConfig = computed({
    get() {
        return getSafeConfig(props.modelValue);
    },
    set(val) {
        emit('update:modelValue', JSON.parse(JSON.stringify(getSafeConfig(val))));
    }
});

function addFormulaParameter() {
    const arr = safeConfig.value.formulaParameters.slice();
    arr.push({ id: '', value: '', dataType: '', unit: '' });
    safeConfig.value = { ...safeConfig.value, formulaParameters: arr };
}

function removeFormulaParameter(index) {
    const arr = safeConfig.value.formulaParameters.slice();
    arr.splice(index, 1);
    safeConfig.value = { ...safeConfig.value, formulaParameters: arr };
}

function addEquipmentRequirement() {
    const arr = safeConfig.value.equipmentRequirements.slice();
    arr.push({ id: '', constraint: '', description: '' });
    safeConfig.value = { ...safeConfig.value, equipmentRequirements: arr };
}

function removeEquipmentRequirement(index) {
    const arr = safeConfig.value.equipmentRequirements.slice();
    arr.splice(index, 1);
    safeConfig.value = { ...safeConfig.value, equipmentRequirements: arr };
}

// Always use the current datetime for Create Date
const currentCreateDate = computed(() => new Date().toISOString());

function saveConfig() {
    // Always set create date to now
    const configToSave = { ...safeConfig.value, listHeaderCreateDate: new Date().toISOString() };
    emit('update:modelValue', JSON.parse(JSON.stringify(configToSave)));
    localStorage.setItem('masterRecipeConfig', JSON.stringify(JSON.parse(JSON.stringify(configToSave))));
}

function resetConfig() {
    safeConfig.value = getSafeConfig({
        listHeaderId: 'ListHeadID',
        listHeaderCreateDate: '',
        batchInfoDescription: '',
        masterRecipeId: 'MasterRecipeHC',
        masterRecipeVersion: '1.0.0',
        masterRecipeVersionDate: '',
        masterRecipeDescription: '',
        productId: '',
        productName: '',
        version: '',
        description: '',
        formulaParameters: [],
        equipmentRequirements: []
    });
}

// Load saved config on mount
const savedConfig = localStorage.getItem('masterRecipeConfig');
if (savedConfig) {
    try {
        const parsed = JSON.parse(savedConfig);
        safeConfig.value = getSafeConfig(parsed);
    } catch (e) {
        safeConfig.value = getSafeConfig({});
        console.warn('Failed to load saved master recipe config:', e);
    }
}

defineExpose({
    getConfig: () => JSON.parse(JSON.stringify(safeConfig.value)),
    saveConfig,
    resetConfig
});
</script>

<style scoped>
.master-recipe-config-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90vw;
    max-width: 800px;
    max-height: 90vh;
    background: white;
    border: 2px solid #007bff;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    overflow-y: auto;
    padding: 0;
}

.config-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 25px;
    background: linear-gradient(135deg, #007bff, #0056b3);
    color: white;
    border-radius: 10px 10px 0 0;
}

.config-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
}

.close-button {
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    padding: 5px;
    border-radius: 50%;
    width: 35px;
    height: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease;
}

.close-button:hover {
    background-color: rgba(255, 255, 255, 0.2);
}

.config-section {
    margin: 20px 25px;
    padding: 20px;
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
}

.config-section h3 {
    color: #495057;
    font-size: 18px;
    margin-bottom: 20px;
    font-weight: 600;
    border-bottom: 2px solid #007bff;
    padding-bottom: 8px;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    font-weight: 600;
    color: #495057;
    margin-bottom: 5px;
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ced4da;
    border-radius: 6px;
    font-size: 14px;
    box-sizing: border-box;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-group select {
    padding-right: 34px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.form-group textarea {
    resize: vertical;
    min-height: 80px;
}

.parameter-config,
.requirement-config {
    position: relative;
    padding: 20px;
    margin-bottom: 15px;
    background-color: white;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    border-left: 4px solid #28a745;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.remove-button {
    position: absolute;
    top: 15px;
    right: 15px;
    background: none;
    border: none;
    color: #dc3545;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: background-color 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.remove-button:hover {
    background-color: #ffebee;
}

.add-button {
    background-color: #28a745;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: background-color 0.2s ease;
    width: 100%;
    margin-top: 10px;
}

.add-button:hover {
    background-color: #218838;
}

.action-buttons {
    display: flex;
    gap: 15px;
    padding: 20px 25px;
    background-color: #f8f9fa;
    border-top: 1px solid #dee2e6;
    border-radius: 0 0 10px 10px;
}

.save-button,
.reset-button {
    flex: 1;
    padding: 12px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: background-color 0.2s ease;
}

.save-button {
    background-color: #007bff;
    color: white;
}

.save-button:hover {
    background-color: #0056b3;
}

.reset-button {
    background-color: #6c757d;
    color: white;
}

.reset-button:hover {
    background-color: #545b62;
}

/* Responsive design */
@media (max-width: 768px) {
    .master-recipe-config-panel {
        width: 95vw;
        max-height: 95vh;
    }

    .config-section {
        margin: 15px;
        padding: 15px;
    }

    .action-buttons {
        flex-direction: column;
        gap: 10px;
    }
}
</style>
