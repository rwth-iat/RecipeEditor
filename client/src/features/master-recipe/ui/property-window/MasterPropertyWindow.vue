<template>
  <PropertyWindowContainer
    v-bind="props"
    :showOpenInWorkspace="computedSelectedElement?.type === 'process'"
    @close="emit('close')"
    @openInWorkspace="emit('openInWorkspace')"
    @deleteElement="emit('deleteElement', $event)"
    @update:selectedElement="emit('update:selectedElement', $event)"
  >
    <!-- Validation Warning Display - Shows when parameters have validation errors -->
    <div v-if="hasValidationErrors" class="validation-warning-banner">
      <span class="warning-icon">⚠️</span>
      <span class="warning-text">
        {{ validationErrors.size }} parameter{{ validationErrors.size > 1 ? 's' : '' }} have validation errors.
        Please fix these before proceeding.
      </span>
    </div>

    <!-- Validation Success Display - Shows when all parameters are valid -->
    <div v-if="!hasValidationErrors && hasEquipmentParameters" class="validation-success-banner">
      <span class="success-icon">✅</span>
      <span class="success-text">
        All parameters are within valid ranges.
      </span>
    </div>

    <!-- Basic Process Element Properties -->
    <div>
      <h2>ProcessElement</h2>
      <label for="id">ID:</label>
      <input type="text" id="id" v-model="computedSelectedElement.id" readonly class="locked-input" />
      <label for="name">Name:</label>
      <input type="text" id="name" v-model="computedSelectedElement.name" />
      <label for="description">Description:</label>
      <input type="text" id="description" v-model="descriptionValue" />
      <!-- Transition Type Selection - Only shown for transition elements -->
      <label v-if="isTransitionElement" for="recipeElementType">Transition Type:</label>
      <select v-if="isTransitionElement" id="recipeElementType" v-model="computedSelectedElement.recipeElementType">
        <option value="" disabled selected>Select transition type</option>
        <option value="Condition">Condition</option>
      </select>
    </div>

    <!-- Advanced Condition Editing Section -->
    <!-- This section replaces the old flat condition list with the new recursive group editor -->
    <div
      v-show="computedSelectedElement.recipeElementType === 'Condition' || computedSelectedElement.type === 'transition'">
      <label for="condition">Condition:</label>

      <!-- Display current condition summary if it exists and is not just "True" -->
      <div v-if="conditionSummary && conditionSummary !== 'True'">
        <div class="always-true-container">
          <input type="text" :value="conditionSummary" disabled class="always-true-input" />
        </div>
        <div class="condition-summary-display">
          <span>Current Condition: <b>{{ conditionSummary }}</b></span>
        </div>
      </div>

      <!-- Button to open the condition editing modal -->
      <button @click="showConditionModal = true" class="open-condition-modal-btn">Edit Condition</button>

      <!-- Condition Editor Modal - Provides full-screen editing experience -->
      <template v-if="showConditionModal">
        <div class="modal-overlay" @click.self="tryCloseConditionModal">
          <div class="modal-content">
            <!-- Recursive condition editor component for nested logical expressions -->
            <ConditionEditor
              v-model:group="computedSelectedElement.conditionGroup"
              :available-steps="availableSteps"
            />
            <button @click="tryCloseConditionModal" class="close-modal-btn">Close</button>
            <!-- Warning shown when trying to close with invalid conditions -->
            <div v-if="showConditionModalWarning" class="modal-warning">Please fill in all required fields for all conditions before closing.</div>
          </div>
        </div>
      </template>
    </div>

    <!-- Sensor Information Section - Shows available sensors from previous steps -->
    <div v-if="availableSensors.length > 0" class="sensor-info">
      <h4>Available Sensors from Previous Step (Click to Auto-Fill):</h4>
      <div class="sensor-list">
        <!-- Clickable sensor items that auto-fill condition fields -->
        <div v-for="sensor in availableSensors" :key="sensor.id" class="sensor-item clickable-sensor"
          @click="onSensorClicked(sensor)">
          <span class="sensor-name">{{ sensor.name }}</span>
          <span class="sensor-keyword">{{ sensor.keyword }}</span>
          <span class="sensor-type">{{ sensor.source }} {{ sensor.type }}</span>
          <span v-if="sensor.dataType" class="sensor-datatype">({{ sensor.dataType }})</span>
          <span class="click-hint">Click to use</span>
        </div>
      </div>
    </div>

    <!--Process Properties-->
    <!-- Only show processElementType dropdown for process elements -->
    <div v-show='computedSelectedElement.type == "process"'>
      <label for="processElementType">Process Type:</label>
      <select id="processElementType" v-model="computedSelectedElement.processElementType">
        <option value="" disabled selected>Select process type</option>
        <option v-if="props.mode === 'master'" value="Recipe Procedure Containing Lower Level PFC">
          Recipe Procedure
        </option>
      </select>

      <!-- Equipment Information Section (MTP/AAS) -->
      <div v-if="computedSelectedElement.equipmentInfo" class="equipment-info-section">
        <h2>Equipment Information (Read-Only)</h2>
        <div class="equipment-source">
          <label>Source:</label>
          <input type="text"
            :value="computedSelectedElement.equipmentInfo.source_type + ': ' + computedSelectedElement.equipmentInfo.source_file"
            readonly class="locked-input" />
        </div>

        <!-- Show target process if available (for filtered MTP data) -->
        <div v-if="computedSelectedElement.equipmentInfo.target_process" class="target-process">
          <label>Target Process:</label>
          <input type="text" :value="computedSelectedElement.equipmentInfo.target_process" readonly
            class="locked-input" />
        </div>

        <!-- MTP Equipment Info -->
        <div
          v-if="computedSelectedElement.equipmentInfo.source_type === 'MTP' && computedSelectedElement.equipmentInfo.equipment_data">
          <!-- Equipment Service Information (RecipeElement reference) -->
          <div v-if="computedSelectedElement.equipmentInfo.equipment_data.service_info" class="equipment-details">
            <h3>Equipment Service (RecipeElement Reference)</h3>
            <label>Service Name:</label>
            <input type="text" :value="computedSelectedElement.equipmentInfo.equipment_data.service_info.name || 'N/A'"
              readonly class="locked-input" />

            <label>Service ID:</label>
            <input type="text" :value="computedSelectedElement.equipmentInfo.equipment_data.service_info.id || 'N/A'"
              readonly class="locked-input" />
          </div>

          <!-- Equipment Procedure Information (RecipeElement reference) -->
          <div v-if="computedSelectedElement.equipmentInfo.equipment_data.procedure_info" class="equipment-details">
            <h3>Equipment Procedure (RecipeElement Reference)</h3>
            <label>Procedure Name:</label>
            <input type="text" :value="computedSelectedElement.equipmentInfo.equipment_data.procedure_info.name || 'N/A'"
              readonly class="locked-input" />

            <label>Procedure ID:</label>
            <input type="text" :value="computedSelectedElement.equipmentInfo.equipment_data.procedure_info.id || 'N/A'"
              readonly class="locked-input" />

            <label>Self Completing:</label>
            <input type="text"
              :value="computedSelectedElement.equipmentInfo.equipment_data.procedure_info.self_completing ? 'Yes' : 'No'"
              readonly class="locked-input" />
          </div>

          <!-- Recipe Parameters (B2MML Formula section) -->
          <div
            v-if="computedSelectedElement.equipmentInfo.equipment_data.recipe_parameters && computedSelectedElement.equipmentInfo.equipment_data.recipe_parameters.length > 0">
            <h3>Recipe Parameters (B2MML Formula)</h3>
            <div v-for="(parameter, index) in computedSelectedElement.equipmentInfo.equipment_data.recipe_parameters"
              :key="index" class="parameter-item">
              <label>Parameter {{ index + 1 }}:</label>
              <input type="text" :value="parameter.name + ' (ID: ' + parameter.id + ')'" readonly class="locked-input" />

              <!-- Enhanced parameter details with validation -->
              <div v-if="parameter.min || parameter.max" class="parameter-details">
                <label>Range:</label>
                <input type="text"
                  :value="(parameter.min || 'N/A') + ' to ' + (parameter.max || 'N/A') + (parameter.unit ? ' ' + parameter.unit : '')"
                  readonly class="locked-input" />

                <!-- Show current/default value with validation -->
                <div class="current-value-display">
                  <label>Current/Default Value:</label>
                  <div class="value-with-unit">
                    <input type="number" v-model="parameter.default" :min="parameter.min" :max="parameter.max"
                      class="current-value-input" :class="{ 'validation-error': isValueInvalid(parameter) }"
                      @input="onRecipeParameterInput(parameter, index)" :placeholder="'Not set'" />
                    <span v-if="parameter.unit" class="unit-label">{{ parameter.unit }}</span>
                  </div>
                  <span v-if="isValueInvalid(parameter)" class="validation-error">
                    ?? Value must be between {{ parameter.min || 'N/A' }} and {{ parameter.max || 'N/A' }}
                  </span>
                </div>
              </div>

              <!-- Parameter type information -->
              <div v-if="parameter.paramElem" class="parameter-type-info">
                <label>Parameter Type:</label>
                <input type="text" :value="parameter.paramElem.Type || 'N/A'" readonly class="locked-input" />
              </div>
            </div>
          </div>

          <!-- Equipment Requirements (B2MML EquipmentRequirement section) -->
          <div
            v-if="computedSelectedElement.equipmentInfo.equipment_data.equipment_requirements && computedSelectedElement.equipmentInfo.equipment_data.equipment_requirements.length > 0">
            <h3>Equipment Requirements (B2MML EquipmentRequirement)</h3>
            <div v-for="(equipment, index) in computedSelectedElement.equipmentInfo.equipment_data.equipment_requirements"
              :key="index" class="equipment-item">
              <label>Equipment {{ index + 1 }}:</label>
              <input type="text" :value="equipment.name + ' (ID: ' + equipment.id + ')'" readonly class="locked-input" />
            </div>
          </div>
        </div>

        <!-- AAS Equipment Info -->
        <div
          v-if="computedSelectedElement.equipmentInfo.source_type === 'AAS' && computedSelectedElement.equipmentInfo.equipment_data">
          <div class="equipment-details">
            <label>AAS ID:</label>
            <input type="text" :value="computedSelectedElement.equipmentInfo.equipment_data.aas_id || 'N/A'" readonly
              class="locked-input" />

            <label>Asset ID:</label>
            <input type="text" :value="computedSelectedElement.equipmentInfo.equipment_data.asset_id || 'N/A'" readonly
              class="locked-input" />
          </div>

          <!-- AAS Capabilities -->
          <div
            v-if="computedSelectedElement.equipmentInfo.equipment_data.capabilities && computedSelectedElement.equipmentInfo.equipment_data.capabilities.length > 0">
            <h3>Equipment Capabilities</h3>
            <div v-for="(capability, index) in computedSelectedElement.equipmentInfo.equipment_data.capabilities"
              :key="index" class="capability-item">
              <label>Capability {{ index + 1 }}:</label>
              <input type="text"
                :value="capability.id + (capability.semantic_id ? ' (' + capability.semantic_id + ')' : '')" readonly
                class="locked-input" />
            </div>
          </div>

          <!-- AAS Properties -->
          <div
            v-if="computedSelectedElement.equipmentInfo.equipment_data.properties && computedSelectedElement.equipmentInfo.equipment_data.properties.length > 0">
            <h3>Equipment Properties</h3>
            <div v-for="(property, index) in computedSelectedElement.equipmentInfo.equipment_data.properties" :key="index"
              class="property-item">
              <label>Property {{ index + 1 }}:</label>
              <input type="text"
                :value="property.id + ': ' + (property.value || 'N/A') + ' (' + (property.data_type || 'N/A') + ')'"
                readonly class="locked-input" />
            </div>
          </div>

          <!-- AAS Operations -->
          <div
            v-if="computedSelectedElement.equipmentInfo.equipment_data.operations && computedSelectedElement.equipmentInfo.equipment_data.operations.length > 0">
            <h3>Equipment Operations</h3>
            <div v-for="(operation, index) in computedSelectedElement.equipmentInfo.equipment_data.operations"
              :key="index" class="operation-item">
              <label>Operation {{ index + 1 }}:</label>
              <input type="text" :value="operation.id" readonly class="locked-input" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </PropertyWindowContainer>
</template>

<script setup>
/**
 * PropertyWindow Component
 * 
 * This component provides a comprehensive interface for editing workspace element properties.
 * It handles different element types (process, material, transition) and provides specialized
 * editing interfaces for each type.
 * 
 * Key Features:
 * - Dynamic property editing based on element type
 * - Advanced condition editing with modal interface
 * - Parameter validation and error display
 * - Equipment information display (AAS, MTP)
 * - Sensor data integration for transitions
 * - Real-time validation feedback
 */
import { computed, ref, watch, watchEffect } from 'vue';
import PropertyWindowContainer from '@/shell/ui/workspace/PropertyWindowContainer.vue';
import ConditionEditor from '@/features/master-recipe/ui/property-window/ConditionEditor.vue';

const props = defineProps({
  // The currently selected workspace element to edit
  selectedElement: Object,
  // Mode: 'general' or 'master' recipe
  mode: {
    type: String,
    default: 'master'
  },
  // All workspace items for reference and step selection
  workspaceItems: {
    type: Array,
    default: () => []
  },
  // Workspace connections for finding related elements
  connections: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'openInWorkspace', 'deleteElement', 'update:selectedElement']);

/**
 * Computed property that provides two-way binding with the parent component
 * This is the recommended Vue 3 pattern for achieving two-way binding:
 * - get: retrieves the value from the parent
 * - set: emits updates to the parent, which then sets the new value
 * 
 * This approach ensures the parent component remains the single source of truth
 * while allowing the child to modify the data.
 */
const computedSelectedElement = computed({
  get: () => props.selectedElement,
  set: (newValue) => {
    emit('update:selectedElement', newValue);
  },
});

/**
 * WatchEffect to ensure conditionGroup is always properly initialized
 * This prevents the "Cannot read properties of undefined" error when
 * the ConditionEditor component first renders.
 * 
 * Default structure:
 * - type: 'group' - indicates this is a logical group
 * - operator: 'AND' - default logical operator
 * - children: [] - empty array for child conditions/groups
 */
watchEffect(() => {
  if (
    computedSelectedElement.value &&
    !computedSelectedElement.value.conditionGroup
  ) {
    computedSelectedElement.value.conditionGroup = {
      type: 'group',
      operator: 'AND',
      children: []
    };
  }
});

/**
 * Computed property for safe description access
 * Handles the case where description might be undefined, null, or not an array
 * Provides a fallback empty string if the description structure is invalid
 */
const descriptionValue = computed({
  get: () => {
    if (computedSelectedElement.value && computedSelectedElement.value.description && Array.isArray(computedSelectedElement.value.description)) {
      return computedSelectedElement.value.description[0] || '';
    }
    return '';
  },
  set: (value) => {
    if (computedSelectedElement.value) {
      // Ensure description is always an array
      if (!computedSelectedElement.value.description) {
        computedSelectedElement.value.description = [];
      }
      if (!Array.isArray(computedSelectedElement.value.description)) {
        computedSelectedElement.value.description = [];
      }
      computedSelectedElement.value.description[0] = value;
    }
  }
});

/**
 * Computed property to determine if the element is a transition
 * Transitions are special elements that can have conditions and connect
 * different parts of the recipe workflow.
 * 
 * Checks both the element type and recipeElementType for transition indicators
 */
const isTransitionElement = computed(() => {
  return computedSelectedElement.value && (
    computedSelectedElement.value.type === 'transition' ||
    (typeof computedSelectedElement.value.recipeElementType === 'string' && computedSelectedElement.value.recipeElementType.includes('Transition'))
  );
});

/**
 * Computed property for available sensors from previous steps
 * This provides sensor data that can be used to auto-fill condition fields
 * for transition elements, improving user experience and reducing errors.
 */
const availableSensors = computed(() => {
  return getPreviousElementSensorData(computedSelectedElement.value);
});

/**
 * Function to get previous element's sensor data for transitions
 * This function analyzes the workspace connections to find the element
 * that comes before a transition, then extracts its sensor information
 * for use in condition editing.
 * 
 * @param {Object} transitionElement - The transition element to analyze
 * @returns {Array} - Array of available sensor data objects
 */
const availableSteps = computed(() => {
  return props.workspaceItems
    .filter(item => item.type === 'process' || item.type === 'recipe_element')
    .map(item => ({ id: item.id, name: item.name || item.id }));
});

const stringifyConditionGroup = (node) => {
  if (!node) return '';
  if (node.type === 'condition') {
    const parts = [node.keyword, node.operator, node.value]
      .filter(part => part !== undefined && part !== null && part !== '');
    return parts.join(' ');
  }
  if (node.type === 'group') {
    const operator = node.operator || 'AND';
    const children = (node.children || [])
      .map(stringifyConditionGroup)
      .filter(Boolean);
    if (!children.length) return 'True';
    if (operator === 'NOT') return 'NOT (' + (children[0] || 'True') + ')';
    return children.join(' ' + operator + ' ');
  }
  return '';
};

const conditionSummary = computed(() => {
  const element = computedSelectedElement.value;
  if (!element) return '';
  if (element.conditionGroup) {
    const summary = stringifyConditionGroup(element.conditionGroup);
    return summary || 'True';
  }
  if (Array.isArray(element.conditionList) && element.conditionList.length > 0) {
    const summary = element.conditionList
      .map(condition => [condition.keyword, condition.instance, condition.operator, condition.value]
        .filter(part => part !== undefined && part !== null && part !== '')
        .join(' '))
      .filter(Boolean)
      .join(' AND ');
    return summary || 'True';
  }
  return 'True';
});

/**
 * Function to get previous element's sensor data for transitions
 * This function analyzes the workspace connections to find the element
 * that comes before a transition, then extracts its sensor information
 * for use in condition editing.
 * 
 * @param {Object} transitionElement - The transition element to analyze
 * @returns {Array} - Array of available sensor data objects
 */
const getPreviousElementSensorData = (transitionElement) => {
  if (!transitionElement || transitionElement.recipeElementType !== 'Condition') {
    return [];
  }

  // Find the connection where this transition is the target
  const incomingConnection = props.connections.find(conn => conn.targetId === transitionElement.id);
  if (!incomingConnection) {
    return [];
  }

  // Find the source element (previous element)
  const previousElement = props.workspaceItems.find(item => item.id === incomingConnection.sourceId);
  if (!previousElement || !previousElement.equipmentInfo) {
    return [];
  }

  // Extract sensor data from the previous element's equipment info
  const sensors = [];

  if (previousElement.equipmentInfo.equipment_data) {
    // MTP sensors
    if (previousElement.equipmentInfo.equipment_data.condition_sensors) {
      previousElement.equipmentInfo.equipment_data.condition_sensors.forEach(sensor => {
        sensors.push({
          id: sensor.id,
          name: sensor.name,
          type: 'sensor',
          source: 'MTP',
          keyword: sensor.sensor_keyword || 'Level'
        });
      });
    }

    // AAS properties (can be used as sensors)
    if (previousElement.equipmentInfo.equipment_data.properties) {
      (previousElement.equipmentInfo.equipment_data.properties || []).forEach(property => {
        // Try to extract keyword from AAS property name
        const extractKeywordFromAAS = (propertyName) => {
          const nameLower = propertyName.toLowerCase();
          if (nameLower.includes('temp') || nameLower.includes('temperature')) return 'Temp';
          if (nameLower.includes('level') || nameLower.includes('height')) return 'Level';
          if (nameLower.includes('flow') || nameLower.includes('rate')) return 'Flow';
          if (nameLower.includes('pressure')) return 'Pressure';
          if (nameLower.includes('speed') || nameLower.includes('velocity')) return 'Speed';
          if (nameLower.includes('weight') || nameLower.includes('mass')) return 'Weight';
          if (nameLower.includes('density') || nameLower.includes('dens')) return 'Dens';
          if (nameLower.includes('distance') || nameLower.includes('dist')) return 'Dist';
          if (nameLower.includes('time') || nameLower.includes('duration')) return 'Time';
          return 'Level';
        };

        sensors.push({
          id: property.id,
          name: property.id,
          type: 'property',
          source: 'AAS',
          dataType: property.data_type,
          keyword: extractKeywordFromAAS(property.id)
        });
      });
    }
  }

  return sensors;
};

/**
 * Function to handle clicking on a sensor (auto-fill current condition)
 * This function is triggered when a user clicks on a sensor item in the available sensors list.
 * It finds the current condition being edited (last one or empty one) and auto-fills it
 * with the sensor's keyword, instance, and a default operator/value.
 * 
 * @param {Object} sensor - The sensor data object that was clicked
 */
const onSensorClicked = (sensor) => {
  // Find the current condition being edited (last one or empty one)
  let targetCondition = null;

  if (!computedSelectedElement.value.conditionList || computedSelectedElement.value.conditionList.length === 0) {
    // No conditions exist, create a new one
    addCondition();
    targetCondition = computedSelectedElement.value.conditionList[0];
  } else {
    // Find the last condition or one with empty instance
    const conditions = computedSelectedElement.value.conditionList;
    targetCondition = conditions.find(c => !c.instance) || conditions[conditions.length - 1];
  }

  if (targetCondition) {
    // Auto-fill the condition with sensor data
    targetCondition.keyword = sensor.keyword;
    targetCondition.instance = sensor.name;
    
    // Set a default operator and value based on sensor type
    if (sensor.keyword === 'Temp') {
      targetCondition.operator = '>';
      targetCondition.value = '25';
    } else if (sensor.keyword === 'Level') {
      targetCondition.operator = '>';
      targetCondition.value = '50';
    } else if (sensor.keyword === 'Flow') {
      targetCondition.operator = '>';
      targetCondition.value = '0';
    } else {
      targetCondition.operator = '==';
      targetCondition.value = '';
    }
  }
};

const isValueInvalid = (parameter) => {
  if ((parameter.min !== undefined && parameter.min !== null && parameter.min !== '') ||
    (parameter.max !== undefined && parameter.max !== null && parameter.max !== '')) {
    const value = parseFloat(parameter.default);
    const min = parseFloat(parameter.min);
    const max = parseFloat(parameter.max);
    if (!isNaN(value)) {
      if (!isNaN(min) && value < min) return true;
      if (!isNaN(max) && value > max) return true;
    }
  }
  return false;
};

function onRecipeParameterInput(parameter, index) {
  if (isValueInvalid(parameter)) {
    validationErrors.value.add(`recipe_parameter_${index}`);
  } else {
    validationErrors.value.delete(`recipe_parameter_${index}`);
  }
}

const validationErrors = ref(new Set());

// Computed property to check if there are any validation errors
const hasValidationErrors = computed(() => {
  return validationErrors.value.size > 0;
});

// Computed property to check if the element has equipment parameters
const hasEquipmentParameters = computed(() => {
  return computedSelectedElement.value.equipmentInfo &&
    computedSelectedElement.value.equipmentInfo.equipment_data &&
    computedSelectedElement.value.equipmentInfo.equipment_data.recipe_parameters &&
    computedSelectedElement.value.equipmentInfo.equipment_data.recipe_parameters.length > 0;
});

/*
 * Function to add a new condition to the current element's condition list.
 * This function is called when the user clicks the "Edit Condition" button.
 * It ensures the conditionList is an array and adds a new condition object.
 */
function addCondition() {
  if (!computedSelectedElement.value.conditionList) {
    computedSelectedElement.value.conditionList = [];
  } else if (!Array.isArray(computedSelectedElement.value.conditionList)) {
    computedSelectedElement.value.conditionList = [];
  }

  // Clear the isAlwaysTrue flag when adding a condition
  computedSelectedElement.value.isAlwaysTrue = false;

  computedSelectedElement.value.conditionList.push({
    keyword: 'Level',
    instance: '',
    operator: '==',
    value: '',
    binaryOperator: ''
  });
}

// Ensure for 'Step' conditions, operator is always 'is'
watch(
  () => computedSelectedElement.value?.conditionList,
  (newList) => {
    if (!newList) return;
    newList.forEach(condition => {
      if (condition.keyword === 'Step') {
        condition.operator = 'is';
        condition.value = 'Completed';
      }
    });
  },
  { deep: true }
);

// In the script section, set the default value for processElementType when in master mode and the selected element is a process
watch(
  () => [computedSelectedElement.value, props.mode],
  ([selected, currentMode]) => {
    if (selected && selected.type === 'process' && currentMode === 'master' && !selected.processElementType) {
      computedSelectedElement.value.processElementType = 'Recipe Procedure Containing Lower Level PFC';
    }
  },
  { immediate: true, deep: true }
);

const showConditionModal = ref(false);
const showConditionModalWarning = ref(false);

// Validation for the condition group
function isConditionGroupValid(group) {
  if (!group) return false;
  if (group.type === 'condition') {
    return !!(group.keyword && group.operator && group.value !== undefined && group.value !== '');
  }
  if (!group.children || !group.children.length) return false;
  if (group.operator === 'NOT') {
    return isConditionGroupValid(group.children[0]);
  }
  return group.children.every(child => isConditionGroupValid(child));
}

function tryCloseConditionModal() {
  if (isConditionGroupValid(computedSelectedElement.value.conditionGroup)) {
    showConditionModal.value = false;
    showConditionModalWarning.value = false;
  } else {
    showConditionModalWarning.value = true;
  }
}
</script>

<style>
/* Style for Add Condition button */
#addCondition {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

#addCondition:hover {
  background-color: #45a049;
}

/* Remove Condition button */
.remove-condition {
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 10px;
  padding: 4px 8px;
  font-size: 14px;
}

.remove-condition:hover {
  background-color: #d32f2f;
}

.condition-item {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-bottom: 10px;
}

button#addCondition {
  margin-top: 10px;
  padding: 6px 12px;
  background: green;
  color: white;
  border: none;
  cursor: pointer;
}

button.remove-condition {
  padding: 4px 8px;
}

button.remove-condition:hover {
  background: darkred;
}

.binary-operator-container {
  margin: 10px 0;
  text-align: center;
}

.binary-operator-select {
  height: 36px;
  padding: 5px;
  font-size: 14px;
  border-radius: 4px;
  border: 1px solid #ccc;
  box-sizing: border-box;
  background-color: #f8f9fa;
  color: #495057;
  font-weight: bold;
  min-width: 80px;
  padding-right: 34px;
}

.always-true-container {
  margin: 10px 0;
}

.always-true-input {
  padding: 8px 16px;
  background-color: #f8f9fa;
  color: #6c757d;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: not-allowed;
  width: 100%;
  box-sizing: border-box;
}

.always-true-input:disabled {
  opacity: 0.7;
}

/* Equipment Information Section Styles */
.equipment-info-section {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
}

.equipment-info-section h2 {
  color: #495057;
  font-size: 16px;
  margin-bottom: 15px;
  border-bottom: 2px solid #6c757d;
  padding-bottom: 5px;
}

.equipment-info-section h3 {
  color: #6c757d;
  font-size: 14px;
  margin: 15px 0 10px 0;
  font-weight: 600;
}

.equipment-source {
  margin-bottom: 15px;
}

.target-process {
  margin-bottom: 15px;
  padding: 8px;
  background-color: #e3f2fd;
  border: 1px solid #2196f3;
  border-radius: 4px;
}

.target-process label {
  color: #1976d2;
  font-weight: 700;
}

.target-process input.locked-input {
  background-color: #ffffff;
  color: #1976d2;
  border: 1px solid #2196f3;
  font-weight: 600;
}

.equipment-details {
  margin-bottom: 15px;
}

.parameter-item,
.sensor-item,
.actuator-item,
.unit-item,
.equipment-item {
  margin-bottom: 10px;
  padding: 8px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 4px;
}

.parameter-item {
  border-left: 4px solid #28a745;
}

.sensor-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background-color: white;
  border-radius: 5px;
  font-size: 12px;
  border: 1px solid #dee2e6;
  transition: all 0.2s ease;
}

.clickable-sensor {
  cursor: pointer;
  position: relative;
}

.clickable-sensor:hover {
  background-color: #f8f9fa;
  border-color: #007bff;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.1);
}

.clickable-sensor:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 123, 255, 0.2);
}

.click-hint {
  color: #6c757d;
  font-size: 10px;
  font-style: italic;
  margin-left: auto;
  opacity: 0.7;
}

.clickable-sensor:hover .click-hint {
  opacity: 1;
  color: #007bff;
}

.sensor-name {
  font-weight: 600;
  color: #212529;
}

.sensor-keyword {
  color: #007bff;
  font-weight: 600;
  background-color: #e3f2fd;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  margin-right: 5px;
}

.sensor-type {
  color: #6c757d;
  font-style: italic;
}

.sensor-datatype {
  color: #28a745;
  font-weight: 500;
}

.sensor-dropdown {
  margin: 5px 0;
}

.sensor-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f8f9fa;
  font-size: 14px;
  padding-right: 34px;
}

.sensor-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.sensor-info {
  margin-top: 15px;
  padding: 10px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 5px;
}

.sensor-info h4 {
  margin: 0 0 10px 0;
  color: #495057;
  font-size: 14px;
  font-weight: 600;
}

.sensor-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.parameter-details {
  margin-top: 5px;
  margin-left: 15px;
  padding-left: 10px;
  border-left: 2px solid #dee2e6;
}

.instance-details {
  margin-top: 5px;
  margin-left: 15px;
  padding-left: 10px;
  border-left: 2px solid #dee2e6;
}

.equipment-info-section label {
  font-weight: 600;
  color: #495057;
  margin-bottom: 3px;
}

.equipment-info-section input.locked-input {
  background-color: #e9ecef;
  color: #6c757d;
  border: 1px solid #ced4da;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.sensor-display {
  margin: 5px 0;
}

.selected-sensor {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #e3f2fd;
  border: 1px solid #2196f3;
  border-radius: 4px;
  font-size: 14px;
}

.sensor-display-text {
  flex: 1;
  color: #1976d2;
  font-weight: 500;
}

.clear-sensor-btn {
  background: none;
  border: none;
  color: #f44336;
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.clear-sensor-btn:hover {
  background-color: #ffebee;
}

.sensor-placeholder {
  padding: 8px 12px;
  background-color: #f8f9fa;
  border: 1px dashed #6c757d;
  border-radius: 4px;
  color: #6c757d;
  font-style: italic;
  text-align: center;
  font-size: 14px;
}

/* Validation Styles */
.max-value-display {
  margin-top: 10px;
  padding: 8px;
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
}

.max-value-display label {
  color: #856404;
  font-weight: 600;
  font-size: 12px;
  margin-bottom: 3px;
}

.max-value-input {
  background-color: #fff3cd !important;
  color: #856404 !important;
  border: 1px solid #ffeaa7 !important;
  font-weight: 600;
  font-size: 13px;
}

.max-value-input.validation-warning {
  background-color: #f8d7da !important;
  color: #721c24 !important;
  border: 1px solid #f5c6cb !important;
}

.current-value-display {
  margin-top: 8px;
  padding: 8px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
}

.current-value-display label {
  color: #495057;
  font-weight: 600;
  font-size: 12px;
  margin-bottom: 3px;
}

.current-value-input {
  background-color: #f8f9fa !important;
  color: #495057 !important;
  border: 1px solid #dee2e6 !important;
  font-size: 13px;
}

.current-value-input.validation-error {
  background-color: #f8d7da !important;
  color: #721c24 !important;
  border: 1px solid #f5c6cb !important;
}

.validation-error {
  color: #dc3545;
  font-size: 12px;
  font-weight: 600;
  margin-top: 5px;
  display: block;
}

.validation-warning {
  background-color: #f8d7da !important;
  color: #721c24 !important;
  border: 1px solid #f5c6cb !important;
}

.parameter-type-info {
  margin-top: 8px;
  padding: 6px;
  background-color: #e9ecef;
  border: 1px solid #ced4da;
  border-radius: 4px;
}

.parameter-type-info label {
  color: #6c757d;
  font-weight: 600;
  font-size: 11px;
  margin-bottom: 2px;
}

/* Validation Warning Banner */
.validation-warning-banner {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.warning-icon {
  font-size: 18px;
  color: #721c24;
}

.warning-text {
  color: #721c24;
  font-weight: 600;
  font-size: 14px;
}

/* Validation Success Banner */
.validation-success-banner {
  background-color: #dff0d8;
  border: 1px solid #d6e9c6;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.success-icon {
  font-size: 18px;
  color: #28a745;
}

.success-text {
  color: #28a745;
  font-weight: 600;
  font-size: 14px;
}

/* Master Recipe Configuration Styles */
.master-recipe-config {
  margin-bottom: 30px;
  padding: 20px;
  background-color: #f8f9fa;
  border: 2px solid #007bff;
  border-radius: 8px;
}

.master-recipe-config h3 {
  color: #007bff;
  font-size: 18px;
  margin-bottom: 20px;
  text-align: center;
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
}

.config-section {
  margin-bottom: 25px;
  padding: 15px;
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
}

.config-section h4 {
  color: #495057;
  font-size: 16px;
  margin-bottom: 15px;
  font-weight: 600;
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
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group select {
  padding-right: 34px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.parameter-config,
.requirement-config {
  position: relative;
  padding: 15px;
  margin-bottom: 15px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  border-left: 4px solid #28a745;
}

.parameter-config button,
.requirement-config button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  padding: 4px;
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

.parameter-config button:hover,
.requirement-config button:hover {
  background-color: #ffebee;
}

.master-recipe-config .button-with-border {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.master-recipe-config .button-with-border:hover {
  background-color: #0056b3;
}

.master-recipe-config .button-with-border-red {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.master-recipe-config .button-with-border-red:hover {
  background-color: #c82333;
}

/* Unit display styles */
.value-with-unit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unit-label {
  color: #6c757d;
  font-weight: 500;
  font-size: 14px;
  padding: 4px 8px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  white-space: nowrap;
  min-width: fit-content;
}

.value-with-unit input {
  flex: 1;
  min-width: 0;
}

/* Parameter details styling */
.parameter-details {
  margin-top: 10px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #007bff;
}

.max-value-display,
.current-value-display {
  margin-top: 8px;
}

.max-value-display label,
.current-value-display label {
  display: block;
  font-weight: 600;
  color: #495057;
  margin-bottom: 4px;
  font-size: 13px;
}

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  background: #23272f;
  color: #fff;
  padding: 32px 24px;
  border-radius: 10px;
  min-width: 400px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.close-modal-btn {
  margin-top: 16px;
  background: #f5f5f5;
  color: #23272f;
  border: 1px solid #bbb;
  border-radius: 4px;
  padding: 6px 18px;
  font-size: 16px;
  cursor: pointer;
}
.open-condition-modal-btn {
  margin-bottom: 10px;
  background: #e3eaff;
  color: #1a237e;
  border: 1.5px solid #1976d2;
  border-radius: 4px;
  padding: 4px 14px;
  font-size: 15px;
  cursor: pointer;
}
.condition-summary-display {
  margin-bottom: 8px;
  color: #e3eaff;
  font-size: 15px;
}
.modal-warning {
  color: #ffb300;
  background: #23272f;
  border: 1px solid #ffb300;
  border-radius: 4px;
  padding: 8px 12px;
  margin-top: 12px;
  font-size: 15px;
  text-align: center;
}
</style>
