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
    <div class="section">
      <div class="section-header">
        <h3>Process Element Parameters</h3>
        <button
          type="button"
          class="section-add-button"
          aria-label="Add process element parameter"
          @click="addProcessElementParameter"
        >
          +
        </button>
      </div>
      <div
        v-for="(parameter, index) in (selectedElementModel.processElementParameter || [])"
        :key="`process_${index}`"
        class="container-with-border container-with-actions"
      >
        <button
          type="button"
          class="button-with-border--red item-delete-button"
          @click="removeProcessElementParameter(index)"
          aria-label="Delete process element parameter"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M7 21q-.825 0-1.413-.588T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.588 1.413T17 21H7ZM17 6H7v13h10V6ZM9 17h2V8H9v9Zm4 0h2V8h-2v9ZM7 6v13V6Z"
            />
          </svg>
        </button>
        <label :for="'parameter_' + index + '_id'">ID:</label>
        <input type="text" :id="'parameter_' + index + '_id'" v-model="parameter.id" />
        <label :for="'parameter_' + index + '_description'">Description:</label>
        <input type="text" :id="'parameter_' + index + '_description'" v-model="parameter.description[0]" />
        <div class="value-type-header">
          <label>ParameterValue:</label>
          <button
            type="button"
            class="section-add-button"
            aria-label="Add ParameterValue"
            @click="addParameterValueType(parameter)"
          >
            +
          </button>
        </div>

        <div
          v-for="(valueType, valueIndex) in getValueTypes(parameter, 'value')"
          :key="`parameter_${index}_value_${valueIndex}`"
          class="container-with-actions value-type-block"
        >
          <button
            v-if="valueIndex > 0"
            type="button"
            class="button-with-border--red item-delete-button"
            @click="removeParameterValueType(parameter, valueIndex)"
            aria-label="Delete ParameterValue"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M7 21q-.825 0-1.413-.588T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.588 1.413T17 21H7ZM17 6H7v13h10V6ZM9 17h2V8H9v9Zm4 0h2V8h-2v9ZM7 6v13V6Z"
              />
            </svg>
          </button>

          <ValueTypeProperty
            :valueType="valueType"
            :minValue="getParameterMinValue(parameter)"
            :maxValue="getParameterMaxValue(parameter)"
            :unit="getParameterUnit(parameter)"
            @update:valueType="updateParameterValueType(parameter, valueIndex, $event)"
            @validation-error="handleParameterValidationError(index, valueIndex, $event)"
          />
        </div>
      </div>
    </div>

    <!-- Resource Constraints -->
    <div class="section">
      <div class="section-header">
        <h3>Resource Constraints</h3>
        <button
          type="button"
          class="section-add-button"
          aria-label="Add resource constraint"
          @click="addResourceConstraint"
        >
          +
        </button>
      </div>
      <div
        v-for="(resourceConstraint, index) in (selectedElementModel.resourceConstraint || [])"
        :key="`resource_${index}`"
        class="container-with-border container-with-actions"
      >
        <button
          type="button"
          class="button-with-border--red item-delete-button"
          @click="removeResourceConstraint(index)"
          aria-label="Delete resource constraint"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M7 21q-.825 0-1.413-.588T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.588 1.413T17 21H7ZM17 6H7v13h10V6ZM9 17h2V8H9v9Zm4 0h2V8h-2v9ZM7 6v13V6Z"
            />
          </svg>
        </button>
        <label :for="'resourceConstraint_' + index + '_constraintID'">ID:</label>
        <input
          type="text"
          :id="'resourceConstraint_' + index + '_constraintID'"
          v-model="resourceConstraint.constraintID"
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
        <div class="value-type-header">
          <label>Range:</label>
          <button
            type="button"
            class="section-add-button"
            aria-label="Add Range"
            @click="addResourceConstraintRangeValueType(resourceConstraint)"
          >
            +
          </button>
        </div>

        <div
          v-for="(valueType, valueIndex) in getValueTypes(resourceConstraint, 'range')"
          :key="`resourceConstraint_${index}_range_${valueIndex}`"
          class="container-with-actions value-type-block"
        >
          <button
            v-if="valueIndex > 0"
            type="button"
            class="button-with-border--red item-delete-button"
            @click="removeResourceConstraintRangeValueType(resourceConstraint, valueIndex)"
            aria-label="Delete Range"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M7 21q-.825 0-1.413-.588T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.588 1.413T17 21H7ZM17 6H7v13h10V6ZM9 17h2V8H9v9Zm4 0h2V8h-2v9ZM7 6v13V6Z"
              />
            </svg>
          </button>

          <ValueTypeProperty
            :valueType="valueType"
            @update:valueType="updateResourceConstraintRangeValueType(resourceConstraint, valueIndex, $event)"
          />
        </div>
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

    <!-- Other Information -->
    <div class="section">
      <div class="section-header">
        <h3>Other Information</h3>
        <button
          type="button"
          class="section-add-button"
          aria-label="Add other information"
          @click="addOtherInformation"
        >
          +
        </button>
      </div>
      <div
        v-for="(otherInformation, index) in (selectedElementModel.otherInformation || [])"
        :key="`other_${index}`"
        class="container-with-border container-with-actions"
      >
        <button
          type="button"
          class="button-with-border--red item-delete-button"
          @click="removeOtherInformation(index)"
          aria-label="Delete other information"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M7 21q-.825 0-1.413-.588T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.588 1.413T17 21H7ZM17 6H7v13h10V6ZM9 17h2V8H9v9Zm4 0h2V8h-2v9ZM7 6v13V6Z"
            />
          </svg>
        </button>
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
        <div class="value-type-header">
          <label>OtherValue:</label>
          <button
            type="button"
            class="section-add-button"
            aria-label="Add OtherValue"
            @click="addOtherInformationValueType(otherInformation)"
          >
            +
          </button>
        </div>

        <div
          v-for="(valueType, valueIndex) in getValueTypes(otherInformation, 'otherValue')"
          :key="`otherInformation_${index}_otherValue_${valueIndex}`"
          class="container-with-actions value-type-block"
        >
          <button
            v-if="valueIndex > 0"
            type="button"
            class="button-with-border--red item-delete-button"
            @click="removeOtherInformationValueType(otherInformation, valueIndex)"
            aria-label="Delete OtherValue"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M7 21q-.825 0-1.413-.588T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.588 1.413T17 21H7ZM17 6H7v13h10V6ZM9 17h2V8H9v9Zm4 0h2V8h-2v9ZM7 6v13V6Z"
              />
            </svg>
          </button>

          <ValueTypeProperty
            :valueType="valueType"
            @update:valueType="updateOtherInformationValueType(otherInformation, valueIndex, $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import ValueTypeProperty from '@/features/general-recipe/ui/property-window/ValueTypeProperty.vue';

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

function emptyValueType() {
  return { valueString: '', dataType: '', unitOfMeasure: '', key: '' };
}

function getValueTypes(holder, fieldName) {
  const values = ensureValueTypes(holder, fieldName);
  return values.length > 0 ? values : [emptyValueType()];
}

function ensureValueTypes(holder, fieldName) {
  if (!holder || typeof holder !== 'object') {
    return [];
  }

  const value = holder[fieldName];
  if (!Array.isArray(value) || value.length === 0) {
    holder[fieldName] = [emptyValueType()];
  }

  return holder[fieldName];
}

function addParameterValueType(parameter) {
  ensureValueTypes(parameter, 'value').push(emptyValueType());
}

function removeParameterValueType(parameter, valueIndex) {
  const values = ensureValueTypes(parameter, 'value');
  if (values.length <= 1) return;
  values.splice(valueIndex, 1);
}

function updateParameterValueType(parameter, valueIndex, newValue) {
  const values = ensureValueTypes(parameter, 'value');
  values[valueIndex] = newValue;
}

function addResourceConstraintRangeValueType(resourceConstraint) {
  ensureValueTypes(resourceConstraint, 'range').push(emptyValueType());
}

function removeResourceConstraintRangeValueType(resourceConstraint, valueIndex) {
  const values = ensureValueTypes(resourceConstraint, 'range');
  if (values.length <= 1) return;
  values.splice(valueIndex, 1);
}

function updateResourceConstraintRangeValueType(resourceConstraint, valueIndex, newValue) {
  const values = ensureValueTypes(resourceConstraint, 'range');
  values[valueIndex] = newValue;
}

function addOtherInformationValueType(otherInformation) {
  ensureValueTypes(otherInformation, 'otherValue').push(emptyValueType());
}

function removeOtherInformationValueType(otherInformation, valueIndex) {
  const values = ensureValueTypes(otherInformation, 'otherValue');
  if (values.length <= 1) return;
  values.splice(valueIndex, 1);
}

function updateOtherInformationValueType(otherInformation, valueIndex, newValue) {
  const values = ensureValueTypes(otherInformation, 'otherValue');
  values[valueIndex] = newValue;
}

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

const handleParameterValidationError = (parameterIndex, valueIndex, hasError) => {
  const key = `parameter_${parameterIndex}_value_${valueIndex}`;
  if (hasError) {
    validationErrors.value.add(key);
  } else {
    validationErrors.value.delete(key);
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
    value: [emptyValueType()]
  });
}

function addOtherInformation() {
  if (!Array.isArray(selectedElementModel.value.otherInformation)) {
    selectedElementModel.value.otherInformation = [];
  }
  selectedElementModel.value.otherInformation.push({
    otherInfoID: '',
    description: [''],
    otherValue: [emptyValueType()]
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
    range: [emptyValueType()],
    resourceConstraintProperty: ''
  });
}

function removeProcessElementParameter(index) {
  if (!Array.isArray(selectedElementModel.value.processElementParameter)) return;
  selectedElementModel.value.processElementParameter.splice(index, 1);
}

function removeOtherInformation(index) {
  if (!Array.isArray(selectedElementModel.value.otherInformation)) return;
  selectedElementModel.value.otherInformation.splice(index, 1);
}

function removeResourceConstraint(index) {
  if (!Array.isArray(selectedElementModel.value.resourceConstraint)) return;
  selectedElementModel.value.resourceConstraint.splice(index, 1);
}
</script>

<style>
.section {
  margin-top: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-header h3 {
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.2;
}

.section-add-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s ease;
}

.section-add-button:hover {
  color: #28a745;
}

.section-add-button:focus-visible {
  outline: 2px solid #28a745;
  outline-offset: 2px;
}

.container-with-actions {
  position: relative;
}

.item-delete-button {
  position: absolute;
  top: 2px;
  right: 2px;
  padding: 0px 0px;
  line-height: 1;
}

.value-type-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}

.value-type-header label {
  margin: 0;
}

.value-type-block + .value-type-block {
  margin-top: 10px;
}

</style>
