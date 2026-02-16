<template>
  <div>
    <label for="materialType">Material Type:</label>
    <select id="materialType" v-model="selectedElementModel.materialType">
      <option value="Input">Input</option>
      <option value="Intermediate">Intermediate</option>
      <option value="Output">Output</option>
    </select>

    <label for="materialID">MaterialID (Ref. MaterialDefinition.ID):</label>
    <input type="text" id="materialID" v-model="selectedElementModel.materialID" />

    <label for="order">Order:</label>
    <input type="text" id="order" v-model="selectedElementModel.order" />

    <label for="amount">Amount (QuantityValueType):</label>
    <ValueTypeProperty
      :id="'amount'"
      :valueType="selectedElementModel.amount"
      @update:valueType="selectedElementModel.amount = $event"
    />

    <div class="section">
      <div class="section-header">
        <h3>Material Property</h3>
        <button
          type="button"
          class="section-add-button"
          aria-label="Add Material Property"
          @click="addMaterialSpecificationProperty"
        >
          +
        </button>
      </div>
      <p class="section-subtitle">
        Export: separate artefact MaterialInformation.xml
      </p>

      <div
        v-for="(property, index) in (selectedElementModel.materialSpecificationProperty || [])"
        :key="`material_spec_property_${index}`"
        class="container-with-border container-with-actions"
      >
        <button
          type="button"
          class="button-with-border--red item-delete-button"
          @click="removeMaterialSpecificationProperty(index)"
          aria-label="Delete Material Property"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M7 21q-.825 0-1.413-.588T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.588 1.413T17 21H7ZM17 6H7v13h10V6ZM9 17h2V8H9v9Zm4 0h2V8h-2v9ZM7 6v13V6Z"
            />
          </svg>
        </button>

        <label :for="`material_spec_property_${index}_materialDefinitionPropertyId`">
          Material Property ID:
        </label>
        <input
          type="text"
          :id="`material_spec_property_${index}_materialDefinitionPropertyId`"
          v-model="property.materialDefinitionPropertyID"
        />

        <label :for="`material_spec_property_${index}_description`">Material Property Description:</label>
        <input
          type="text"
          :id="`material_spec_property_${index}_description`"
          v-model="property.description"
        />

        <div class="value-type-header">
          <label>Material Property Value (ValueType):</label>
          <button
            type="button"
            class="section-add-button"
            aria-label="Add Material Property ValueType"
            @click="addMaterialPropertyValueType(property)"
          >
            +
          </button>
        </div>

        <div
          v-for="(valueType, valueIndex) in getMaterialPropertyValueTypes(property)"
          :key="`material_spec_property_${index}_value_${valueIndex}`"
          class="container-with-actions value-type-block"
        >
          <button
            v-if="valueIndex > 0"
            type="button"
            class="button-with-border--red item-delete-button"
            @click="removeMaterialPropertyValueType(property, valueIndex)"
            aria-label="Delete Material Property ValueType"
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
            @update:valueType="updateMaterialPropertyValueType(property, valueIndex, $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
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

function emptyValueType() {
  return { valueString: '', dataType: '', unitOfMeasure: '', key: '' };
}

function getMaterialPropertyValueTypes(property) {
  const values = ensureMaterialPropertyValueTypes(property);
  return values.length > 0 ? values : [emptyValueType()];
}

function ensureMaterialPropertyValueTypes(property) {
  if (!property || typeof property !== 'object') {
    return [];
  }

  if (!Array.isArray(property.value) || property.value.length === 0) {
    property.value = [emptyValueType()];
  }

  return property.value;
}

function addMaterialPropertyValueType(property) {
  const values = ensureMaterialPropertyValueTypes(property);
  values.push(emptyValueType());
}

function removeMaterialPropertyValueType(property, valueIndex) {
  const values = ensureMaterialPropertyValueTypes(property);
  if (values.length <= 1) return;
  values.splice(valueIndex, 1);
}

function updateMaterialPropertyValueType(property, valueIndex, newValue) {
  const values = ensureMaterialPropertyValueTypes(property);
  values[valueIndex] = newValue;
}

function addMaterialSpecificationProperty() {
  if (!Array.isArray(selectedElementModel.value.materialSpecificationProperty)) {
    selectedElementModel.value.materialSpecificationProperty = [];
  }
  selectedElementModel.value.materialSpecificationProperty.push({
    description: '',
    materialDefinitionPropertyID: '',
    value: [emptyValueType()]
  });
}

function removeMaterialSpecificationProperty(index) {
  if (!Array.isArray(selectedElementModel.value.materialSpecificationProperty)) return;
  selectedElementModel.value.materialSpecificationProperty.splice(index, 1);
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

.section-subtitle {
  margin: 4px 0 10px 0;
  color: #c7c7c7;
  font-size: 0.88rem;
  line-height: 1.3;
}

.value-type-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}

.value-type-header label {
  margin: 0;
}

.value-type-block + .value-type-block {
  margin-top: 10px;
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
</style>
