<script setup>
//import vue from 'vue'
import { ref, toRefs } from 'vue'
import addDialog from '@/shell/ui/sidebar/addDialog.vue'
import Recursive_component from '@/shell/ui/sidebar/RecursiveComponent.vue';
import '@/shell/assets/main.scss'; //import global css 

//we define a prop elementtype so that we can use this component for materials and Processes 
//we also define mode to differentiate between general and master recipe
const props = defineProps({
    element_type: String,
    mode: {
        type: String,
        default: 'general',
    }
});
const { element_type, mode } = toRefs(props);



let element_packages = ref({})


let element_class = ""

switch (element_type.value) {
    case 'Processes':
        element_class = 'process_element sidebar_element';
        element_packages.value = mode.value === 'master'
            ? []
            : [
                { name: 'Dosage Prep Stage:', type: 'process', processElementType: 'Process Stage' },
                { name: 'Packaging Stage:', type: 'process', processElementType: 'Process Stage' },
                { name: 'Wet Mixing Operation:', type: 'process', processElementType: 'Process Operation' },
                { name: 'Dry Mixing Operation:', type: 'process', processElementType: 'Process Operation' },
                { name: 'Tableting Operation:', type: 'process', processElementType: 'Process Operation' },
                { name: 'Charge:', type: 'process', processElementType: 'Process Action' },
                { name: 'Charge with Agitation:', type: 'process', processElementType: 'Process Action' },
                { name: 'Charge to adjust pH:', type: 'process', processElementType: 'Process Action' }
            ];
        break;
    case 'Procedures':
        element_class = 'process_element sidebar_element';
        element_packages.value = [];
        break;

    case 'Materials':
        element_class = 'material_element sidebar_element';
        element_packages.value = [
            {
                name: 'Basic-Materials', type: 'material', children: [
                    { type: 'material', name: 'Educt' },
                    { type: 'material', name: 'Intermediate' },
                    { type: 'material', name: 'Product' }
                ]
            }
        ];
        break;

    case 'ChartElements':
        element_class = 'chart_element sidebar_element';
        element_packages.value = [
            {
                name: 'Basic', type: 'chart_element', children: [
                    { type: 'chart_element', name: 'Previous Operation Indicator', procedureChartElementType: 'Previous Operation Indicator' },
                    { type: 'chart_element', name: 'Next Operation Indicator', procedureChartElementType: 'Next Operation Indicator' },
                    { type: 'chart_element', name: 'Start Parallel Indicator', procedureChartElementType: 'Start Parallel Indicator' },
                    { type: 'chart_element', name: 'End Parallel Indicator', procedureChartElementType: 'End Parallel Indicator' },
                    { type: 'chart_element', name: 'Start Optional Parallel Indicator', procedureChartElementType: 'Start Optional Parallel Indicator' },
                    { type: 'chart_element', name: 'End Optional Parallel Indicator', procedureChartElementType: 'End Optional Parallel Indicator' },
                    { type: 'chart_element', name: 'Annotation', procedureChartElementType: 'Annotation' },
                    { type: 'chart_element', name: 'Other', procedureChartElementType: 'Other' }
                ]
            }
        ];
        break;

    case 'RecipeElements':
        element_class = 'recipe_element sidebar_element';
        element_packages.value = [
            { name: 'Begin', type: 'recipe_element', recipeElementType: 'Begin' },
            { name: 'End', type: 'recipe_element', recipeElementType: 'End' },
            { name: 'Allocation', type: 'recipe_element', recipeElementType: 'Allocation' },
            { name: 'Condition', type: 'recipe_element', recipeElementType: 'Condition' },
            { name: 'Begin and end Sequence Selection', type: 'recipe_element', recipeElementType: 'Begin and end Sequence Selection' },
            { name: 'Begin and end Simultaneous Sequence', type: 'recipe_element', recipeElementType: 'Begin and end Simultaneous Sequence' },
            { name: 'Synchronization Point', type: 'recipe_element', recipeElementType: 'Synchronization Point' },
            { name: 'Synchronization Line', type: 'recipe_element', recipeElementType: 'Synchronization Line' },
            { name: 'Synchronization Line indicating material transfer', type: 'recipe_element', recipeElementType: 'Synchronization Line indicating material transfer' }
        ];
        break;

    default:
        console.warn('Unknown element type:', element_type.value);
}


function addElements(elements_json) {
    console.log("materials in sidebar")
    element_packages.value = elements_json
}

let addElementsOpen = ref(false) //variable to show/hide Add Elements diaglog
// function to open/close add Elements window
const toggleAddElements = () => {
    addElementsOpen.value = !addElementsOpen.value;
}

const addBtn = ref(null);

function onAddBtnClick() {
    if (addBtn.value) {
        const rect = addBtn.value.getBoundingClientRect();
        // Emit a custom event with the button's position
        // The parent (sidebar) or addDialog can use this to position itself
        // You may need to adjust for scroll position if needed
        // For now, set a global event or use a store, or pass as prop if dialog is sibling
        window.dispatchEvent(new CustomEvent('show-add-dialog', { detail: { top: rect.top, left: rect.right } }));
    }
    toggleAddElements();
}
</script>

<template>
    <div id="elements_window">
        <div>
            <div style="float:left;">
                <h2>{{ element_type }}</h2>
            </div>
            <button ref="addBtn" @click="onAddBtnClick">
                <span class="material-icons-light">+</span>
            </button>
        </div>
        <div class="element_spacer"></div>
        <div id="elements">
            <!-- into here get the process packages imported via the javascript script-->
            <Recursive_component :items=element_packages :indentationLevel="0" :classes=element_class>
            </Recursive_component>
        </div>
    </div>
    <!--
    this Dialog window is opened and closed by the addMaterials button
    but can also be closed from inside the components close button.
    To realize that we listen to the  @onClose event
        @Close handles what happens when child is closed
        @data is used as the Ontologies are added in subcomponent but we need the data here 
	-->
    <addDialog :mode="mode" v-show="addElementsOpen" :element_type=element_type @close="addElementsOpen = false"
        @add="addElements">
    </addDialog>
</template>


<style lang="scss" scoped>
.toggle-icons {
    font-size: 1.5rem;
    color: var(--primary);
    transition: 0.2s ease-out;
    float: right;
}


/*container for material*/
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

    /*center this horizontally in the middle*/
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