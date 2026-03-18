import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import ProcessPropertySection from "@/features/general-recipe/ui/property-window/ProcessPropertySection.vue";

function createValueType() {
  return {
    valueString: "",
    dataType: "",
    unitOfMeasure: "",
    key: "",
  };
}

describe("ProcessPropertySection", () => {
  test("renders full string descriptions for imported process metadata", () => {
    const selectedElement = {
      type: "process",
      processElementType: "Process",
      processElementParameter: [
        {
          id: "rpm001",
          description: "Revolutions per minute",
          value: [createValueType()],
        },
      ],
      resourceConstraint: [
        {
          constraintID: "constraint001",
          description: "Duration of the process step mixing",
          constraintType: "Required",
          lifeCycleState: "Draft",
          range: [createValueType()],
          resourceConstraintProperty: "",
        },
      ],
      otherInformation: [
        {
          otherInfoID: "info001",
          description: "URI referencing the Ontology Class definition",
          otherValue: [createValueType()],
        },
      ],
    };

    const wrapper = mount(ProcessPropertySection, {
      props: { selectedElement },
      global: {
        stubs: {
          ValueTypeProperty: {
            template: "<div class='value-type-property-stub' />",
          },
        },
      },
    });

    expect(wrapper.get("#parameter_0_description").element.value).toBe(
      "Revolutions per minute"
    );
    expect(wrapper.get("#resourceConstraint_0_description").element.value).toBe(
      "Duration of the process step mixing"
    );
    expect(wrapper.get("#otherInformation_0_description").element.value).toBe(
      "URI referencing the Ontology Class definition"
    );
  });

  test("creates new process metadata entries with string descriptions", async () => {
    const selectedElement = {
      type: "process",
      processElementType: "Process",
      processElementParameter: [],
      resourceConstraint: [],
      otherInformation: [],
    };

    const wrapper = mount(ProcessPropertySection, {
      props: { selectedElement },
      global: {
        stubs: {
          ValueTypeProperty: {
            template: "<div class='value-type-property-stub' />",
          },
        },
      },
    });

    await wrapper.get('[aria-label="Add process element parameter"]').trigger("click");
    await wrapper.get('[aria-label="Add resource constraint"]').trigger("click");
    await wrapper.get('[aria-label="Add other information"]').trigger("click");

    expect(selectedElement.processElementParameter[0].description).toBe("");
    expect(typeof selectedElement.processElementParameter[0].description).toBe("string");
    expect(selectedElement.resourceConstraint[0].description).toBe("");
    expect(typeof selectedElement.resourceConstraint[0].description).toBe("string");
    expect(selectedElement.otherInformation[0].description).toBe("");
    expect(typeof selectedElement.otherInformation[0].description).toBe("string");
  });
});
