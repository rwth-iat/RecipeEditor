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

