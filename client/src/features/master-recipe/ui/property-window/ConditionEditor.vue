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
import ConditionGroupEditor from '@/features/master-recipe/ui/property-window/ConditionGroupEditor.vue';
import { stringifyConditionGroup } from '@/services/recipe/master-recipe/conditions/conditionGroupUtils';

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
  const stepLabelById = new Map(
    (Array.isArray(props.availableSteps) ? props.availableSteps : []).map((step) => [
      step.id,
      step.name || step.id,
    ])
  );
  const summary = stringifyConditionGroup(groupRef.value, {
    quoteStepInstance: true,
    resolveStepLabel: (stepId) => stepLabelById.get(stepId) || stepId,
  });
  return summary || 'True';
});
</script>

<style scoped>
.condition-editor {
  margin-bottom: 16px;
}
</style> 
