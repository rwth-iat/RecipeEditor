<template>
  <ElementWindowContainer
    :elementType="normalizedElementType"
    :displayTitle="displayTitle"
    :elementClass="elementClass"
    :allowAddDialog="allowAddDialog"
    :initialPackages="initialPackages"
  >
    <template #dialog="{ open, close, addElements, elementType }">
      <MasterAddDialog
        v-show="open"
        :element_type="elementType"
        @close="close"
        @add="addElements"
      />
    </template>
  </ElementWindowContainer>
</template>

<script setup>
import { computed } from 'vue';
import ElementWindowContainer from '@/shell/ui/sidebar/ElementWindowContainer.vue';
import MasterAddDialog from '@/features/master-recipe/ui/sidebar/MasterAddDialog.vue';

const props = defineProps({
  element_type: String
});

const normalizedElementType = computed(() => {
  if (props.element_type === 'Chart Elements') return 'RecipeElements';
  return props.element_type;
});

const displayTitle = computed(() => {
  if (normalizedElementType.value === 'RecipeElements') return 'Chart Elements';
  return normalizedElementType.value || '';
});

const allowAddDialog = computed(() => {
  return normalizedElementType.value === 'Procedures';
});

const elementClass = computed(() => {
  switch (normalizedElementType.value) {
    case 'RecipeElements':
      return 'recipe_element sidebar_element';
    case 'Procedures':
      return 'procedure_element sidebar_element';
    default:
      return '';
  }
});

const initialPackages = computed(() => {
  switch (normalizedElementType.value) {
    case 'RecipeElements':
      return [
        { name: 'Begin', type: 'recipe_element', recipeElementType: 'Begin' },
        { name: 'End', type: 'recipe_element', recipeElementType: 'End' },
        { name: 'Allocation', type: 'recipe_element', recipeElementType: 'Allocation' },
        { name: 'Condition', type: 'recipe_element', recipeElementType: 'Condition' },
        { name: 'Begin and end Sequence Selection', type: 'recipe_element', recipeElementType: 'Begin and end Sequence Selection' },
        { name: 'Begin and end Simultaneous Sequence', type: 'recipe_element', recipeElementType: 'Begin and end Simultaneous Sequence' },
        { name: 'Synchronization Point', type: 'recipe_element', recipeElementType: 'Synchronization Point' },
        { name: 'Synchronization Line', type: 'recipe_element', recipeElementType: 'Synchronization Line' },
        { name: 'Synchronization Line indicating material transfer', type: 'recipe_element', recipeElementType: 'Synchronization Line indicating material transfer' }
      ];
    case 'Procedures':
      return [];
    default:
      return [];
  }
});
</script>
