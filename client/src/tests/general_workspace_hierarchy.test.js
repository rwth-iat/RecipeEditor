import { describe, expect, test } from "vitest";
import { buildGeneralWorkspaceHierarchy } from "@/services/workspace/mapping/generalWorkspaceHierarchy";

describe("buildGeneralWorkspaceHierarchy", () => {
  test("nests imported child materials, chart elements, processes, and links under their parent process", () => {
    const result = buildGeneralWorkspaceHierarchy(
      [
        {
          id: "Stage001",
          type: "process",
          parentId: null,
          processElementType: "Process Stage",
          description: "Stage",
        },
        {
          id: "StageInput001",
          type: "material_container",
          parentId: "Stage001",
          materialType: "Input",
          description: "Input",
          materials: [{ id: "MAT_001", description: "Water" }],
        },
        {
          id: "PrevIndicator001",
          type: "chart_element",
          parentId: "Stage001",
          procedureChartElementType: "Previous Operation Indicator",
          description: "Prev",
        },
        {
          id: "Operation001",
          type: "process",
          parentId: "Stage001",
          processElementType: "Process Operation",
          description: "Operation",
        },
      ],
      [
        { sourceId: "StageInput001", targetId: "Operation001" },
        { sourceId: "PrevIndicator001", targetId: "Operation001" },
      ]
    );

    expect(result.connections).toEqual([]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "Stage001",
      type: "process",
      processElementType: "Process Stage",
    });
    expect(result.items[0].materials).toMatchObject([
      {
        id: "StageInput001",
        type: "material_container",
        materialType: "Input",
      },
    ]);
    expect(result.items[0].procedureChartElement).toMatchObject([
      {
        id: "PrevIndicator001",
        type: "chart_element",
        procedureChartElementType: "Previous Operation Indicator",
      },
    ]);
    expect(result.items[0].processElement).toMatchObject([
      {
        id: "Operation001",
        type: "process",
        processElementType: "Process Operation",
      },
    ]);
    expect(result.items[0].directedLink).toEqual([
      { sourceId: "StageInput001", targetId: "Operation001" },
      { sourceId: "PrevIndicator001", targetId: "Operation001" },
    ]);
  });

  test("retains parallel branch counts and port-aware links when nesting chart elements", () => {
    const result = buildGeneralWorkspaceHierarchy(
      [
        {
          id: "StageSplit001",
          type: "process",
          parentId: null,
          processElementType: "Process Stage",
          description: "Parallel stage",
        },
        {
          id: "ParallelSplit001",
          type: "chart_element",
          parentId: "StageSplit001",
          procedureChartElementType: "Start Parallel Indicator",
          parallelBranchCount: 3,
          description: "",
        },
        {
          id: "BranchLeft001",
          type: "process",
          parentId: "StageSplit001",
          processElementType: "Process Operation",
          description: "Left branch",
        },
      ],
      [
        {
          sourceId: "ParallelSplit001",
          sourcePortId: "out-branch-1",
          targetId: "BranchLeft001",
        },
      ]
    );

    expect(result.items[0].procedureChartElement).toMatchObject([
      {
        id: "ParallelSplit001",
        type: "chart_element",
        procedureChartElementType: "Start Parallel Indicator",
        parallelBranchCount: 3,
      },
    ]);
    expect(result.items[0].directedLink).toEqual([
      {
        sourceId: "ParallelSplit001",
        sourcePortId: "out-branch-1",
        targetId: "BranchLeft001",
      },
    ]);
  });
});
