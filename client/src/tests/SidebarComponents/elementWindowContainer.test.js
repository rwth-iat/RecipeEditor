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

  it("switches imported ontology trees between ontology order and alphabetical order", async () => {
    const graphNodes = {
      "http://example.com/material#MaterialRoot": {
        iri: "http://example.com/material#MaterialRoot",
        name: "CHEBI_24431",
        label: "Material Root",
        childIris: [
          "http://example.com/material#ZuluChild",
          "http://example.com/material#AlphaChild",
        ],
        parentIris: [],
        otherInformation: [],
      },
      "http://example.com/material#ZuluChild": {
        iri: "http://example.com/material#ZuluChild",
        name: "CHEBI_Z",
        label: "Zulu Child",
        childIris: [],
        parentIris: ["http://example.com/material#MaterialRoot"],
        otherInformation: [],
      },
      "http://example.com/material#AlphaChild": {
        iri: "http://example.com/material#AlphaChild",
        name: "CHEBI_A",
        label: "Alpha Child",
        childIris: [],
        parentIris: ["http://example.com/material#MaterialRoot"],
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
          iri: "http://example.com/material#MaterialRoot",
          name: "Material Root",
          displayName: "Material Root",
          ontologyClassName: "CHEBI_24431",
          label: "Material Root",
          childIris: [
            "http://example.com/material#ZuluChild",
            "http://example.com/material#AlphaChild",
          ],
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

    await wrapper.find(".imported-elements-window li").trigger("click");
    await nextTick();

    const getRenderedNames = () => wrapper
      .findAll(".imported-elements-window li > div > span:last-child")
      .map((node) => node.text());

    expect(getRenderedNames()).toEqual(["Material Root", "Zulu Child", "Alpha Child"]);

    expect(wrapper.text()).toContain("Class order:");

    await wrapper.find('.imported-class-sort-controls input[type="checkbox"]').setValue(true);
    await nextTick();

    expect(getRenderedNames()).toEqual(["Material Root", "Alpha Child", "Zulu Child"]);

    await wrapper.find('.imported-class-sort-controls input[type="checkbox"]').setValue(false);
    await nextTick();

    expect(getRenderedNames()).toEqual(["Material Root", "Zulu Child", "Alpha Child"]);
  });
});
