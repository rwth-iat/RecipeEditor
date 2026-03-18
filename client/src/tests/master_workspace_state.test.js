import { describe, expect, test } from "vitest";
import { buildWorkspaceState, WorkspaceMode } from "@/services/workspace";

describe("Master workspace state", () => {
  test("keeps imported procedure metadata when serializing master workspace items", () => {
    const equipmentInfo = {
      source_type: "MTP",
      source_file: "plant.aml",
      equipment_data: {
        service_info: {
          name: "Service A",
          id: "svc-1",
        },
        procedure_info: {
          name: "Proc A",
          id: "proc-1",
          self_completing: true,
        },
        recipe_parameters: [
          {
            id: "param-1",
            name: "Speed",
          },
        ],
      },
    };

    const state = buildWorkspaceState({
      items: [
        {
          id: "Proc001",
          type: "procedure",
          name: "Proc A",
          x: 120,
          y: 240,
          description: "Imported procedure",
          processElementType: "MTP Operation",
          procId: "proc-1",
          serviceId: "svc-1",
          selfCompleting: true,
          params: [
            {
              id: "param-1",
              name: "Speed",
            },
          ],
          equipmentInfo,
          ignoredField: "ignore-me",
        },
      ],
      connections: [],
      mode: WorkspaceMode.MASTER,
    });

    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual(
      expect.objectContaining({
        id: "Proc001",
        type: "procedure",
        name: "Proc A",
        description: "Imported procedure",
        processElementType: "MTP Operation",
        procId: "proc-1",
        serviceId: "svc-1",
        selfCompleting: true,
        params: [
          {
            id: "param-1",
            name: "Speed",
          },
        ],
        equipmentInfo,
      })
    );
    expect(state.items[0].ignoredField).toBeUndefined();
  });
});
