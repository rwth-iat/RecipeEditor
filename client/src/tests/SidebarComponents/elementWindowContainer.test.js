import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it } from "vitest";
import ElementWindowContainer from "@/shell/ui/sidebar/ElementWindowContainer.vue";
import { MATERIAL_CONTAINER_TYPE } from "@/services/recipe/general-recipe/materials/materialContainerUtils";

describe("ElementWindowContainer", () => {
  it("renders imported ontology groups and expands graph-backed sidebar nodes", async () => {
    const graphNodes = {
      "http://example.com/material#ChemicalEntity": {
        iri: "http://example.com/material#ChemicalEntity",
        name: "CHEBI_24431",
        label: "chemical entity",
        childIris: ["http://example.com/material#Water"],
        parentIris: [],
        otherInformation: [],
      },
      "http://example.com/material#Water": {
        iri: "http://example.com/material#Water",
        name: "CHEBI_15377",
        label: "water",
        childIris: [],
        parentIris: ["http://example.com/material#ChemicalEntity"],
        otherInformation: [],
      },
    };

    const wrapper = mount(ElementWindowContainer, {
      props: {
        elementType: "Materials",
        displayTitle: "Materials",
        elementClass: "material_element sidebar_element",
        allowAddDialog: false,
        initialPackages: [],
      },
    });

    wrapper.vm.addElements({
      title: "chebilite",
      items: [
        {
          iri: "http://example.com/material#ChemicalEntity",
          name: "chemical entity",
          displayName: "chemical entity",
          ontologyClassName: "CHEBI_24431",
          label: "chemical entity",
          childIris: ["http://example.com/material#Water"],
          type: MATERIAL_CONTAINER_TYPE,
          materialElementType: "Input",
          otherInformation: [],
          children: [],
          childrenLoaded: false,
          expanded: false,
        },
      ],
      graphNodes,
      itemDefaults: {
        type: MATERIAL_CONTAINER_TYPE,
        materialElementType: "Input",
      },
    });
    await nextTick();

    expect(wrapper.text()).toContain("chebilite");
    expect(wrapper.text()).toContain("chemical entity");
    expect(wrapper.text()).not.toContain("water");

    await wrapper.find(".imported-elements-window li").trigger("click");
    await nextTick();

    expect(wrapper.text()).toContain("water");
  });
});
