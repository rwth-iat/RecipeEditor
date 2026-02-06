<template>
  <div class="chart-element-section"></div>
</template>

<script setup>
defineProps({
  selectedElement: {
    type: Object,
    required: true
  }
});

defineEmits(['update:selectedElement']);
</script>
