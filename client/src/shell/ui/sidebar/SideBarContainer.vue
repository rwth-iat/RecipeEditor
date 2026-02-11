<template>
  <aside :class="`${isExpanded ? 'is-expanded' : ''}`" @dragenter.prevent @dragover.prevent>
    <div class="menu-toggle-wrap">
      <button class="menu-toggle" @click="toggleMenu">
        <span class="icon--light">>></span>
      </button>
    </div>

    <div v-show="isExpanded" class="sidebar-content">
      <slot />
    </div>
  </aside>
</template>

<script setup>
import '@/shell/assets/main.scss';
import { ref } from 'vue';

const isExpanded = ref(localStorage.getItem('is_expanded') === 'true');

const toggleMenu = () => {
  isExpanded.value = !isExpanded.value;
  localStorage.setItem('is_expanded', isExpanded.value);
};
</script>

<style lang="scss" scoped>
aside {
  z-index: 2;
  display: flex;
  flex-direction: column;
  background-color: var(--dark);
  color: var(--light);
  width: calc(2rem + 32px);
  height: 100%;
  overflow-y: scroll;
  padding: 1rem;
  transition: 0.2s ease-in-out;

  .menu-toggle-wrap {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 0.5rem;
    transition: 0.2s ease-in-out;
  }

  .sidebar-content {
    display: grid;
    grid-template-columns: max-content;
    grid-auto-rows: max-content;
    row-gap: 10px;
  }

  &.is-expanded {
    width: var(--sidebar-width);

    .menu-toggle-wrap {
      .menu-toggle {
        transform: rotate(-180deg);
        transition: 0.2s ease-in-out;
      }
    }
  }

  @media (max-width: 768px) {
    z-index: 99;
  }
}
</style>
