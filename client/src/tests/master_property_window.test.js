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
});
