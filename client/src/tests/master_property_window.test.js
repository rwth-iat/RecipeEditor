import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import MasterPropertyWindow from "@/features/master-recipe/ui/property-window/MasterPropertyWindow.vue";

describe("MasterPropertyWindow", () => {
  test("renders imported master procedure metadata from fallback fields", () => {
    const selectedElement = {
      id: "Proc001",
      name: "Imported Procedure",
      description: ["Imported Procedure"],
      type: "procedure",
      processElementType: "MTP Operation",
      procId: "proc-1",
      serviceId: "svc-1",
      selfCompleting: false,
      params: [
        {
          id: "param-1",
          name: "Stir Time",
          default: "10",
          min: "0",
          max: "20",
          unit: "s",
          dataType: "xs:integer",
        },
      ],
    };

    const wrapper = mount(MasterPropertyWindow, {
      props: {
        selectedElement,
        mode: "master",
        workspaceItems: [selectedElement],
        connections: [],
      },
    });

    expect(wrapper.find(".equipment-source input").element.value).toBe(
      "Imported procedure metadata"
    );
    expect(wrapper.html()).toContain("Recipe Parameters (B2MML Formula)");
    expect(wrapper.find(".parameter-item input.locked-input").element.value).toBe(
      "Stir Time (ID: param-1)"
    );

    const lockedInputs = wrapper
      .findAll(".equipment-details input.locked-input")
      .map((input) => input.element.value);
    expect(lockedInputs).toContain("svc-1");
    expect(lockedInputs).toContain("proc-1");
    expect(lockedInputs).toContain("No");

    expect(wrapper.find(".parameter-type-info input.locked-input").element.value).toBe(
      "xs:integer"
    );
  });

  test("uses completed step conditions and defaults imported procedures to recipe procedure", async () => {
    const procedureElement = {
      id: "Proc001",
      name: "Mixing Step",
      description: ["001:Mixing Step"],
      type: "procedure",
      processElementType: "MTP Operation",
      equipmentInfo: {
        source_type: "BatchML",
        equipment_data: {
          recipe_parameters: [],
        },
      },
    };
    const conditionElement = {
      id: "Condition001",
      name: "Condition001",
      description: ["Condition after mixing"],
      type: "recipe_element",
      recipeElementType: "Condition",
      conditionGroup: {
        type: "group",
        operator: "AND",
        children: [
          {
            type: "condition",
            keyword: "Step",
            instance: "Proc001",
            operator: "is",
            value: "Completed",
          },
        ],
      },
    };

    const wrapper = mount(MasterPropertyWindow, {
      props: {
        selectedElement: conditionElement,
        mode: "master",
        workspaceItems: [procedureElement, conditionElement],
        connections: [],
      },
    });

    expect(wrapper.text()).toContain('Step "001:Mixing Step" is Completed');
    expect(wrapper.text()).not.toContain("Step == 0");

    await wrapper.find(".open-condition-modal-btn").trigger("click");

    const stepSelect = wrapper
      .findAll("select")
      .find((select) =>
        select
          .findAll("option")
          .some((option) => option.element.value === procedureElement.id)
      );

    expect(stepSelect).toBeTruthy();
    expect(
      stepSelect.findAll("option").map((option) => option.element.value)
    ).toContain(procedureElement.id);
    expect(
      stepSelect.findAll("option").map((option) => option.element.value)
    ).not.toContain(conditionElement.id);

    const procedureWrapper = mount(MasterPropertyWindow, {
      props: {
        selectedElement: procedureElement,
        mode: "master",
        workspaceItems: [procedureElement, conditionElement],
        connections: [],
      },
    });

    expect(procedureElement.processElementType).toBe(
      "Recipe Procedure Containing Lower Level PFC"
    );
    expect(
      procedureWrapper.find("#processElementType").element.value
    ).toBe("Recipe Procedure Containing Lower Level PFC");
  });
});
