<template>
  <div id="elements_window">
    <div class="elements-header">
      <h2>{{ resolvedTitle }}</h2>
      <button v-if="allowAddDialog" ref="addBtn" class="elements-add-button" @click="onAddBtnClick">
        <span class="icon--light">+</span>
      </button>
    </div>
    <div id="elements">
      <Recursive_component :items="basePackages" :indentationLevel="0" :classes="elementClass" />

      <div
        v-for="group in importedElementGroups"
        :key="group.id"
        class="imported-elements-window"
      >
        <div class="imported-elements-header">
          <h3>{{ group.title }}</h3>
          <button
            type="button"
            class="button-with-border--red imported-elements-delete"
            aria-label="Delete imported sidebar elements"
            @click="removeImportedGroup(group.id)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M7 21q-.825 0-1.413-.588T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.588 1.413T17 21H7ZM17 6H7v13h10V6ZM9 17h2V8H9v9Zm4 0h2V8h-2v9Z"
              />
            </svg>
          </button>
        </div>
        <Recursive_component :items="group.items" :indentationLevel="0" :classes="elementClass" />
      </div>
    </div>
  </div>

  <slot
    v-if="allowAddDialog"
    name="dialog"
    :open="addElementsOpen"
    :close="closeAddElements"
    :addElements="addElements"
    :elementType="elementType"
  />
</template>

<script setup>
import '@/shell/assets/main.scss';
import { computed, ref, toRefs, watch } from 'vue';
import Recursive_component from '@/shell/ui/sidebar/RecursiveComponent.vue';

const props = defineProps({
  elementType: String,
  displayTitle: {
    type: String,
    default: ''
  },
  elementClass: String,
  allowAddDialog: {
    type: Boolean,
    default: false
  },
  initialPackages: {
    type: Array,
    default: () => []
  }
});

const { elementType, displayTitle, elementClass, allowAddDialog, initialPackages } = toRefs(props);

const resolvedTitle = computed(() => {
  const title = (displayTitle.value || '').trim();
  return title || elementType.value;
});

const clonePackages = (value) => JSON.parse(JSON.stringify(value || []));
const basePackages = ref(clonePackages(initialPackages.value));
const importedElementGroups = ref([]);

watch(
  () => initialPackages.value,
  (val) => {
    basePackages.value = clonePackages(val);
  },
  { deep: true }
);

function normalizeImportedGroup(payload) {
  if (payload === undefined || payload === null) return null;

  let items = [];
  let title = 'Imported Elements';

  if (Array.isArray(payload)) {
    items = payload;
  } else if (Array.isArray(payload.items)) {
    items = payload.items;
    if (payload.title) title = payload.title;
  }

  if (!Array.isArray(items) || items.length === 0) return null;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title.toString().trim() || 'Imported Elements',
    items: clonePackages(items)
  };
}

function addElements(payload) {
  const normalizedGroup = normalizeImportedGroup(payload);
  if (!normalizedGroup) return;
  importedElementGroups.value.push(normalizedGroup);
}

function removeImportedGroup(groupId) {
  importedElementGroups.value = importedElementGroups.value.filter(group => group.id !== groupId);
}

const addElementsOpen = ref(false);
const toggleAddElements = () => {
  addElementsOpen.value = !addElementsOpen.value;
};
const closeAddElements = () => {
  addElementsOpen.value = false;
};

const addBtn = ref(null);
function onAddBtnClick() {
  if (!allowAddDialog.value) return;
  if (addBtn.value) {
    const rect = addBtn.value.getBoundingClientRect();
    window.dispatchEvent(new CustomEvent('show-add-dialog', { detail: { top: rect.top, left: rect.right } }));
  }
  toggleAddElements();
}
</script>

<style lang="scss" scoped>
#elements_window {
  position: relative;
  box-sizing: border-box;
  width: auto;
  height: auto;
  padding: 5px; // Adjust boarder offset
  border-radius: 5px;
  border-width: 1px;
  border-style: solid;
  border-color: lightgray;
}

.elements-header {
  display: block;
}

.elements-header h2 {
  margin: 1px;
  padding-right: 2.4rem;
}

.elements-add-button {
  position: absolute;
  top: 2px;
  right: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
}

#elements {
  margin-top: 3px; // Adjust spacing between header and elements
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.imported-elements-window {
  border: 1px solid lightgray;
  border-radius: 5px;
  padding: 4px;
}

.imported-elements-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.imported-elements-header h3 {
  margin: 0;
  font-size: 0.95rem;
}

.imported-elements-delete {
  float: none;
  margin: 0;
  padding: 0 0px;
  min-height: 22px;
  border: 1px solid var(--red);
  background: #fff;
  color: var(--red);
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  line-height: 1;
}

</style>
