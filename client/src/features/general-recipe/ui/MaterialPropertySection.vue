<template>
  <div>
    <label for="materialType">MaterialType:</label>
    <select id="materialType" v-model="selectedElementModel.materialType">
      <option value="Input">Input</option>
      <option value="Intermediate">Intermediate</option>
      <option value="Output">Output</option>
    </select>

    <label for="materialID">MaterialID:</label>
    <input type="text" id="materialID" v-model="selectedElementModel.materialID" />

    <label for="order">Order:</label>
    <input type="text" id="order" v-model="selectedElementModel.order" />

    <label for="amount">Amount:</label>
    <ValueTypeProperty
      :id="'amount'"
      :valueType="selectedElementModel.amount"
      @update:valueType="selectedElementModel.amount = $event"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
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
</script>
