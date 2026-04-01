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
          data: [{ name: "ProcessRoot", children: [] }],
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
    expect(wrapper.text()).toContain("Stored as uploaded.owl");
  });

  it("emits subclasses loaded from the categorized endpoint", async () => {
    const subclassesPayload = [
      {
        name: "ProcessRoot",
        children: [{ name: "Mixing", children: [] }],
      },
    ];

    mockClient.get.mockImplementation((url) => {
      if (url === "/onto/processes") {
        return Promise.resolve({ data: ["process.owl"] });
      }
      if (url === "/onto/processes/process.owl/class-tree") {
        return Promise.resolve({
          data: [{ name: "ProcessRoot", children: [] }],
        });
      }
      if (url === "/onto/processes/process.owl/ProcessRoot/subclasses") {
        return Promise.resolve({ data: subclassesPayload });
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
      items: subclassesPayload,
    });
  });

  it("normalizes imported material ontology items for workspace drag and drop", async () => {
    const subclassesPayload = [
      {
        name: "MaterialRoot",
        children: [{ name: "Copper", children: [] }],
      },
    ];

    mockClient.get.mockImplementation((url) => {
      if (url === "/onto/materials") {
        return Promise.resolve({ data: ["materials.owl"] });
      }
      if (url === "/onto/materials/materials.owl/class-tree") {
        return Promise.resolve({
          data: [{ name: "MaterialRoot", children: [] }],
        });
      }
      if (url === "/onto/materials/materials.owl/MaterialRoot/subclasses") {
        return Promise.resolve({ data: subclassesPayload });
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
          name: "MaterialRoot",
          type: MATERIAL_CONTAINER_TYPE,
          materialElementType: "Input",
          children: [
            {
              name: "Copper",
              type: MATERIAL_CONTAINER_TYPE,
              materialElementType: "Input",
              children: [],
            },
          ],
        },
      ],
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
          data: [{ name: "MaterialRoot", children: [] }],
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    const wrapper = mountDialog("Materials");
    await flushPromises();

    expect(wrapper.vm.current_ontology).toBe("materials.owl");
    expect(wrapper.vm.current_super_class).toBe("MaterialRoot");

    await wrapper.vm.readServerOntologies();
    await flushPromises();

    expect(wrapper.vm.current_ontology).toBe("materials.owl");
    expect(wrapper.vm.current_super_class).toBe("MaterialRoot");
    expect(wrapper.text()).toContain("Failed to load ontologies from the server.");
    expect(wrapper.find("#add_elements_button").attributes("disabled")).toBeUndefined();
  });

  it("renders the superclass selection as a tree and removes the relation field", async () => {
    mockClient.get.mockImplementation((url) => {
      if (url === "/onto/processes") {
        return Promise.resolve({ data: ["OntoProCap.owl"] });
      }
      if (url === "/onto/processes/OntoProCap.owl/class-tree") {
        return Promise.resolve({
          data: [
            {
              name: "Capability",
              children: [{ name: "Absorption", children: [] }],
            },
            {
              name: "Process",
              children: [],
            },
          ],
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    const wrapper = mountDialog("Processes");
    await flushPromises();

    expect(wrapper.text()).toContain("Capability");
    expect(wrapper.text()).toContain("Process");
    expect(wrapper.text()).not.toContain("Name of Relation");
    expect(wrapper.find("#relation_input").exists()).toBe(false);
    expect(wrapper.vm.current_super_class).toBe("Capability");
  });

  it("deletes the selected ontology via the server API", async () => {
    mockClient.get.mockImplementation((url) => {
      if (url === "/onto/processes") {
        const callCount = mockClient.get.mock.calls.filter(([path]) => path === "/onto/processes").length;
        return Promise.resolve({ data: callCount === 1 ? ["process.owl"] : [] });
      }
      if (url === "/onto/processes/process.owl/class-tree") {
        return Promise.resolve({
          data: [{ name: "ProcessRoot", children: [] }],
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
