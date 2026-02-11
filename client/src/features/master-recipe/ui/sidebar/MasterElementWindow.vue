<template>
  <ElementWindowContainer
    :elementType="element_type"
    :elementClass="elementClass"
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

const elementClass = computed(() => {
  switch (props.element_type) {
    case 'RecipeElements':
      return 'recipe_element sidebar_element';
    case 'Procedures':
      return 'procedure_element sidebar_element';
    default:
      return '';
  }
});

const initialPackages = computed(() => {
  switch (props.element_type) {
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
