<template>
  <div class="property-window-actions-left">
    <button @click="$emit('close')">
      <span class="icon--light">>></span>
    </button>
  </div>
  <div class="property-window-actions-right">
    <button v-if="showOpenInWorkspace" class="button-with-border" @click="$emit('openInWorkspace')">
      Open in Workspace
    </button>
    <button class="button-with-border--red" @click="$emit('deleteElement')">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M7 21q-.825 0-1.413-.588T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.588 1.413T17 21H7ZM17 6H7v13h10V6ZM9 17h2V8H9v9Zm4 0h2V8h-2v9ZM7 6v13V6Z"
        />
      </svg>
    </button>
  </div>
</template>

<script setup>
defineProps({
  showOpenInWorkspace: {
    type: Boolean,
    default: false
  }
});

defineEmits(['close', 'openInWorkspace', 'deleteElement']);
</script>
