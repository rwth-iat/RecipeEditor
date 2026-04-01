<template>
  <ul class="ontology-class-tree" role="tree">
    <li
      v-for="item in items"
      :key="item.name"
      class="ontology-class-tree__item"
      role="treeitem"
      :aria-expanded="hasChildItems(item) ? String(Boolean(item.expanded)) : undefined"
      :aria-selected="String(selectedClass === item.name)"
    >
      <div class="ontology-class-tree__row" :style="getIndentationStyle(indentationLevel)">
        <button
          v-if="hasChildItems(item)"
          type="button"
          class="ontology-class-tree__toggle"
          :aria-label="item.expanded ? `Collapse ${item.name}` : `Expand ${item.name}`"
          @click.stop="toggleItem(item)"
        >
          {{ item.expanded ? '-' : '+' }}
        </button>
        <span v-else class="ontology-class-tree__bullet" aria-hidden="true"></span>

        <button
          type="button"
          class="ontology-class-tree__label"
          :class="{ 'ontology-class-tree__label--selected': selectedClass === item.name }"
          @click.stop="$emit('select', item.name)"
        >
          {{ item.name }}
        </button>
      </div>

      <OntologyClassTree
        v-if="item.expanded && hasChildItems(item)"
        :items="item.children"
        :selectedClass="selectedClass"
        :indentationLevel="indentationLevel + 1"
        @select="$emit('select', $event)"
      />
    </li>
  </ul>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'OntologyClassTree',
  props: {
    items: {
      type: Array,
      default: () => [],
    },
    selectedClass: {
      type: String,
      default: '',
    },
    indentationLevel: {
      type: Number,
      default: 0,
    },
  },
  emits: ['select'],
  components: {
    OntologyClassTree: () => import('./OntologyClassTree.vue'),
  },
  methods: {
    hasChildItems(item) {
      return Array.isArray(item?.children) && item.children.length > 0;
    },
    toggleItem(item) {
      item.expanded = !item.expanded;
    },
    getIndentationStyle(level) {
      return {
        paddingLeft: `${level * 18}px`,
      };
    },
  },
});
</script>

<style scoped>
.ontology-class-tree {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ontology-class-tree__item + .ontology-class-tree__item {
  margin-top: 2px;
}

.ontology-class-tree__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ontology-class-tree__toggle,
.ontology-class-tree__label {
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
}

.ontology-class-tree__toggle {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  cursor: pointer;
}

.ontology-class-tree__toggle:hover {
  background: rgba(255, 255, 255, 0.08);
}

.ontology-class-tree__bullet {
  width: 22px;
  display: inline-flex;
  justify-content: center;
  color: #8aa1b8;
}

.ontology-class-tree__bullet::before {
  content: '•';
}

.ontology-class-tree__label {
  flex: 1;
  text-align: left;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
}

.ontology-class-tree__label:hover {
  background: rgba(108, 160, 246, 0.14);
}

.ontology-class-tree__label--selected {
  background: rgba(108, 160, 246, 0.24);
  outline: 1px solid #6ca0f6;
}
</style>
