<template>
  <PropertyWindowBase
    v-bind="props"
    @close="emit('close')"
    @openInWorkspace="emit('openInWorkspace')"
    @deleteElement="emit('deleteElement')"
    @update:selectedElement="emit('update:selectedElement', $event)"
  >
    <!-- TODO: move general-recipe property fields here -->
         <!-- Material Properties Section - Shown only for material-type elements -->
    <div v-show='computedSelectedElement.type == "material"'>
      <label for="materialType">MaterialType:</label>
      <select id="materialType" v-model="computedSelectedElement.materialType">
        <option value="Input">Input</option>
        <option value="Intermediate">Intermediate</option>
        <option value="Output">Output</option>
      </select>

      <label for="materialID">MaterialID:</label>
      <input type="text" id="materialID" v-model="computedSelectedElement.materialID" />

      <label for="order">Order:</label>
      <input type="text" id="order" v-model="computedSelectedElement.order" />

      <label for="amount">Amount:</label>
      <ValueTypeProperty 
      :id="'amount'" 
      :valueType="computedSelectedElement.amount"
      @update:valueType="computedSelectedElement.amount = $event" />
    </div>

    <div>
        <h2>Parameters</h2>

        <!-- Process Element Parameters -->
        <div v-if="(computedSelectedElement.processElementParameter || []).length > 0">
          <h3>Process Element Parameters</h3>
          <div v-for="(parameter, index) in (computedSelectedElement.processElementParameter || [])"
            :key="`process_${index}`" class="container-with-border">
            <label :for="'parameter_' + index + '_id'">ID:</label>
            <input type="text" :id="'parameter_' + index + '_id'" v-model="parameter.id" />
            <label :for="'parameter_' + index + '_description'">Description:</label>
            <input type="text" :id="'parameter_' + index + '_description'" v-model="parameter.description[0]" />
            <label :for="'parameter_' + index + '_valueType'">ParameterValue:</label>
            <ValueTypeProperty :id="'parameter_' + index + '_valueType'" :valueType="parameter.value"
              :minValue="getParameterMinValue(parameter)" :maxValue="getParameterMaxValue(parameter)"
              :unit="getParameterUnit(parameter)" @update:valueType="parameter.value = $event"
              @validation-error="handleParameterValidationError(index, $event)" />
          </div>
        </div>

        <!-- Other Information -->
        <div v-if="computedSelectedElement.otherInformation && computedSelectedElement.otherInformation.length > 0">
          <h3>Other Information</h3>
          <div v-for="(otherInformation, index) in (computedSelectedElement.otherInformation || [])"
            :key="`other_${index}`" class="container-with-border">
            <label :for="'otherInformation_' + index + '_otherInfoID'">ID:</label>
            <input type="text" :id="'otherInformation_' + index + '_otherInfoID'"
              v-model="otherInformation.otherInfoID" />
            <label :for="'otherInformation_' + index + '_description'">Description:</label>
            <input type="text" :id="'otherInformation_' + index + '_description'"
              v-model="otherInformation.description[0]" />
            <label :for="'otherInformation_' + index + '_otherValue'">OtherValue:</label>
            <ValueTypeProperty :valueType="otherInformation.otherValue[0]"
              @update:valueType="otherInformation.otherValue[0] = $event" />
          </div>
        </div>

        <!-- Resource Constraints -->
        <div v-if="computedSelectedElement.resourceConstraint && computedSelectedElement.resourceConstraint.length > 0">
          <h3>Resource Constraints</h3>
          <div v-for="(resourceConstraint, index) in (computedSelectedElement.resourceConstraint || [])"
            :key="`resource_${index}`" class="container-with-border">
            <label :for="'resourceConstraint_' + index + '_constrainedID'">ID:</label>
            <input type="text" :id="'resourceConstraint_' + index + '_constrainedID'"
              v-model="resourceConstraint.constrinedID" />
            <label :for="'resourceConstraint_' + index + '_description'">Description:</label>
            <input type="text" :id="'resourceConstraint_' + index + '_description'"
              v-model="resourceConstraint.description[0]" />
            <label :for="'resourceConstraint_' + index + '_constraintType'">ConstraintType:</label>
            <select :id="'resourceConstraint_' + index + '_constraintType'" v-model="resourceConstraint.constraintType">
              <option value="Required">Required</option>
              <option value="Optional">Optional</option>
              <option value="Other">Other</option>
            </select>
            <label :for="'resourceConstraint_' + index + '_lifeCycleState'">LifeCycleState:</label>
            <input type="text" :id="'resourceConstraint_' + index + '_lifeCycleState'"
              v-model="resourceConstraint.lifeCycleState" />
            <label :for="'resourceConstraint_' + index + '_range'">Range:</label>
            <ValueTypeProperty :id="'resourceConstraint_' + index + '_range'" :valueType="resourceConstraint.range"
              @update:valueType="resourceConstraint.valueType = $event" />
            <label
              :for="'resourceConstraint_' + index + '_resourceConstraintProperty'">ResourceConstraintProperty:</label>
            <input type="text" :id="'resourceConstraint_' + index + '_resourceConstraintProperty'"
              v-model="resourceConstraint.resourceConstraintProperty" />
          </div>
        </div>

        <!-- Add buttons for each type -->
        <div class="add-buttons-container">
          <button @click="addProcessElementParameter" id="addProcessElementParameter" class="add-button">
            <span class="material-icons-light">+</span> Add Process Parameter
          </button>
          <button @click="addOtherInformation" id="addOtherValue" class="add-button">
            <span class="material-icons-light">+</span> Add Other Information
          </button>
          <button @click="addResourceConstraint" id="addResourceConstraint" class="add-button">
            <span class="material-icons-light">+</span> Add Resource Constraint
          </button>
        </div>
      </div>


    <!---->
  </PropertyWindowBase>
</template>

<script setup>
import { computed, ref } from 'vue';
import PropertyWindowBase from '@/shell/ui/workspace/PropertyWindowBase.vue';
import ValueTypeProperty from '@/shell/ui/workspace/ValueTypeProperty.vue';

const props = defineProps({
  selectedElement: Object,
  mode: {
    type: String,
    default: 'general'
  },
  workspaceItems: {
    type: Array,
    default: () => []
  },
  connections: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'openInWorkspace', 'deleteElement', 'update:selectedElement']);
const computedSelectedElement = computed({
  get: () => props.selectedElement,
  set: (newValue) => {
    emit('update:selectedElement', newValue);
  },
});

const validationErrors = ref(new Set());

const getParameterMinValue = (parameter) => {
  if (!computedSelectedElement.value.equipmentInfo ||
    !computedSelectedElement.value.equipmentInfo.equipment_data ||
    !computedSelectedElement.value.equipmentInfo.equipment_data.recipe_parameters) {
    return null;
  }

  const equipmentParam = computedSelectedElement.value.equipmentInfo.equipment_data.recipe_parameters
    .find(p => p.id === parameter.id || p.name === parameter.id);

  return equipmentParam ? equipmentParam.min : null;
};

const getParameterMaxValue = (parameter) => {
  if (!computedSelectedElement.value.equipmentInfo ||
    !computedSelectedElement.value.equipmentInfo.equipment_data ||
    !computedSelectedElement.value.equipmentInfo.equipment_data.recipe_parameters) {
    return null;
  }

  const equipmentParam = computedSelectedElement.value.equipmentInfo.equipment_data.recipe_parameters
    .find(p => p.id === parameter.id || p.name === parameter.id);

  return equipmentParam ? equipmentParam.max : null;
};

const getParameterUnit = (parameter) => {
  if (!computedSelectedElement.value.equipmentInfo ||
    !computedSelectedElement.value.equipmentInfo.equipment_data ||
    !computedSelectedElement.value.equipmentInfo.equipment_data.recipe_parameters) {
    return '';
  }

  const equipmentParam = computedSelectedElement.value.equipmentInfo.equipment_data.recipe_parameters
    .find(p => p.id === parameter.id || p.name === parameter.id);

  return equipmentParam ? equipmentParam.unit : '';
};

const handleParameterValidationError = (index, hasError) => {
  if (hasError) {
    validationErrors.value.add(`parameter_${index}`);
  } else {
    validationErrors.value.delete(`parameter_${index}`);
  }
};


/**
 * Function to add a new process element parameter to the current element's processElementParameter list.
 * This function is called when the user clicks the "Add Process Parameter" button.
 * It ensures the processElementParameter is an array and adds a new parameter object.
 */
function addProcessElementParameter() {
  if (!Array.isArray(computedSelectedElement.value.processElementParameter)) {
    computedSelectedElement.value.processElementParameter = []
  }
  computedSelectedElement.value.processElementParameter.push({ id: '', description: [''], value: [{ valueString: '', dataType: '', unitOfMeasure: '', key: '' }] });
}

/**
 * Function to add a new other information item to the current element's otherInformation list.
 * This function is called when the user clicks the "Add Other Information" button.
 * It ensures the otherInformation is an array and adds a new other information object.
 */
function addOtherInformation() {
  if (!Array.isArray(computedSelectedElement.value.otherInformation)) {
    computedSelectedElement.value.otherInformation = []
  }
  computedSelectedElement.value.otherInformation.push({ otherInfoId: '', description: [''], otherValue: [{ valueString: '', dataType: '', unitOfMeasure: '', key: '' }] });
}

/**
 * Function to add a new resource constraint to the current element's resourceConstraint list.
 * This function is called when the user clicks the "Add Resource Constraint" button.
 * It ensures the resourceConstraint is an array and adds a new resource constraint object.
 */
function addResourceConstraint() {
  if (!Array.isArray(computedSelectedElement.value.resourceConstraint)) {
    computedSelectedElement.value.resourceConstraint = []
  }
  computedSelectedElement.value.resourceConstraint.push({ constraintID: '', description: [''], constraintType: '', lifeCycleState: '', range: [{ valueString: '', dataType: '', unitOfMeasure: '', key: '' }], resourceConstraintProperty: '' });
}


</script>

<style>
/* Unified Parameters Section */
.add-buttons-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
}

.add-button {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.add-button:hover {
  background-color: #0056b3;
}

.add-button .material-icons-light {
  font-size: 14px;
}
</style>
