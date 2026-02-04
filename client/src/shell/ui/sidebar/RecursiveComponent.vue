<!-- This component results in an recursive structure like this:
  <recursive-component>
    <ul>
      <li>
        <span> General Capability </span>
        <recursive-component>
        <ul>
          <li>
            <span> Capability 1 </span>
          </li>
          <li>
            <span> Capability 2 </span>
          </li>
          <li>
            <span> Capability 3 </span>
            <recursive-component>
            <ul>
              <li>
                <span> Child of Capability 3 </span>
              </li>
            </ul>
        </ul>
        </recursive-component>
    <li>
  </ul>
  </recursive-component>
-->

<template>
  <ul>
    <!--  show elements in prop "items" as a list
          add click event to open tree view - add ".stop" so the event is not automatically given to children (event propagation)
              -otherwise clicking on the children to open their children will also close parent
          add dragevent to enable copy to workspace
              -add .preventDefault to enable own programmed drag and drop functionality
              -add .stop so that only the selected child is dragged (prevent event propagation)
    -->
    <li v-for="item in items" 
        :key="item.name" 
        @click.stop="handleItemClick(item, $event)"
        @dragstart.stop="$event => dragstart($event, item, classes)"
        draggable="true"
    >
      <!-- Every list element contains
             - a span to display their name in the tree 
             - an new recursive component containing the list of their children if not empty
      -->
      <div :style="getIndentationStyle(indentationLevel)" :class="{ expandable: hasChildItems(item) }">
        <div class="icon--light" v-show="!item.expanded">+</div>
        <div class="icon--light" v-show="item.expanded">-</div>
        <div class="icon--light" style="width:10px;"></div>
        <span>{{ item.name }}</span> 
      </div> 
      <!--
        for the new recursice component we increase the intendationLevel to get that tree view
      -->
      <recursive-component
        v-if="item.expanded && hasChildItems(item)"
        :items="item.children"
        :indentationLevel="indentationLevel + 1"
        :classes=classes
      />
    </li>
  </ul>
</template>

<script>
import { defineComponent, reactive } from 'vue';

export default defineComponent({
  name: 'RecursiveComponent',
  props: {
    items: {
      type: Object,
      required: true,
    },
    indentationLevel: {
      type: Number,
      default: 0,
    },
    classes:{
      type: String,
      default: "process_element sidebar_element"
    }
  },
  components: {
    RecursiveComponent: () => import('./RecursiveComponent.vue'),
  },
  setup() {
    const state = reactive({
      toggleItem(item) {
        item.expanded = !item.expanded;
      },
      hasChildItems(item) {
        return item.children && item.children.length > 0;
      },
      handleItemClick(item, event) {
        console.log('Clicked:', item.name);
        state.toggleItem(item);
        event.stopPropagation();
      },
    });

    return {
      ...state,
    };
  },
  methods: {
    getIndentationStyle(level) {
      const indentation = level * 20; // Adjust the indentation size as needed
      return {
        paddingLeft: `${indentation}px`,
      };
    },
    //when starting to drag an element safe attributes to datatransfer, to access them in workspace component
    dragstart(event, item, classes){
      console.log("dragstart")
      event.dataTransfer.dropEffect = "copy"
      event.dataTransfer.effectAllowed = "copy"
      event.dataTransfer.setData("item", JSON.stringify(item))
      //event.dataTransfer.setData("itemID", id)
      //event.dataTransfer.setData("itemName", name)
      event.dataTransfer.setData("itemClasses", classes)
    }
  },
});
</script>

<style scoped>
ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.expandable {
  cursor: pointer;
}
.icon--light {
      font-size: 20px;
      transition: 0.2s ease-in-out;
      display: inline-block;
  }
</style>
