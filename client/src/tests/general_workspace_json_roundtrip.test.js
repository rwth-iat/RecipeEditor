import { expect, test } from "vitest";
import {
  exportWorkspaceJson,
  importWorkspaceFile,
  WorkspaceMode,
} from "@/services/workspace";

test("preserves parallel branch counts and port-aware connections in workspace json", () => {
  const items = [
    {
      id: "StageSplit001",
      type: "process",
      description: "Parallel stage",
      processElementType: "Process Stage",
      processElementParameter: [],
      resourceConstraint: [],
      otherInformation: [],
      materials: [],
      directedLink: [],
      procedureChartElement: [
        {
          id: "ParallelSplit001",
          type: "chart_element",
          parentId: "StageSplit001",
          procedureChartElementType: "Start Parallel Indicator",
          parallelBranchCount: 4,
          description: "",
          x: 0,
          y: 0,
        },
      ],
      processElement: [
        {
          id: "BranchLeft001",
          type: "process",
          parentId: "StageSplit001",
          description: "Left branch",
          processElementType: "Process Operation",
          processElementParameter: [],
          resourceConstraint: [],
          otherInformation: [],
          x: 0,
          y: 0,
        },
      ],
      x: 0,
      y: 0,
    },
  ];

  const connections = [
    {
      sourceId: "ParallelSplit001",
      sourcePortId: "out-branch-1",
      targetId: "BranchLeft001",
    },
    {
      sourceId: "ParallelSplit001",
      sourcePortId: "out-branch-2",
      targetId: "BranchLeft001",
    },
  ];

  const exported = exportWorkspaceJson({
    items,
    connections,
    mode: WorkspaceMode.GENERAL,
  });

  const imported = importWorkspaceFile({
    filename: exported.filename,
    content: exported.content,
    mode: WorkspaceMode.GENERAL,
  });

  expect(
    imported.items[0].procedureChartElement[0]
  ).toMatchObject({
    id: "ParallelSplit001",
    procedureChartElementType: "Start Parallel Indicator",
    parallelBranchCount: 4,
  });
  expect(imported.connections).toEqual([
    {
      sourceId: "ParallelSplit001",
      sourcePortId: "out-branch-1",
      targetId: "BranchLeft001",
    },
    {
      sourceId: "ParallelSplit001",
      sourcePortId: "out-branch-2",
      targetId: "BranchLeft001",
    },
  ]);
});
