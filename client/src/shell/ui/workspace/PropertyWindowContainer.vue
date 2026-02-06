<template>
  <div class="property-window-content">
    <!-- Header with close, workspace, and delete actions -->
    <div class="property-window-header">
      <div class="property-window-actions">
        <div class="property-window-actions-left">
          <button @click="emitClose">
            <span class="icon--light">>></span>
          </button>
        </div>
        <div class="property-window-actions-right">
          <button
            v-if="showOpenInWorkspace"
            class="button-with-border"
            @click="emitOpenInWorkspace"
          >
            Open in Workspace
          </button>
          <button class="button-with-border--red" @click="emitDeleteElement">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M7 21q-.825 0-1.413-.588T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.588 1.413T17 21H7ZM17 6H7v13h10V6ZM9 17h2V8H9v9Zm4 0h2V8h-2v9ZM7 6v13V6Z"
              />
            </svg>
          </button>
        </div>
      </div>
      <h2>{{ title }}</h2>
      <!--General Properties-->
      <label for="id">Element ID:</label>
      <input type="text" id="id" v-model="computedSelectedElement.id" readonly class="locked-input"/>
      <label for="description">Description:</label>
      <input type="text" id="description" v-model="computedSelectedElement.description"/>
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
    default: 'Properties'
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
  },
  showOpenInWorkspace: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'openInWorkspace', 'deleteElement', 'update:selectedElement']);

const computedSelectedElement = computed({
  get: () => props.selectedElement,
  set: (value) => emit('update:selectedElement', value)
});

const emitClose = () => emit('close');
const emitOpenInWorkspace = () => emit('openInWorkspace');
const emitDeleteElement = () => emit('deleteElement', computedSelectedElement.value);
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

select {
  padding-right: 34px;
}

/* Property Window Header */
.property-window-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  justify-content: space-between;
  align-items: left;
}

.property-window-actions {
  width: 100%;
  display: flex;
  align-items: center;
}

.property-window-actions-left {
  display: flex;
  align-items: center;
}

.property-window-actions-right {
  display: flex;
  align-items: center;
  margin-left: auto;
  gap: 0px;
}

.property-window-actions-right .button-with-border,
.property-window-actions-right .button-with-border--red {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 2px;
}

.property-window-header h2 {
  margin: 0;
  color: #ffffff;
}

/* Subsection headers */
h3 {
  color: #ffffff;
  font-size: 16px;
  margin: 20px 0 0 0;
  padding-bottom: 5px;
  font-weight: 600;
}
</style>
