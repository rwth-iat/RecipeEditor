<template>
  <div class="condition-editor">
    <!-- Display the stringified condition summary for user feedback -->
    <div class="always-true-container">
      <input type="text" :value="conditionSummary" disabled class="always-true-input" />
    </div>
    <!-- Recursive condition group editor for nested logical expressions -->
    <ConditionGroupEditor v-model:group="groupRef" :available-steps="availableSteps" />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import ConditionGroupEditor from '@/features/master-recipe/ui/ConditionGroupEditor.vue';

/**
 * ConditionEditor Component
 * 
 * This component provides a modal-based interface for editing complex logical conditions.
 * It displays a real-time summary of the condition and delegates the actual editing
 * to the recursive ConditionGroupEditor component.
 * 
 * Key Features:
 * - Real-time condition summary display
 * - Modal-based editing to save screen space
 * - Integration with recursive condition group editor
 * - Two-way binding with parent component
 */

const props = defineProps({
  // The condition group object containing the logical structure
  group: Object,
  // Available steps for Step-type conditions
  availableSteps: Array
});
const emit = defineEmits(['update:group']);

// Local reference to the condition group for two-way binding
const groupRef = ref(props.group);

// Watch for external changes and sync local state
watch(() => props.group, (val) => { groupRef.value = val; });
// Watch local changes and emit updates to parent
watch(groupRef, (val) => { emit('update:group', val); }, { deep: true });

/**
 * Computed property that generates a human-readable summary of the condition
 * This function recursively processes the condition group structure and converts
 * it to a readable string representation with proper logical precedence.
 */
const conditionSummary = computed(() => {
  /**
   * Recursively summarizes a condition group or individual condition
   * @param {Object} group - The condition group or condition to summarize
   * @returns {string} - Human-readable condition summary
   */
  function summarizeGroup(group) {
    // Handle individual conditions (leaf nodes in the condition tree)
    if (group.type === 'condition') {
      console.log('Summary stringifying condition:', JSON.stringify(group, null, 2));
      
      // Validate that the condition has all required fields
      if (!group.keyword || !group.operator || group.value === undefined || group.value === '') {
        return '';
      }
      
      // Special handling for Step-type conditions
      if (group.keyword === 'Step') {
        return `Step "${group.instance || ''}" is Completed`;
      } else {
        // For other condition types, format as: "Keyword Instance Operator Value"
        const instancePart = group.instance ? `${group.instance} ` : '';
        return `${group.keyword} ${instancePart}${group.operator} ${group.value}`;
      }
    }
    
    // Handle condition groups (internal nodes in the condition tree)
    console.log('Summarizing group:', JSON.stringify(group, null, 2));
    
    // Empty group defaults to "True"
    if (!group || !group.children || !group.children.length) return 'True';
    
    // NOT operator is unary - only one child allowed
    if (group.operator === 'NOT') {
      // Format: NOT (child_condition)
      return `NOT (${summarizeGroup(group.children[0])})`;
    }
    
    // AND/OR operators are binary - join all children with the operator
    // This creates expressions like: "condition1 AND condition2 AND condition3"
    return group.children.map((child) => {
      // Recursively summarize each child (could be condition or nested group)
      if (child.type === 'group' || child.type === 'condition') {
        return summarizeGroup(child);
      }
      return '';
    }).join(` ${group.operator} `);
  }
  
  // Start the recursive summarization from the root group
  return summarizeGroup(groupRef.value);
});
</script>

<style scoped>
.condition-editor {
  margin-bottom: 16px;
}
</style> 