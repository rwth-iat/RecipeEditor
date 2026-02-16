<template>
  <div v-if="computedValueType" class="container-with-border">
    <label>
      ValueString:
      <input
        type="text"
        v-model="computedValueType.valueString"
        @input="validateInput"
        :class="{ 'validation-error': hasValidationError }"
        :title="validationMessage"
      />
    </label>
    <span v-if="hasValidationError" class="validation-error-message">
      {{ validationMessage }}
    </span>
    <label>
      DataType:
      <input type="text" v-model="computedValueType.dataType" default="Text" />
    </label>
    <!--allowed Datatypes['Amount', 'BinaryObject', 'Code', 'DateTime', 'Identifier', 'Indicator', 'Measure', 'Numeric', 'Quantity', 'Text', 'string', 'byte', 'unsignedByte', 'binary', 'integer', 'positiveInteger', 'negativeInteger', 'nonNegativeInteger', 'nonPositiveInteger', 'int', 'unsignedInt', 'long', 'unsignedLong', 'short', 'unsignedShort', 'decimal', 'float', 'double', 'boolean', 'time', 'timeInstant', 'timePeriod', 'duration', 'date', 'dateTime', 'month', 'year', 'century', 'recurringDay', 'recurringDate', 'recurringDuration', 'Name', 'QName', 'NCName', 'uriReference', 'language', 'ID', 'IDREF', 'IDREFS', 'ENTITY', 'ENTITIES', 'NOTATION', 'NMTOKEN', 'NMTOKENS', 'Enumeration', 'SVG', 'Other']-->
    <label>
      UnitOfMeasure:
      <input type="text" v-model="computedValueType.unitOfMeasure" />
    </label>
    <label>
      Key:
      <input type="text" v-model="computedValueType.key" />
    </label>
  </div>
</template>

<script setup>
import '@/shell/assets/main.scss'; //import global css
import { computed, ref } from 'vue';

const props = defineProps({
  valueType: Object,
  minValue: {
    type: [Number, String],
    default: null
  },
  maxValue: {
    type: [Number, String],
    default: null
  },
  unit: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:valueType', 'validation-error']);

// Validation state
const hasValidationError = ref(false);
const validationMessage = ref('');

// Create a computed property that represents the entire selectedElement
// this is recommended solution to achieve two way binding between the parent and this child component
// this way the parent component is the only one setting values.
// it define a get and set method:
//    -get: take the given object from the parent
//    -set: emit to parent new object. The parent then sets the new value
const computedValueType = computed({
  get: () => props.valueType,
  set: (newValue) => {
    emit('update:valueType', newValue);
  },
});

// Validation function
const validateInput = () => {
  const value = computedValueType.value.valueString;

  // Skip validation if no value or no constraints
  if (!value || (!props.minValue && !props.maxValue)) {
    hasValidationError.value = false;
    validationMessage.value = '';
    emit('validation-error', false);
    return;
  }

  // Try to parse as number
  const numValue = parseFloat(value);
  const isNumeric = !isNaN(numValue);

  if (!isNumeric) {
    hasValidationError.value = false;
    validationMessage.value = '';
    emit('validation-error', false);
    return;
  }

  let error = false;
  let message = '';

  // Check minimum value
  if (props.minValue !== null && props.minValue !== undefined) {
    const minVal = parseFloat(props.minValue);
    if (numValue < minVal) {
      error = true;
      message = `Value must be at least ${minVal}${props.unit ? ' ' + props.unit : ''}`;
    }
  }

  // Check maximum value
  if (props.maxValue !== null && props.maxValue !== undefined) {
    const maxVal = parseFloat(props.maxValue);
    if (numValue > maxVal) {
      error = true;
      message = `Value must not exceed ${maxVal}${props.unit ? ' ' + props.unit : ''}`;
    }
  }

  hasValidationError.value = error;
  validationMessage.value = message;
  emit('validation-error', error);

  // If there's an error, prevent the invalid value from being set
  if (error) {
    // Revert to the last valid value or clear the input
    const lastValidValue = getLastValidValue();
    if (lastValidValue !== null) {
      computedValueType.value.valueString = lastValidValue;
    }
  }
};

// Keep track of last valid value
let lastValidValue = null;

const getLastValidValue = () => {
  return lastValidValue;
};

// Watch for changes and update last valid value
const updateLastValidValue = () => {
  const value = computedValueType.value.valueString;
  if (value && !hasValidationError.value) {
    lastValidValue = value;
  }
};

// Update last valid value when validation passes
if (!hasValidationError.value && computedValueType.value.valueString) {
  updateLastValidValue();
}
</script>

<style>
label {
  display: block;
}

label input[type=text] {
  display: block;
}

/* Style inputs */
input[type=text],
select {
  width: 100%;
  padding: 12px 20px;
  margin: 8px 0;
  display: inline-block;
  border: 1px solid var(--light);
  border-radius: 4px;
  box-sizing: border-box;
}

select {
  padding-right: 34px;
}

/* Validation error styling */
input.validation-error {
  border: 2px solid #dc3545 !important;
  background-color: #f8d7da !important;
  color: #721c24 !important;
}

.validation-error-message {
  color: #dc3545;
  font-size: 12px;
  font-weight: 600;
  margin-top: 5px;
  display: block;
}

/* Style the submit button */
input[type=submit] {
  width: 100%;
  background-color: #04AA6D;
  color: white;
  padding: 14px 20px;
  margin: 8px 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* Add a background color to the submit button on mouse-over */
input[type=submit]:hover {
  background-color: #45a049;
}
</style>
