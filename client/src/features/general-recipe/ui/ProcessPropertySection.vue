<template>
  <div>
    <label for="processElementType">Process Element Type:</label>
    <select id="processElementType" v-model="selectedElementModel.processElementType">
      <option value="Process">Process</option>
      <option value="Process Stage">Process Stage</option>
      <option value="Process Operation">Process Operation</option>
      <option value="Process Action">Process Action</option>
    </select>
  </div>
  <div>
    <!-- Process Element Parameters -->
    <div v-if="(selectedElementModel.processElementParameter || []).length > 0">
      <h3>Process Element Parameters</h3>
      <div
        v-for="(parameter, index) in (selectedElementModel.processElementParameter || [])"
        :key="`process_${index}`"
        class="container-with-border"
      >
        <label :for="'parameter_' + index + '_id'">ID:</label>
        <input type="text" :id="'parameter_' + index + '_id'" v-model="parameter.id" />
        <label :for="'parameter_' + index + '_description'">Description:</label>
        <input type="text" :id="'parameter_' + index + '_description'" v-model="parameter.description[0]" />
        <label :for="'parameter_' + index + '_valueType'">ParameterValue:</label>
        <ValueTypeProperty
          :id="'parameter_' + index + '_valueType'"
          :valueType="parameter.value"
          :minValue="getParameterMinValue(parameter)"
          :maxValue="getParameterMaxValue(parameter)"
          :unit="getParameterUnit(parameter)"
          @update:valueType="parameter.value = $event"
          @validation-error="handleParameterValidationError(index, $event)"
        />
      </div>
    </div>

    <!-- Other Information -->
    <div v-if="selectedElementModel.otherInformation && selectedElementModel.otherInformation.length > 0">
      <h3>Other Information</h3>
      <div
        v-for="(otherInformation, index) in (selectedElementModel.otherInformation || [])"
        :key="`other_${index}`"
        class="container-with-border"
      >
        <label :for="'otherInformation_' + index + '_otherInfoID'">ID:</label>
        <input
          type="text"
          :id="'otherInformation_' + index + '_otherInfoID'"
          v-model="otherInformation.otherInfoID"
        />
        <label :for="'otherInformation_' + index + '_description'">Description:</label>
        <input
          type="text"
          :id="'otherInformation_' + index + '_description'"
          v-model="otherInformation.description[0]"
        />
        <label :for="'otherInformation_' + index + '_otherValue'">OtherValue:</label>
        <ValueTypeProperty
          :valueType="otherInformation.otherValue[0]"
          @update:valueType="otherInformation.otherValue[0] = $event"
        />
      </div>
    </div>

    <!-- Resource Constraints -->
    <div v-if="selectedElementModel.resourceConstraint && selectedElementModel.resourceConstraint.length > 0">
      <h3>Resource Constraints</h3>
      <div
        v-for="(resourceConstraint, index) in (selectedElementModel.resourceConstraint || [])"
        :key="`resource_${index}`"
        class="container-with-border"
      >
        <label :for="'resourceConstraint_' + index + '_constrainedID'">ID:</label>
        <input
          type="text"
          :id="'resourceConstraint_' + index + '_constrainedID'"
          v-model="resourceConstraint.constrinedID"
        />
        <label :for="'resourceConstraint_' + index + '_description'">Description:</label>
        <input
          type="text"
          :id="'resourceConstraint_' + index + '_description'"
          v-model="resourceConstraint.description[0]"
        />
        <label :for="'resourceConstraint_' + index + '_constraintType'">ConstraintType:</label>
        <select
          :id="'resourceConstraint_' + index + '_constraintType'"
          v-model="resourceConstraint.constraintType"
        >
          <option value="Required">Required</option>
          <option value="Optional">Optional</option>
          <option value="Other">Other</option>
        </select>
        <label :for="'resourceConstraint_' + index + '_lifeCycleState'">LifeCycleState:</label>
        <input
          type="text"
          :id="'resourceConstraint_' + index + '_lifeCycleState'"
          v-model="resourceConstraint.lifeCycleState"
        />
        <label :for="'resourceConstraint_' + index + '_range'">Range:</label>
        <ValueTypeProperty
          :id="'resourceConstraint_' + index + '_range'"
          :valueType="resourceConstraint.range"
          @update:valueType="resourceConstraint.valueType = $event"
        />
        <label :for="'resourceConstraint_' + index + '_resourceConstraintProperty'">
          ResourceConstraintProperty:
        </label>
        <input
          type="text"
          :id="'resourceConstraint_' + index + '_resourceConstraintProperty'"
          v-model="resourceConstraint.resourceConstraintProperty"
        />
      </div>
    </div>

    <div class="add-buttons-container">
      <button @click="addProcessElementParameter" id="addProcessElementParameter" class="add-button">
        <span class="icon--light">+</span> Add Process Parameter
      </button>
      <button @click="addOtherInformation" id="addOtherValue" class="add-button">
        <span class="icon--light">+</span> Add Other Information
      </button>
      <button @click="addResourceConstraint" id="addResourceConstraint" class="add-button">
        <span class="icon--light">+</span> Add Resource Constraint
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import ValueTypeProperty from '@/shell/ui/workspace/ValueTypeProperty.vue';

const props = defineProps({
  selectedElement: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:selectedElement']);

const selectedElementModel = computed({
  get: () => props.selectedElement,
  set: (newValue) => emit('update:selectedElement', newValue)
});

watch(
  () => selectedElementModel.value,
  (element) => {
    if (element?.type === 'process' && !element.processElementType) {
      element.processElementType = 'Process';
    }
  },
  { immediate: true }
);

/* From now probably used for Parameters in Maste Recipe not General Recipe*/
// Try to find matching parameter in equipment data
const validationErrors = ref(new Set());

const getParameterMinValue = (parameter) => {
  if (!selectedElementModel.value.equipmentInfo ||
    !selectedElementModel.value.equipmentInfo.equipment_data ||
    !selectedElementModel.value.equipmentInfo.equipment_data.recipe_parameters) {
    return null;
  }
  const equipmentParam = selectedElementModel.value.equipmentInfo.equipment_data.recipe_parameters
    .find((p) => p.id === parameter.id || p.name === parameter.id);

  return equipmentParam ? equipmentParam.min : null;
};

const getParameterMaxValue = (parameter) => {
  if (!selectedElementModel.value.equipmentInfo ||
    !selectedElementModel.value.equipmentInfo.equipment_data ||
    !selectedElementModel.value.equipmentInfo.equipment_data.recipe_parameters) {
    return null;
  }

  const equipmentParam = selectedElementModel.value.equipmentInfo.equipment_data.recipe_parameters
    .find((p) => p.id === parameter.id || p.name === parameter.id);

  return equipmentParam ? equipmentParam.max : null;
};

const getParameterUnit = (parameter) => {
  if (!selectedElementModel.value.equipmentInfo ||
    !selectedElementModel.value.equipmentInfo.equipment_data ||
    !selectedElementModel.value.equipmentInfo.equipment_data.recipe_parameters) {
    return '';
  }

  const equipmentParam = selectedElementModel.value.equipmentInfo.equipment_data.recipe_parameters
    .find((p) => p.id === parameter.id || p.name === parameter.id);

  return equipmentParam ? equipmentParam.unit : '';
};

const handleParameterValidationError = (index, hasError) => {
  if (hasError) {
    validationErrors.value.add(`parameter_${index}`);
  } else {
    validationErrors.value.delete(`parameter_${index}`);
  }
};

/* Until here probably used for Parameters in Maste Recipe not General Recipe*/

function addProcessElementParameter() {
  if (!Array.isArray(selectedElementModel.value.processElementParameter)) {
    selectedElementModel.value.processElementParameter = [];
  }
  selectedElementModel.value.processElementParameter.push({
    id: '',
    description: [''],
    value: [{ valueString: '', dataType: '', unitOfMeasure: '', key: '' }]
  });
}

function addOtherInformation() {
  if (!Array.isArray(selectedElementModel.value.otherInformation)) {
    selectedElementModel.value.otherInformation = [];
  }
  selectedElementModel.value.otherInformation.push({
    otherInfoId: '',
    description: [''],
    otherValue: [{ valueString: '', dataType: '', unitOfMeasure: '', key: '' }]
  });
}

function addResourceConstraint() {
  if (!Array.isArray(selectedElementModel.value.resourceConstraint)) {
    selectedElementModel.value.resourceConstraint = [];
  }
  selectedElementModel.value.resourceConstraint.push({
    constraintID: '',
    description: [''],
    constraintType: '',
    lifeCycleState: '',
    range: [{ valueString: '', dataType: '', unitOfMeasure: '', key: '' }],
    resourceConstraintProperty: ''
  });
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

.add-button .icon {
  font-size: 14px;
}
</style>
