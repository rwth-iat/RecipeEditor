import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import flushPromises from "flush-promises";
import { MATERIAL_CONTAINER_TYPE } from "@/services/recipe/general-recipe/materials/materialContainerUtils";

const mockClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => mockClient),
  },
}));

import GeneralAddDialog from "@/features/general-recipe/ui/sidebar/GeneralAddDialog.vue";

function mountDialog(elementType) {
  return mount(GeneralAddDialog, {
    props: {
      element_type: elementType,
    },
  });
}

function createOntologyFile(contents, filename, type = "application/octet-stream") {
  return new File([contents], filename, { type });
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createOntologyClassGraph(rootIris, nodes) {
  return {
    rootIris,
    nodes,
  };
}

function createOntologyGraphNode({ iri, name, label = "", childIris = [], parentIris = [] }) {
  return {
    iri,
    name,
    label,
    childIris,
    parentIris,
    otherInformation: [],
  };
}

describe("GeneralAddDialog", () => {
  beforeEach(() => {
    mockClient.get.mockReset();
    mockClient.post.mockReset();
    mockClient.delete.mockReset();
  });

  it("loads process ontologies from the categorized endpoint", async () => {
    mockClient.get.mockResolvedValueOnce({ data: [] });

    mountDialog("Processes");
    await flushPromises();

    expect(mockClient.get).toHaveBeenCalledWith("/onto/processes");
  });

  it("loads material ontologies from the categorized endpoint", async () => {
    mockClient.get.mockResolvedValueOnce({ data: [] });

    mountDialog("Materials");
    await flushPromises();

    expect(mockClient.get).toHaveBeenCalledWith("/onto/materials");
  });

  it("shows an ontology loading message while ontologies are loading", async () => {
    const deferredOntologies = createDeferred();

    mockClient.get.mockImplementation((url) => {
      if (url === "/onto/materials") {
        return deferredOntologies.promise;
      }
      if (url === "/onto/materials/materials.owl/class-tree") {
        return Promise.resolve({
          data: createOntologyClassGraph(
            ["http://example.com/material#MaterialRoot"],
            {
              "http://example.com/material#MaterialRoot": createOntologyGraphNode({
                iri: "http://example.com/material#MaterialRoot",
                name: "MaterialRoot",
              }),
            }
          ),
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    const wrapper = mountDialog("Materials");
    await flushPromises();

    expect(wrapper.text()).toContain("Loading ontologies from server. Large ontology files can take some time.");
    expect(wrapper.find(".ontology-loading-note").exists()).toBe(true);
    expect(wrapper.find("#ontoSelect").attributes("disabled")).toBeDefined();

    deferredOntologies.resolve({ data: ["materials.owl"] });
    await flushPromises();

    expect(wrapper.text()).not.toContain("Loading ontologies from server. Large ontology files can take some time.");
    expect(wrapper.vm.current_ontology).toBe("materials.owl");
  });

  it("shows a Turtle precheck hint and enables upload", async () => {
    mockClient.get.mockResolvedValueOnce({ data: [] });
    const wrapper = mountDialog("Materials");
    await flushPromises();

    const file = createOntologyFile(
      "@prefix : <http://example.com/materials#> .\n@base <http://example.com/materials/> .\n",
      "materials.ttl",
      "text/turtle"
    );

    await wrapper.vm.onFileChange({ target: { files: [file] } });
    await flushPromises();

    expect(wrapper.text()).toContain("Detected Turtle ontology");
    expect(wrapper.find("#add_to_server_btt").attributes("disabled")).toBeUndefined();
  });

  it("shows a Manchester precheck hint and enables upload", async () => {
    mockClient.get.mockResolvedValueOnce({ data: [] });
    const wrapper = mountDialog("Processes");
    await flushPromises();

    const file = createOntologyFile(
      "Prefix: : <http://example.com/process#>\nOntology: <http://example.com/process>\n\nClass: :Capability\n",
      "process.owl",
      "text/plain"
    );

    await wrapper.vm.onFileChange({ target: { files: [file] } });
    await flushPromises();

    expect(wrapper.text()).toContain("Detected Manchester ontology");
    expect(wrapper.find("#add_to_server_btt").attributes("disabled")).toBeUndefined();
  });

  it("shows an inline error for unsupported ontology content", async () => {
    mockClient.get.mockResolvedValueOnce({ data: [] });
    const wrapper = mountDialog("Processes");
    await flushPromises();

    const file = createOntologyFile("not an ontology file", "invalid.owl", "text/plain");

    await wrapper.vm.onFileChange({ target: { files: [file] } });
    await flushPromises();

    expect(wrapper.text()).toContain("could not be recognized");
    expect(wrapper.find("#add_to_server_btt").attributes("disabled")).toBeDefined();
  });

  it("uploads an ontology, refreshes the list, and loads classes", async () => {
    mockClient.get.mockImplementation((url) => {
      if (url === "/onto/processes") {
        if (mockClient.get.mock.calls.filter(([path]) => path === "/onto/processes").length === 1) {
          return Promise.resolve({ data: [] });
        }
        return Promise.resolve({ data: ["uploaded.owl"] });
      }
      if (url === "/onto/processes/uploaded.owl/class-tree") {
        return Promise.resolve({
          data: createOntologyClassGraph(
            ["http://example.com/process#ProcessRoot"],
            {
              "http://example.com/process#ProcessRoot": createOntologyGraphNode({
                iri: "http://example.com/process#ProcessRoot",
                name: "ProcessRoot",
              }),
            }
          ),
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    mockClient.post.mockResolvedValueOnce({
      data: {
        message: "Ontology uploaded successfully.",
        filename: "uploaded.owl",
        category: "processes",
        detectedFormat: "rdfxml",
        canonicalFormat: "rdfxml",
      },
    });

    const wrapper = mountDialog("Processes");
    await flushPromises();

    const file = createOntologyFile(
      '<?xml version="1.0"?><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:owl="http://www.w3.org/2002/07/owl#"></rdf:RDF>',
      "uploaded.rdf",
      "application/rdf+xml"
    );

    await wrapper.vm.onFileChange({ target: { files: [file] } });
    await flushPromises();

    await wrapper.find("#add_to_server_btt").trigger("click");
    await flushPromises();

    expect(mockClient.post).toHaveBeenCalledWith(
      "/onto/processes",
      expect.any(FormData),
      expect.objectContaining({
        headers: { "Content-Type": "multipart/form-data" },
      })
    );
    expect(wrapper.vm.current_ontology).toBe("uploaded.owl");
    expect(wrapper.vm.current_super_class).toBe("ProcessRoot");
    expect(wrapper.vm.current_super_class_iri).toBe("http://example.com/process#ProcessRoot");
    expect(wrapper.text()).toContain("Stored as uploaded.owl");
  });

  it("emits imported ontology groups from the loaded process class graph", async () => {
    const processGraphNodes = {
      "http://example.com/process#ProcessRoot": createOntologyGraphNode({
        iri: "http://example.com/process#ProcessRoot",
        name: "ProcessRoot",
        label: "Process Root",
        childIris: ["http://example.com/process#Mixing"],
      }),
      "http://example.com/process#Mixing": createOntologyGraphNode({
        iri: "http://example.com/process#Mixing",
        name: "Mixing",
        parentIris: ["http://example.com/process#ProcessRoot"],
      }),
    };

    mockClient.get.mockImplementation((url) => {
      if (url === "/onto/processes") {
        return Promise.resolve({ data: ["process.owl"] });
      }
      if (url === "/onto/processes/process.owl/class-tree") {
        return Promise.resolve({
          data: createOntologyClassGraph(
            ["http://example.com/process#ProcessRoot"],
            processGraphNodes
          ),
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    const wrapper = mountDialog("Processes");
    await flushPromises();

    await wrapper.find("#add_elements_button").trigger("click");
    await flushPromises();

    expect(wrapper.emitted("add")).toBeTruthy();
    expect(wrapper.emitted("add")[0][0]).toEqual({
      title: "process",
      items: [
        {
          iri: "http://example.com/process#ProcessRoot",
          name: "Process Root",
          displayName: "Process Root",
          ontologyClassName: "ProcessRoot",
          label: "Process Root",
          childIris: ["http://example.com/process#Mixing"],
          otherInformation: [],
          children: [],
          childrenLoaded: false,
          expanded: false,
        },
      ],
      graphNodes: processGraphNodes,
      itemDefaults: {},
    });
  });

  it("emits material ontology imports with sidebar defaults and graph references", async () => {
    const materialGraphNodes = {
      "http://example.com/material#MaterialRoot": createOntologyGraphNode({
        iri: "http://example.com/material#MaterialRoot",
        name: "MaterialRoot",
        label: "Material Root",
        childIris: ["http://example.com/material#Copper"],
      }),
      "http://example.com/material#Copper": createOntologyGraphNode({
        iri: "http://example.com/material#Copper",
        name: "Copper",
        label: "Copper",
        parentIris: ["http://example.com/material#MaterialRoot"],
      }),
    };

    mockClient.get.mockImplementation((url) => {
      if (url === "/onto/materials") {
        return Promise.resolve({ data: ["materials.owl"] });
      }
      if (url === "/onto/materials/materials.owl/class-tree") {
        return Promise.resolve({
          data: createOntologyClassGraph(
            ["http://example.com/material#MaterialRoot"],
            materialGraphNodes
          ),
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    const wrapper = mountDialog("Materials");
    await flushPromises();

    await wrapper.find("#add_elements_button").trigger("click");
    await flushPromises();

    expect(wrapper.emitted("add")).toBeTruthy();
    expect(wrapper.emitted("add")[0][0]).toEqual({
      title: "materials",
      items: [
        {
          iri: "http://example.com/material#MaterialRoot",
          name: "Material Root",
          displayName: "Material Root",
          ontologyClassName: "MaterialRoot",
          label: "Material Root",
          childIris: ["http://example.com/material#Copper"],
          type: MATERIAL_CONTAINER_TYPE,
          materialElementType: "Input",
          otherInformation: [],
          children: [],
          childrenLoaded: false,
          expanded: false,
        },
      ],
      graphNodes: materialGraphNodes,
      itemDefaults: {
        type: MATERIAL_CONTAINER_TYPE,
        materialElementType: "Input",
      },
    });
  });

  it("keeps the previous ontology selection when reload fails", async () => {
    mockClient.get.mockImplementation((url) => {
      if (url === "/onto/materials") {
        const listCalls = mockClient.get.mock.calls.filter(([path]) => path === "/onto/materials").length;
        if (listCalls === 1) {
          return Promise.resolve({ data: ["materials.owl"] });
        }
        return Promise.reject(new Error("reload failed"));
      }
      if (url === "/onto/materials/materials.owl/class-tree") {
        return Promise.resolve({
          data: createOntologyClassGraph(
            ["http://example.com/material#MaterialRoot"],
            {
              "http://example.com/material#MaterialRoot": createOntologyGraphNode({
                iri: "http://example.com/material#MaterialRoot",
                name: "MaterialRoot",
              }),
            }
          ),
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    const wrapper = mountDialog("Materials");
    await flushPromises();

    expect(wrapper.vm.current_ontology).toBe("materials.owl");
    expect(wrapper.vm.current_super_class).toBe("MaterialRoot");
    expect(wrapper.vm.current_super_class_iri).toBe("http://example.com/material#MaterialRoot");

    await wrapper.vm.readServerOntologies();
    await flushPromises();

    expect(wrapper.vm.current_ontology).toBe("materials.owl");
    expect(wrapper.vm.current_super_class).toBe("MaterialRoot");
    expect(wrapper.vm.current_super_class_iri).toBe("http://example.com/material#MaterialRoot");
    expect(wrapper.text()).toContain("Failed to load ontologies from the server.");
    expect(wrapper.find("#add_elements_button").attributes("disabled")).toBeUndefined();
  });

  it("renders ontology labels and initially selects the first root with children", async () => {
    mockClient.get.mockImplementation((url) => {
      if (url === "/onto/processes") {
        return Promise.resolve({ data: ["OntoProCap.owl"] });
      }
      if (url === "/onto/processes/OntoProCap.owl/class-tree") {
        return Promise.resolve({
          data: createOntologyClassGraph(
            [
              "http://example.com/process#LeafRoot",
              "http://example.com/process#Capability",
              "http://example.com/process#Process",
            ],
            {
              "http://example.com/process#LeafRoot": createOntologyGraphNode({
                iri: "http://example.com/process#LeafRoot",
                name: "LeafRoot",
                label: "Leaf Root",
              }),
              "http://example.com/process#Capability": createOntologyGraphNode({
                iri: "http://example.com/process#Capability",
                name: "Capability",
                label: "Capability Label",
                childIris: ["http://example.com/process#Absorption"],
              }),
              "http://example.com/process#Absorption": createOntologyGraphNode({
                iri: "http://example.com/process#Absorption",
                name: "Absorption",
                label: "Absorption Label",
                parentIris: ["http://example.com/process#Capability"],
              }),
              "http://example.com/process#Process": createOntologyGraphNode({
                iri: "http://example.com/process#Process",
                name: "Process",
                label: "Process Label",
              }),
            }
          ),
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    const wrapper = mountDialog("Processes");
    await flushPromises();

    expect(wrapper.text()).toContain("Leaf Root");
    expect(wrapper.text()).toContain("Capability Label");
    expect(wrapper.text()).toContain("Process Label");
    expect(wrapper.text()).not.toContain("Name of Relation");
    expect(wrapper.find("#relation_input").exists()).toBe(false);
    expect(wrapper.vm.current_super_class).toBe("Capability Label");
    expect(wrapper.vm.current_super_class_iri).toBe("http://example.com/process#Capability");
    expect(wrapper.vm.ontology_class_tree[0].expanded).toBe(false);
    expect(wrapper.vm.ontology_class_tree[1].expanded).toBe(true);
    expect(wrapper.vm.ontology_class_tree[2].expanded).toBe(false);
  });

  it("shows a loading state while ontology classes are loading", async () => {
    const deferredClassTree = createDeferred();

    mockClient.get.mockImplementation((url) => {
      if (url === "/onto/processes") {
        return Promise.resolve({ data: ["slow.owl"] });
      }
      if (url === "/onto/processes/slow.owl/class-tree") {
        return deferredClassTree.promise;
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    const wrapper = mountDialog("Processes");
    await flushPromises();

    expect(wrapper.text()).toContain("Loading ontology classes. Large ontologies can take some time.");
    expect(wrapper.find("#add_elements_button").attributes("disabled")).toBeDefined();

    deferredClassTree.resolve({
      data: createOntologyClassGraph(
        ["http://example.com/process#Capability"],
        {
          "http://example.com/process#Capability": createOntologyGraphNode({
            iri: "http://example.com/process#Capability",
            name: "Capability",
          }),
        }
      ),
    });
    await flushPromises();

    expect(wrapper.text()).not.toContain("Loading ontology classes. Large ontologies can take some time.");
    expect(wrapper.vm.current_super_class_iri).toBe("http://example.com/process#Capability");
  });

  it("deletes the selected ontology via the server API", async () => {
    mockClient.get.mockImplementation((url) => {
      if (url === "/onto/processes") {
        const callCount = mockClient.get.mock.calls.filter(([path]) => path === "/onto/processes").length;
        return Promise.resolve({ data: callCount === 1 ? ["process.owl"] : [] });
      }
      if (url === "/onto/processes/process.owl/class-tree") {
        return Promise.resolve({
          data: createOntologyClassGraph(
            ["http://example.com/process#ProcessRoot"],
            {
              "http://example.com/process#ProcessRoot": createOntologyGraphNode({
                iri: "http://example.com/process#ProcessRoot",
                name: "ProcessRoot",
              }),
            }
          ),
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    mockClient.delete.mockResolvedValueOnce({
      data: {
        message: "Ontology deleted successfully.",
        filename: "process.owl",
        category: "processes",
      },
    });

    const wrapper = mountDialog("Processes");
    await flushPromises();

    await wrapper.find("button.dialog-delete-btn").trigger("click");
    await flushPromises();

    expect(mockClient.delete).toHaveBeenCalledWith("/onto/processes/process.owl");
    expect(wrapper.vm.current_ontology).toBe("new");
    expect(wrapper.text()).toContain("Ontology deleted successfully.");
  });
});
