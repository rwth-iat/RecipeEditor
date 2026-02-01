<template>
  <div class="property-window-content">
    <div class="property-window-header">
      <slot name="header">
        <h2>{{ title }}</h2>
        <button @click="emitClose" class="closeBtt">X</button>
        <button @click="emitOpenInWorkspace" class="openWorkspaceBtt">Open in Workspace</button>
        <button @click="emitDeleteElement" class="deleteBtt">Delete</button>
      </slot>
    </div>

    <slot
      :selected-element="computedSelectedElement"
      :mode="mode"
      :workspace-items="workspaceItems"
      :connections="connections"
    />
  </div>
</template>

<script setup>
import '@/shell/assets/main.scss';
import { computed } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: 'Property Window'
  },
  selectedElement: Object,
  mode: {
    type: String,
    default: 'general'
  },
  workspaceItems: {
    type: Array,
    default: () => []
  },
  connections: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'openInWorkspace', 'deleteElement', 'update:selectedElement']);

const computedSelectedElement = computed({
  get: () => props.selectedElement,
  set: (value) => emit('update:selectedElement', value)
});

const emitClose = () => emit('close');
const emitOpenInWorkspace = () => emit('openInWorkspace');
const emitDeleteElement = () => emit('deleteElement');
</script>

<style>
input.locked-input,
textarea {
  background: lightslategrey;
}

.property-window-content {
  overflow-y: scroll;
  height: 100%;
  float: right;
  background-color: var(--dark);
  color: var(--light);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  /* Arrange children vertically */
  padding: 20px;
  transition: transform 0.8s ease-in-out;
  /* Adjust the duration as needed */
  border-radius: 5px;
}

.deleteBtt {
  margin-left: 15px;
  padding: 5px;
  color: red;
  float: right;
  background-color: var(--light);
  border: 1px solid red;
  border-radius: 4px;
  box-sizing: border-box;
}

.openWorkspaceBtt {
  padding: 5px;
  color: black;
  float: right;
  background-color: var(--light);
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

.property-window-content h2 {
  margin-top: 0;
}

.property-window-content label {
  display: block;
  margin-top: 10px;
}

.property-window-content input {
  width: 100%;
  padding: 8px;
  margin-top: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

input,
select {
  height: 36px;
  padding: 5px;
  font-size: 14px;
  border-radius: 4px;
  border: 1px solid #ccc;
  box-sizing: border-box;

}

/* Property Window Header */
.property-window-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #dee2e6;
  color: white;
}

.property-window-header h2 {
  margin: 0;
  color: #ffffff;
}

/* Subsection headers */
h3 {
  color: #ffffff;
  font-size: 16px;
  margin: 20px 0 15px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #dee2e6;
  font-weight: 600;
}
</style>
