<template>
  <header id="topbar">
    <button class="button-with-border" style="float:left;" @click="triggerExportInWorkspace">Export</button>
    <h3>{{ title }}</h3>
    <div class="dropdown">
      <button class="button-with-border settings-button" @click="toggleDropdown">
        ⚙ Settings
      </button>
      <div v-if="dropdownVisible" class="dropdown-menu">
        <router-link to="/" class="dropdown-item">General Recipe</router-link>
        <router-link to="/master-recipe" class="dropdown-item">Master Recipe</router-link>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  title: String
})
const emit = defineEmits(['trigger-export']);
const dropdownVisible = ref(false);

const triggerExportInWorkspace = () => {
  console.log("trigger-export")
  emit('trigger-export');
};

const toggleDropdown = () => {
  dropdownVisible.value = !dropdownVisible.value;
};

</script>

<style lang="scss">
/*container for the page heading*/
#topbar {
  display: flex;
  align-items: center;
  width: 100vw;
  text-align: center;
  background-color: var(--primary);
  color: white;
}

h3 {
  flex-grow: 1;
  text-align: center;
  margin: 0;
}

#exportBtt {
  display: flex;
}

/* Dropdown container */
.dropdown {
  position: relative;
}

/* Settings Button */
.settings-button {
  cursor: pointer;
  padding: 8px 12px;
  background: white;
  border: 1px solid var(--primary);
  border-radius: 5px;
}

/* Dropdown menu */
.dropdown-menu {
  position: absolute;
  top: 40px;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 5px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
  min-width: 150px;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

/* Dropdown menu items */
.dropdown-item {
  padding: 10px;
  text-decoration: none;
  color: black;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #f1f1f1;
}
</style>
