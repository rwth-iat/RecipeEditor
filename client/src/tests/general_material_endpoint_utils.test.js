import { expect, test } from "vitest";
import {
  getDesiredMaterialEndpointCounts,
  reconcileMaterialEndpoints,
} from "@/services/workspace/core/generalMaterialEndpointUtils";

function createContainer(targetType, sourceEndpoints, targetEndpoints) {
  return {
    type: "material_container",
    materialType: targetType,
    sourceEndpoints: [...sourceEndpoints],
    targetEndpoints: [...targetEndpoints],
  };
}

test("returns the expected endpoint counts for each material type", () => {
  expect(getDesiredMaterialEndpointCounts("Input")).toEqual({ source: 1, target: 0 });
  expect(getDesiredMaterialEndpointCounts("Intermediate")).toEqual({ source: 1, target: 1 });
  expect(getDesiredMaterialEndpointCounts("Output")).toEqual({ source: 0, target: 1 });
  expect(getDesiredMaterialEndpointCounts(undefined)).toEqual({ source: 0, target: 0 });
});

test.each([
  {
    label: "Intermediate -> Input",
    targetType: "Input",
    sourceEndpoints: [{ id: "s1" }],
    targetEndpoints: [{ id: "t1" }],
    expectedSource: 1,
    expectedTarget: 0,
    deleted: ["t1"],
  },
  {
    label: "Intermediate -> Output",
    targetType: "Output",
    sourceEndpoints: [{ id: "s1" }],
    targetEndpoints: [{ id: "t1" }],
    expectedSource: 0,
    expectedTarget: 1,
    deleted: ["s1"],
  },
  {
    label: "Input -> Intermediate",
    targetType: "Intermediate",
    sourceEndpoints: [{ id: "s1" }],
    targetEndpoints: [],
    expectedSource: 1,
    expectedTarget: 1,
    deleted: [],
  },
  {
    label: "Output -> Intermediate",
    targetType: "Intermediate",
    sourceEndpoints: [],
    targetEndpoints: [{ id: "t1" }],
    expectedSource: 1,
    expectedTarget: 1,
    deleted: [],
  },
])("reconciles endpoints for $label", ({
  targetType,
  sourceEndpoints,
  targetEndpoints,
  expectedSource,
  expectedTarget,
  deleted,
}) => {
  const deletedEndpointIds = [];
  let createdSourceCount = 0;
  let createdTargetCount = 0;
  const item = createContainer(targetType, sourceEndpoints, targetEndpoints);

  const result = reconcileMaterialEndpoints({
    item,
    createSourceEndpoint: () => ({ id: `created-source-${++createdSourceCount}` }),
    createTargetEndpoint: () => ({ id: `created-target-${++createdTargetCount}` }),
    deleteEndpoint: (endpoint) => deletedEndpointIds.push(endpoint.id),
  });

  expect(item.sourceEndpoints).toHaveLength(expectedSource);
  expect(item.targetEndpoints).toHaveLength(expectedTarget);
  expect(deletedEndpointIds).toEqual(deleted);
  expect(result.desired).toEqual({
    source: expectedSource,
    target: expectedTarget,
  });
  expect(result.changed).toBe(true);
});

test("removes all endpoints for material containers without a valid type", () => {
  const deletedEndpointIds = [];
  const item = createContainer(undefined, [{ id: "s1" }], [{ id: "t1" }]);

  reconcileMaterialEndpoints({
    item,
    createSourceEndpoint: () => ({ id: "unused-source" }),
    createTargetEndpoint: () => ({ id: "unused-target" }),
    deleteEndpoint: (endpoint) => deletedEndpointIds.push(endpoint.id),
  });

  expect(item.sourceEndpoints).toEqual([]);
  expect(item.targetEndpoints).toEqual([]);
  expect(deletedEndpointIds).toEqual(["s1", "t1"]);
});
