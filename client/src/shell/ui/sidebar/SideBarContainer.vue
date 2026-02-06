<template>
  <aside :class="`${isExpanded ? 'is-expanded' : ''}`" @dragenter.prevent @dragover.prevent>
    <div class="menu-toggle-wrap">
      <button class="menu-toggle" @click="toggleMenu">
        <span class="icon--light">>></span>
      </button>
    </div>

    <div v-show="isExpanded">
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

  h3,
  .button .text {
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
  }

  h3 {
    color: var(--grey);
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
  }

  .menu {
    margin: 0 -1rem;

    .button {
      display: flex;
      align-items: center;
      text-decoration: none;
      transition: 0.2s ease-in-out;
      padding: 0.5rem 1rem;

      .text {
        color: var(--light);
        transition: 0.2s ease-in-out;
      }
    }
  }

  &.is-expanded {
    width: var(--sidebar-width);

    .menu-toggle-wrap {
      top: -3rem;

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

:deep(.element_spacer) {
  height: 10px;
}
</style>
