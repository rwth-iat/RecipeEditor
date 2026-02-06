<template>
  <AddDialogContainer :elementType="element_type" @close="$emit('close')">
    <form class="dialog-form">
      <span>Select Ontology: </span>
      <div class="row-flex">
        <select
          v-model="current_ontology"
          name="Ontology"
          id="ontoSelect"
          @change="readServerOntoClasses(current_ontology)"
        >
          <option :value="item" v-for="item in serverProcessOntologies" :key="item">{{ item }}</option>
          <option value="new">add new to server</option>
        </select>
        <button type="button" class="icon-btn" @click="readServerOntologies" title="Reload ontologies">
          <span class="reload">&#x21bb;</span>
        </button>
      </div>
      <div v-if="current_ontology === 'new'">
        <span>Choose a File or URL</span>
        <select v-model="addOption" id="addOption">
          <option value="file">File</option>
          <option value="url">URL</option>
        </select>
        <div v-if="addOption === 'url'">
          <label for="url_input">Select URL: </label>
          <input type="url" id="url_input" />
        </div>
        <div v-else-if="addOption === 'file'">
          <label for="file_input">Select File: </label>
          <input
            @change="$event => onFileChange($event)"
            type="file"
            id="file_input"
            enctype="multipart/form-data"
          />
        </div>
        <div class="row-flex">
          <label for="add_to_server_btt">Add Ontology to Server: </label>
          <button class="button" type="button" @click="addOntoToServer('test.owl', current_file)">
            <h5>ADD Ontology to Server</h5>
          </button>
        </div>
      </div>
      <div v-else>
        <label for="super_class_select">Select Name of Superclass: </label>
        <select id="super_class_select" v-model="current_super_class" name="super-class">
          <option v-for="item in onto_classes" :value="item" :key="item">{{ item }}</option>
        </select>
        <label for="relation_input">Name of Relation: </label>
        <input id="relation_input" type="text" value="subclass_of" />
        <div class="row-flex">
          <button id="add_elements_button" class="button" type="button"
            @click="addElements(current_ontology, current_super_class)">
            <h5>ADD {{ element_type }} to Sidebar</h5>
          </button>
        </div>
      </div>
    </form>
  </AddDialogContainer>
</template>

<script setup>
import { ref, toRefs } from 'vue';
import axios from 'axios';
import AddDialogContainer from '@/shell/ui/sidebar/AddDialogContainer.vue';

const props = defineProps({
  element_type: String
});
const { element_type } = toRefs(props);

const emit = defineEmits(['close', 'add']);

const current_ontology = ref('');
const addOption = ref('');
const current_super_class = ref('');
const serverProcessOntologies = ref([""]);
const onto_classes = ref([]);
const current_file = ref({});

const client = axios.create({
  baseURL: ''
});

function readServerOntologies() {
  client.get('/onto')
    .then(response => {
      console.log("read server ontologies successful");
      serverProcessOntologies.value = response.data;
    })
    .catch(error => {
      console.log("error trying to read server ontologies");
      console.log(error);
    });
}

function readServerOntoClasses(name) {
  if (name !== "new") {
    client.get('/onto/' + name + '/classes')
      .then(response => {
        onto_classes.value = response.data;
      })
      .catch(error => {
        console.log(error.response);
      });
  }
}

function onFileChange($event) {
  const target = $event.target;
  if (target && target.files) {
    current_file.value = target.files[0];
  }
}

function addOntoToServer(name, file) {
  let formData = new FormData();
  formData.append("file", file);
  console.log("test");
  client.post('/onto', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
    .then(response => {
      console.log(response.data);
      console.log("test");
    })
    .catch(error => {
      console.log(error.response);
    });
}

function addOnto(ontoName, className) {
  client.get('/onto/' + ontoName + '/' + className + '/subclasses')
    .then(response => {
      console.log(response.data);
      emit('add', response.data);
    })
    .catch(error => {
      console.log(error.response);
    });
}

function addElements(ontoName, className) {
  console.log("adding started");
  console.log(ontoName + className);
  let elements_json = addOnto(ontoName, className);
  console.log(elements_json);
  emit('add', elements_json);
}

readServerOntologies();
</script>
