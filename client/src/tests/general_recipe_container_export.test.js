import { expect, test } from "vitest";
import { buildGeneralRecipeXml, buildMaterialInformationXml } from "@/services/recipe";
import { MaterialBuildStatus } from "@/services/recipe/common/types/exportTypes";

function createContainer(id, materialType, material) {
  return {
    id,
    type: "material_container",
    description: id,
    materialType,
    x: 0,
    y: 0,
    materials: [material],
  };
}

test("exports visible material containers as repeated Materials and aggregates Formula by type", () => {
  const workspaceItems = [
    createContainer("STEP_INPUT_001", "Input", {
      id: "MAT_IN_001",
      description: "Water",
      materialID: "WATER_001",
      order: "1",
      amount: { valueString: "10", unitOfMeasure: "kg" },
      materialSpecificationProperty: [],
    }),
    createContainer("STEP_INPUT_002", "Input", {
      id: "MAT_IN_002",
      description: "Salt",
      materialID: "SALT_001",
      order: "2",
      amount: { valueString: "2", unitOfMeasure: "kg" },
      materialSpecificationProperty: [],
    }),
    {
      id: "HEATING_001",
      type: "process",
      description: "Heat",
      processElementType: "Process Operation",
      processElementParameter: [],
      resourceConstraint: [],
      otherInformation: [],
      x: 0,
      y: 0,
    },
    createContainer("STEP_OUTPUT_001", "Output", {
      id: "MAT_OUT_001",
      description: "Brine",
      materialID: "BRINE_001",
      order: "",
      amount: { valueString: "12", unitOfMeasure: "kg" },
      materialSpecificationProperty: [],
    }),
    createContainer("STEP_OUTPUT_002", "Output", {
      id: "MAT_OUT_002",
      description: "Steam",
      materialID: "STEAM_001",
      order: "",
      amount: { valueString: "1", unitOfMeasure: "kg" },
      materialSpecificationProperty: [],
    }),
  ];

  const connections = [
    { sourceId: "STEP_INPUT_001", targetId: "HEATING_001" },
    { sourceId: "STEP_INPUT_002", targetId: "HEATING_001" },
    { sourceId: "HEATING_001", targetId: "STEP_OUTPUT_001" },
    { sourceId: "HEATING_001", targetId: "STEP_OUTPUT_002" },
  ];

  const result = buildGeneralRecipeXml({ workspaceItems, connections });
  const recipe = result.document["b2mml:GRecipe"];
  const formula = recipe["b2mml:Formula"];
  const processProcedure = recipe["b2mml:ProcessProcedure"];

  expect(formula["b2mml:ProcessInputs"]["b2mml:Material"]).toHaveLength(2);
  expect(formula["b2mml:ProcessOutputs"]["b2mml:Material"]).toHaveLength(2);
  expect(formula["b2mml:ProcessIntermediates"]["b2mml:Material"]).toBeUndefined();

  expect(processProcedure["b2mml:Materials"].map((entry) => entry["b2mml:ID"]))
    .toEqual(["STEP_INPUT_001", "STEP_INPUT_002", "STEP_OUTPUT_001", "STEP_OUTPUT_002"]);
  expect(processProcedure["b2mml:DirectedLink"].map((entry) => ({
    from: entry["b2mml:FromID"],
    to: entry["b2mml:ToID"],
  }))).toEqual([
    { from: "STEP_INPUT_001", to: "HEATING_001" },
    { from: "STEP_INPUT_002", to: "HEATING_001" },
    { from: "HEATING_001", to: "STEP_OUTPUT_001" },
    { from: "HEATING_001", to: "STEP_OUTPUT_002" },
  ]);
});

test("builds MaterialInformation.xml from child materials inside visible material containers", () => {
  const workspaceItems = [
    createContainer("STEP_INPUT_001", "Input", {
      id: "MAT_IN_001",
      description: "Water",
      materialID: "WATER_001",
      order: "1",
      amount: { valueString: "10", unitOfMeasure: "kg" },
      materialSpecificationProperty: [
        {
          materialDefinitionPropertyID: "BoilingPoint",
          description: "Boiling point",
          value: [{ valueString: "100", unitOfMeasure: "C" }],
        },
      ],
    }),
  ];

  const result = buildMaterialInformationXml({ workspaceItems });

  expect(result.status).toBe(MaterialBuildStatus.READY);
  expect(result.issues).toEqual([]);
  expect(result.xml).toContain("<b2mml:MaterialInformation");
  expect(result.xml).toContain("<b2mml:ID>WATER_001</b2mml:ID>");
  expect(result.xml).toContain("<b2mml:ID>BoilingPoint</b2mml:ID>");
});

test("exports parallel indicator links without leaking workspace-only port metadata", () => {
  const workspaceItems = [
    {
      id: "StageSplit001",
      type: "process",
      description: "Parallel stage",
      processElementType: "Process Stage",
      processElementParameter: [],
      resourceConstraint: [],
      otherInformation: [],
      x: 0,
      y: 0,
    },
    {
      id: "BeforeSplit001",
      type: "process",
      parentId: "StageSplit001",
      description: "Before split",
      processElementType: "Process Operation",
      processElementParameter: [],
      resourceConstraint: [],
      otherInformation: [],
      x: 0,
      y: 0,
    },
    {
      id: "ParallelSplit001",
      type: "chart_element",
      parentId: "StageSplit001",
      description: "",
      procedureChartElementType: "Start Parallel Indicator",
      parallelBranchCount: 3,
      x: 0,
      y: 0,
    },
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
    {
      id: "BranchMiddle001",
      type: "process",
      parentId: "StageSplit001",
      description: "Middle branch",
      processElementType: "Process Operation",
      processElementParameter: [],
      resourceConstraint: [],
      otherInformation: [],
      x: 0,
      y: 0,
    },
    {
      id: "BranchRight001",
      type: "process",
      parentId: "StageSplit001",
      description: "Right branch",
      processElementType: "Process Operation",
      processElementParameter: [],
      resourceConstraint: [],
      otherInformation: [],
      x: 0,
      y: 0,
    },
  ];

  const connections = [
    {
      sourceId: "BeforeSplit001",
      targetId: "ParallelSplit001",
      targetPortId: "in-center",
    },
    {
      sourceId: "ParallelSplit001",
      sourcePortId: "out-branch-1",
      targetId: "BranchLeft001",
    },
    {
      sourceId: "ParallelSplit001",
      sourcePortId: "out-branch-2",
      targetId: "BranchMiddle001",
    },
    {
      sourceId: "ParallelSplit001",
      sourcePortId: "out-branch-3",
      targetId: "BranchRight001",
    },
  ];

  const result = buildGeneralRecipeXml({ workspaceItems, connections });
  const recipe = result.document["b2mml:GRecipe"];
  const stage = recipe["b2mml:ProcessProcedure"]["b2mml:ProcessElement"][0];

  expect(result.schemaWarnings).toEqual([]);
  expect(stage["b2mml:ProcedureChartElement"]).toEqual([
    {
      "b2mml:ID": "ParallelSplit001",
      "b2mml:ProcedureChartElementType": "Start Parallel Indicator",
    },
  ]);
  expect(stage["b2mml:DirectedLink"].map((entry) => ({
    from: entry["b2mml:FromID"],
    to: entry["b2mml:ToID"],
  }))).toEqual([
    { from: "BeforeSplit001", to: "ParallelSplit001" },
    { from: "ParallelSplit001", to: "BranchLeft001" },
    { from: "ParallelSplit001", to: "BranchMiddle001" },
    { from: "ParallelSplit001", to: "BranchRight001" },
  ]);
  expect(result.xml).not.toContain("out-branch-");
  expect(result.xml).not.toContain("in-center");
});

test("exports repeated directed links when multiple parallel branches target the same process step", () => {
  const workspaceItems = [
    {
      id: "StageSplit001",
      type: "process",
      description: "Parallel stage",
      processElementType: "Process Stage",
      processElementParameter: [],
      resourceConstraint: [],
      otherInformation: [],
      x: 0,
      y: 0,
    },
    {
      id: "ParallelSplit001",
      type: "chart_element",
      parentId: "StageSplit001",
      description: "",
      procedureChartElementType: "Start Parallel Indicator",
      parallelBranchCount: 3,
      x: 0,
      y: 0,
    },
    {
      id: "BranchShared001",
      type: "process",
      parentId: "StageSplit001",
      description: "Shared branch target",
      processElementType: "Process Operation",
      processElementParameter: [],
      resourceConstraint: [],
      otherInformation: [],
      x: 0,
      y: 0,
    },
  ];

  const connections = [
    {
      sourceId: "ParallelSplit001",
      sourcePortId: "out-branch-1",
      targetId: "BranchShared001",
    },
    {
      sourceId: "ParallelSplit001",
      sourcePortId: "out-branch-2",
      targetId: "BranchShared001",
    },
  ];

  const result = buildGeneralRecipeXml({ workspaceItems, connections });
  const stage = result.document["b2mml:GRecipe"]["b2mml:ProcessProcedure"]["b2mml:ProcessElement"][0];

  expect(result.schemaWarnings).toEqual([]);
  expect(stage["b2mml:DirectedLink"].map((entry) => ({
    from: entry["b2mml:FromID"],
    to: entry["b2mml:ToID"],
  }))).toEqual([
    { from: "ParallelSplit001", to: "BranchShared001" },
    { from: "ParallelSplit001", to: "BranchShared001" },
  ]);
});

