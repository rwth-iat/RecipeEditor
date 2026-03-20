import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import GeneralPropertyWindow from "@/features/general-recipe/ui/property-window/GeneralPropertyWindow.vue";

const stubs = {
  MaterialPropertySection: true,
  ProcessPropertySection: true,
  ChartElementPropertySection: true,
};

describe("GeneralPropertyWindow", () => {
  test("shows Open in Workspace for process stages", () => {
    const wrapper = mount(GeneralPropertyWindow, {
      props: {
        selectedElement: {
          type: "process",
          id: "Stage001",
          description: "Stage",
          processElementType: "Process Stage",
        },
      },
      global: {
        stubs,
      },
    });

    expect(wrapper.text()).toContain("Open in Workspace");
  });

  test("hides Open in Workspace for process actions", () => {
    const wrapper = mount(GeneralPropertyWindow, {
      props: {
        selectedElement: {
          type: "process",
          id: "Action001",
          description: "Action",
          processElementType: "Process Action",
        },
      },
      global: {
        stubs,
      },
    });

    expect(wrapper.text()).not.toContain("Open in Workspace");
  });
});
