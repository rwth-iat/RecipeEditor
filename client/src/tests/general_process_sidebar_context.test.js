import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import GeneralElementWindow from "@/features/general-recipe/ui/sidebar/GeneralElementWindow.vue";
import GeneralSideBar from "@/features/general-recipe/ui/sidebar/GeneralSideBar.vue";
import {
  DEFAULT_ALLOWED_PROCESS_ELEMENT_TYPES,
  getProcessSidebarPackages,
  resolveAllowedProcessElementTypes,
} from "@/features/general-recipe/ui/sidebar/processSidebarOptions";

const ElementWindowContainerStub = defineComponent({
  name: "ElementWindowContainer",
  props: {
    initialPackages: {
      type: Array,
      default: () => [],
    },
  },
  template: `
    <div>
      <div
        v-for="item in initialPackages"
        :key="item.processElementType || item.name"
        class="process-package"
      >
        {{ item.processElementType || item.name }}
      </div>
    </div>
  `,
});

const GeneralElementWindowStub = defineComponent({
  name: "GeneralElementWindow",
  props: {
    element_type: {
      type: String,
      default: "",
    },
    allowedProcessElementTypes: {
      type: Array,
      default: () => [],
    },
  },
  template: `
    <div
      class="sidebar-window"
      :data-element-type="element_type"
      :data-allowed-types="allowedProcessElementTypes.join('|')"
    />
  `,
});

describe("process sidebar context", () => {
  test("uses stage, operation, and action as the default visible process types", () => {
    expect(DEFAULT_ALLOWED_PROCESS_ELEMENT_TYPES).toEqual([
      "Process Stage",
      "Process Operation",
      "Process Action",
    ]);
    expect(getProcessSidebarPackages().map((item) => item.processElementType)).toEqual([
      "Process Stage",
      "Process Operation",
      "Process Action",
    ]);
  });

  test("allows Process only when explicitly included", () => {
    expect(
      getProcessSidebarPackages(["Process", "Process Action"]).map(
        (item) => item.processElementType
      )
    ).toEqual(["Process", "Process Action"]);
  });

  test("resolves secondary sidebar types from the parent process type", () => {
    expect(
      resolveAllowedProcessElementTypes({
        visible: true,
        parentProcessElementType: "Process Stage",
      })
    ).toEqual(["Process Operation", "Process Action"]);

    expect(
      resolveAllowedProcessElementTypes({
        visible: true,
        parentProcessElementType: "Process Operation",
      })
    ).toEqual(["Process Action"]);

    expect(
      resolveAllowedProcessElementTypes({
        visible: true,
        parentProcessElementType: "Process Action",
      })
    ).toEqual([]);

    expect(
      resolveAllowedProcessElementTypes({
        visible: true,
        parentProcessElementType: "Other",
      })
    ).toEqual(DEFAULT_ALLOWED_PROCESS_ELEMENT_TYPES);
  });

  test("filters the rendered process palette in GeneralElementWindow", () => {
    const wrapper = mount(GeneralElementWindow, {
      props: {
        element_type: "Processes",
        allowedProcessElementTypes: ["Process Operation", "Process Action"],
      },
      global: {
        stubs: {
          ElementWindowContainer: ElementWindowContainerStub,
          GeneralAddDialog: true,
        },
      },
    });

    expect(wrapper.findAll(".process-package").map((node) => node.text())).toEqual([
      "Process Operation",
      "Process Action",
    ]);
  });

  test("passes the configured allowed process types through GeneralSideBar", () => {
    const wrapper = mount(GeneralSideBar, {
      props: {
        allowedProcessElementTypes: ["Process Action"],
      },
      global: {
        stubs: {
          SideBarContainer: {
            template: "<div><slot /></div>",
          },
          GeneralElementWindow: GeneralElementWindowStub,
        },
      },
    });

    const processWindow = wrapper
      .findAll(".sidebar-window")
      .find((node) => node.attributes("data-element-type") === "Processes");

    expect(processWindow?.attributes("data-allowed-types")).toBe("Process Action");
  });
});
