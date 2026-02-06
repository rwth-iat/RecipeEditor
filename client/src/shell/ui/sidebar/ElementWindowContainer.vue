<template>
  <div id="elements_window">
    <div class="elements-header">
      <div style="float:left;">
        <h2>{{ elementType }}</h2>
      </div>
      <button ref="addBtn" @click="onAddBtnClick">
        <span class="icon--light">+</span>
      </button>
    </div>
    <div class="element_spacer"></div>
    <div id="elements">
      <Recursive_component :items="elementPackages" :indentationLevel="0" :classes="elementClass" />
    </div>
  </div>

  <slot
    name="dialog"
    :open="addElementsOpen"
    :close="closeAddElements"
    :addElements="addElements"
    :elementType="elementType"
  />
</template>

<script setup>
import '@/shell/assets/main.scss';
import { ref, toRefs, watch } from 'vue';
import Recursive_component from '@/shell/ui/sidebar/RecursiveComponent.vue';

const props = defineProps({
  elementType: String,
  elementClass: String,
  initialPackages: {
    type: Array,
    default: () => []
  }
});

const { elementType, elementClass, initialPackages } = toRefs(props);

const clonePackages = (value) => JSON.parse(JSON.stringify(value || []));
const elementPackages = ref(clonePackages(initialPackages.value));

watch(
  () => initialPackages.value,
  (val) => {
    elementPackages.value = clonePackages(val);
  },
  { deep: true }
);

function addElements(elements_json) {
  if (elements_json === undefined) return;
  elementPackages.value = elements_json;
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
  if (addBtn.value) {
    const rect = addBtn.value.getBoundingClientRect();
    window.dispatchEvent(new CustomEvent('show-add-dialog', { detail: { top: rect.top, left: rect.right } }));
  }
  toggleAddElements();
}
</script>

<style lang="scss" scoped>
.toggle-icons {
  font-size: 1.5rem;
  color: var(--primary);
  transition: 0.2s ease-out;
  float: right;
}

#elements_window {
  box-sizing: border-box;
  width: calc(var(--sidebar-width)*0.9);
  height: auto;
  float: left;
  vertical-align: top;
  justify-content: center;
  align-items: center;
  border-radius: 5px;
  border-width: 1px;
  border-style: solid;
  border-color: black;
}

#elements {
  box-sizing: border-box;
  align-items: center;
}

.sidebar_element {
  width: 200px;
  height: auto;
  text-align: center;
  border-radius: 5px;
  border-width: 1px;
  border-style: solid;
  border-color: black;

  display: block;
  margin-left: auto;
  margin-right: auto;
}

.heading {
  text-align: center;
}

.element_spacer {
  height: var(--element-height);
}
</style>
