<template>
  <div class="condition-group-editor">
    <!-- Group header with operator selection and removal option -->
    <div class="group-header">
      <label>Group Operator:</label>
      <!-- Operator selection: AND, OR, or NOT -->
      <select v-model="groupRef.operator">
        <option value="AND">AND</option>
        <option value="OR">OR</option>
        <option value="NOT">NOT</option>
      </select>
      <!-- Remove button only shown for non-root groups -->
      <button @click="$emit('remove')" v-if="canRemove">Remove Group</button>
    </div>
    
    <!-- Container for all children (conditions or nested groups) -->
    <div class="group-children">
      <div v-for="(child, idx) in groupRef.children" :key="idx" class="group-child">
        <!-- Recursive rendering: if child is a group, render another ConditionGroupEditor -->
        <ConditionGroupEditor
          v-if="child.type === 'group'"
          v-model:group="groupRef.children[idx]"
          :available-steps="availableSteps"
          :can-remove="true"
          @remove="removeChild(idx)"
        />
        
        <!-- If child is a condition, render the condition editing interface -->
        <div v-else class="condition-row">
          <!-- Condition keyword selection (Level, Temp, Material, etc.) -->
          <select v-model="child.keyword">
            <option value="Level">Level</option>
            <option value="Temp">Temp</option>
            <option value="Material">Material</option>
            <option value="Dens">Dens</option>
            <option value="Flow">Flow</option>
            <option value="Dist">Dist</option>
            <option value="Time">Time</option>
            <option value="Pressure">Pressure</option>
            <option value="Speed">Speed</option>
            <option value="Weight">Weight</option>
            <option value="Step">Step</option>            
          </select>
          
          <!-- Special handling for Step-type conditions -->
          <template v-if="child.keyword === 'Step'">
            <!-- Step selection dropdown -->
            <select v-model="child.instance">
              <option value="" disabled selected>Select Step</option>
              <option v-for="step in availableSteps" :key="step.id" :value="step.id">{{ step.name }}</option>
            </select>
            <!-- Step conditions are always "Completed" - readonly -->
            <input type="text" value="Completed" readonly style="background: #fff; color: #23272f; min-width: 80px;" />
          </template>
          
          <!-- Standard condition editing for non-Step types -->
          <template v-else>
            <!-- Instance name input (e.g., "500" for Level 500) -->
            <input v-model="child.instance" placeholder="Instance name" />
            <!-- Comparison operator selection -->
            <select v-model="child.operator">
              <option value="==">==</option>
              <option value="<">&lt;</option>
              <option value="<=">&lt;=</option>
              <option value=">">&gt;</option>
              <option value=">=">&gt;=</option>
              <option value="is">is</option>
            </select>
            <!-- Condition value input with validation -->
            <input v-model="child.value" placeholder="Value" :class="{ 'input-error': !child.value }" />
            <span v-if="!child.value" class="error-text">Value required</span>
          </template>
          
          <!-- Move up/down buttons for reordering -->
          <button @click="moveChild(idx, -1)" :disabled="idx === 0" title="Move Up">↑</button>
          <button @click="moveChild(idx, 1)" :disabled="idx === groupRef.children.length - 1" title="Move Down">↓</button>
          
          <!-- Remove button with trash icon -->
          <button @click="removeChild(idx)" title="Remove">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" style="vertical-align: middle;">
              <path fill="currentColor" d="M7 21q-.825 0-1.413-.588T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.588 1.413T17 21H7ZM17 6H7v13h10V6ZM9 17h2V8H9v9Zm4 0h2V8h-2v9ZM7 6v13V6Z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Action buttons for adding new conditions or groups -->
    <div class="group-actions">
      <!-- Add condition button - disabled for NOT groups with existing children -->
      <button @click="addCondition" :disabled="groupRef.operator === 'NOT' && groupRef.children.length >= 1" title="NOT groups can only have one child">+ Add Condition</button>
      <!-- Add group button - also disabled for NOT groups with existing children -->
      <button @click="addGroup" :disabled="groupRef.operator === 'NOT' && groupRef.children.length >= 1" title="NOT groups can only have one child">+ Add Group</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import ConditionGroupEditor from './ConditionGroupEditor.vue';  

/**
 * ConditionGroupEditor Component
 * 
 * This is a recursive component that handles the editing of nested logical condition groups.
 * It supports three logical operators: AND, OR, and NOT, each with different constraints.
 * 
 * Key Features:
 * - Recursive rendering for nested condition structures
 * - Operator-specific constraints (NOT can only have one child)
 * - Move up/down functionality for reordering
 * - Special handling for Step-type conditions
 * - Real-time validation and error display
 * 
 * Logical Operator Rules:
 * - AND: Can have multiple children, all must be true
 * - OR: Can have multiple children, at least one must be true  
 * - NOT: Can only have one child, inverts the result
 */

const props = defineProps({
  // The condition group object to edit (can be nested)
  group: Object,
  // Available steps for Step-type conditions
  availableSteps: Array,
  // Whether this group can be removed (false for root groups)
  canRemove: {
    type: Boolean,
    default: false
  }
});
const emit = defineEmits(['update:group', 'remove']);

// Local reference to the condition group for two-way binding
const groupRef = ref(props.group);

// Watch for external changes and sync local state
watch(() => props.group, (val) => {
  groupRef.value = val;
});

// Watch local changes and emit updates to parent, with debug logging
watch(groupRef, (val) => {
  emit('update:group', val);
  console.log('ConditionGroupEditor groupRef update:', JSON.stringify(val, null, 2));
}, { deep: true });

/**
 * Adds a new condition to the current group
 * Creates a default condition with Level keyword and == operator
 */
function addCondition() {
  groupRef.value.children.push({
    type: 'condition',
    keyword: 'Step',        // Default keyword
    instance: '',            // Instance name (e.g., "500")
    operator: '==',          // Default comparison operator
    value: '0'                // Condition value
  });
}

/**
 * Adds a new nested group to the current group
 * Creates a default group with AND operator and empty children array
 */
function addGroup() {
  groupRef.value.children.push({
    type: 'group',
    operator: 'AND',         // Default operator for new groups
    children: []             // Empty children array
  });
}

/**
 * Removes a child (condition or group) at the specified index
 * @param {number} idx - Index of the child to remove
 */
function removeChild(idx) {
  groupRef.value.children.splice(idx, 1);
}

/**
 * Moves a child up or down in the children array
 * @param {number} idx - Current index of the child
 * @param {number} direction - Direction to move (-1 for up, 1 for down)
 */
function moveChild(idx, direction) {
  const arr = groupRef.value.children;
  const newIndex = idx + direction;
  
  // Validate the new index is within bounds
  if (newIndex < 0 || newIndex >= arr.length) return;
  
  // Swap the elements using destructuring assignment
  [arr[idx], arr[newIndex]] = [arr[newIndex], arr[idx]];
}
</script>

<style scoped>
/* Component styling with improved button visibility on dark backgrounds */
.condition-group-editor {
  border: 1px solid #ccc;
  margin: 8px;
  padding: 8px;
  border-radius: 6px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.group-children {
  margin-left: 16px; /* Indent children for visual hierarchy */
}

.condition-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.group-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

/* Enhanced button styling for better visibility on dark backgrounds */
button {
  background: #f5f5f5;
  color: #23272f;
  border: 1px solid #bbb;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border 0.2s;
  margin-right: 2px;
}

button:disabled {
  background: #e0e0e0;
  color: #888;
  border: 1px solid #ccc;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background: #e3eaff;
  color: #1a237e;
  border: 1.5px solid #1976d2;
}

/* Validation styling */
.input-error {
  border: 1px solid red;
}

.error-text {
  color: red;
  font-size: 12px;
}
</style> 