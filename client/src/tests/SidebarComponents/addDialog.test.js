import { mount } from "@vue/test-utils";
import addDialog from "../../components/SidebarComponents/addDialog.vue";
import { expect, test, afterAll } from "vitest";
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import flushPromises from 'flush-promises';

// Create an instance of the mock adapter
const mock = new MockAdapter(axios);

// Mock the GET requests
mock
  .onGet('/onto')
  .reply(200, [
    "Onto 1",
    "Onto 2"
  ]);

mock
  .onGet('/onto/test_ontology.owl/classes')
  .reply(200, [
    "Class A",
    "Class B",
    "Class C"
  ]);

const test_subclasses_payload = [
   {"name":"Combining","children":[
      {"name":"Absorbing","children":[
         {"name":"Absorbing_child1","children":[]},
         {"name":"Absorbing_child2","children":[]}]
      },
      {"name":"Adsorbing","children":[]},
      {"name":"Atomizing","children":[]},
      {"name":"Dissolving","children":[]},
      {"name":"Emulsifying","children":[]}]
   }
] 
mock
  .onGet('/onto/test_ontology.owl/Combining/subclasses')
  .reply(200, test_subclasses_payload);

// Rest of your test setup, for example:
// import your Vue component, mount it, and write your test cases

// After all tests, reset the mock adapter
afterAll(() => mock.reset());


test("mount Materials component", async () => {
   const wrapper = mount(addDialog, {
      propsData: {
         element_type: 'Materials'
      }
    })
   expect(wrapper.props().element_type).toBe('Materials')
   expect(addDialog).toBeTruthy();

});

test("mount Processes component", async () => {
   const wrapper = mount(addDialog, {
      propsData: {
         element_type: 'Processes'
      }
    })
   expect(wrapper.props().element_type).toBe('Processes')
   expect(addDialog).toBeTruthy();
});

// test("list available ontologies as options", async () => {
//    const wrapper = mount(addDialog, {
//       propsData: {
//          element_type: 'Processes'
//       }
//     })
//    expect(wrapper.props().element_type).toBe('Processes')
//    expect(addDialog).toBeTruthy();
//    await wrapper.vm.$nextTick();
//    await wrapper.vm.$nextTick();
//    // Find the options select element using wrapper.find()
//    const ontoSelect = wrapper.find('#ontoSelect');
//    // Access the options property and check the length
//    const numOptions = ontoSelect.element.options.length;
//    // should in this test always be 2 as it has the "addnew" and "capability_with_query" 
//    expect(numOptions).toBe(3)
//    expect(ontoSelect.element.options[0].textContent).toBe('Onto 1');
//    expect(ontoSelect.element.options[1].textContent).toBe('Onto 2');
//    expect(ontoSelect.element.options[2].textContent).toBe('add new to server');
// });
test("list available ontologies as options", async () => {
  const wrapper = mount(addDialog, { propsData: { element_type: 'Processes' } });
  await flushPromises();              // wartet auf den GET /onto Mock
  const ontoSelect = wrapper.find('#ontoSelect');
  const numOptions = ontoSelect.element.options.length;
  expect(numOptions).toBe(3);
  expect(ontoSelect.element.options[0].textContent).toBe('Onto 1');
  expect(ontoSelect.element.options[1].textContent).toBe('Onto 2');
  expect(ontoSelect.element.options[2].textContent).toBe('add new to server');
});

// test("list classes of ontology as options", async () => {
//    const wrapper = mount(addDialog, {
//      propsData: {
//        element_type: 'Processes'
//      }
//    });

//    // Trigger the function that fetches ontology classes
//    await wrapper.vm.readServerOntoClasses('test_ontology.owl');

//    // Wait for the component to update after the API call
//    // two ticks are needed, i dont know why
//    await wrapper.vm.$nextTick();
//    await wrapper.vm.$nextTick();

//    // Now, find the options select element using wrapper.find()
//    const classSelect = wrapper.find('#super_class_select');
//    // Access the options property and check the length
//    const numOptions = classSelect.element.options.length;

//    // Assertions
//    expect(numOptions).toBe(3); // Adjust the expected number of options based on your mock response
//    expect(classSelect.element.options[0].textContent).toBe('Class A');
//    expect(classSelect.element.options[1].textContent).toBe('Class B');
//    expect(classSelect.element.options[2].textContent).toBe('Class C');
//  });

test("list classes of ontology as options", async () => {
  const wrapper = mount(addDialog, { propsData: { element_type: 'Processes' } });
  await wrapper.vm.readServerOntoClasses('test_ontology.owl'); // löst den Mock aus
  await flushPromises();              // wartet auf den GET /onto/.../classes Mock
  const classSelect = wrapper.find('#super_class_select');
  const numOptions = classSelect.element.options.length;
  expect(numOptions).toBe(3);
  expect(classSelect.element.options[0].textContent).toBe('Class A');
  expect(classSelect.element.options[1].textContent).toBe('Class B');
  expect(classSelect.element.options[2].textContent).toBe('Class C');
});

test("add subclasses button", async () => {
   const wrapper = mount(addDialog, {
      propsData: {
        element_type: 'Processes'
      }
   });
    
   /*
   //set selected onto
   let onto_select = wrapper.find("#ontoSelect")
   await onto_select.setValue("test_ontology.owl");
   await onto_select.trigger('change');

   //set selected class
   let class_select = wrapper.find("#super_class_select")
   await class_select.setValue("Combining");
   await class_select.trigger('change');
   */

   // Update the value of current_ontology
   wrapper.vm.current_ontology = 'test_ontology.owl';
   wrapper.vm.current_super_class = 'Combining';

   await wrapper.vm.$nextTick();

   let add_elements_button = wrapper.find("#add_elements_button")
   await add_elements_button.trigger('click');

   // Check if the 'myEvent' has been emitted
   expect(wrapper.emitted('add')).toBeTruthy();

   // Access the emitted event payload (if needed)
   const emittedEventPayload = wrapper.emitted('add');

   // Perform assertions on the emitted payload
   //expect(emittedEventPayload.length).toBe(1); // Event should have been emitted once
   // TODO: not quite as expected
   // array structure is a bit weird, need to look into it! 
   expect(emittedEventPayload[1][0]).toEqual(test_subclasses_payload);

});