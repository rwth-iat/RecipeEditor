import { expect, test } from "vitest";
import { importWorkspaceFile, WorkspaceMode } from "@/services/workspace";

const SIMPLE_GENERAL_RECIPE_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<b2mml:GRecipe xmlns:b2mml="http://www.mesa.org/xml/B2MML">
  <b2mml:ID>testID</b2mml:ID>
  <b2mml:GRecipeType>General</b2mml:GRecipeType>
  <b2mml:Formula>
    <b2mml:ProcessInputs>
      <b2mml:ID>inputid</b2mml:ID>
      <b2mml:MaterialsType>Input</b2mml:MaterialsType>
      <b2mml:Material>
        <b2mml:ID>Educt001</b2mml:ID>
        <b2mml:Description>Educt</b2mml:Description>
      </b2mml:Material>
    </b2mml:ProcessInputs>
    <b2mml:ProcessOutputs>
      <b2mml:ID>outputsid</b2mml:ID>
      <b2mml:MaterialsType>Output</b2mml:MaterialsType>
      <b2mml:Material>
        <b2mml:ID>Product001</b2mml:ID>
        <b2mml:Description>Product</b2mml:Description>
      </b2mml:Material>
    </b2mml:ProcessOutputs>
  </b2mml:Formula>
  <b2mml:ProcessProcedure>
    <b2mml:ID>Procedure1</b2mml:ID>
    <b2mml:Description>This is the top level ProcessElement</b2mml:Description>
    <b2mml:ProcessElementType>Process</b2mml:ProcessElementType>
    <b2mml:Materials>
      <b2mml:ID>Procedure1InputMaterials</b2mml:ID>
      <b2mml:MaterialsType>Input</b2mml:MaterialsType>
      <b2mml:Material>
        <b2mml:ID>Educt001</b2mml:ID>
      </b2mml:Material>
    </b2mml:Materials>
    <b2mml:Materials>
      <b2mml:ID>Procedure1OutputMaterials</b2mml:ID>
      <b2mml:MaterialsType>Output</b2mml:MaterialsType>
      <b2mml:Material>
        <b2mml:ID>Product001</b2mml:ID>
      </b2mml:Material>
    </b2mml:Materials>
    <b2mml:DirectedLink>
      <b2mml:ID>0</b2mml:ID>
      <b2mml:FromID>Educt001</b2mml:FromID>
      <b2mml:ToID>Process001</b2mml:ToID>
    </b2mml:DirectedLink>
    <b2mml:DirectedLink>
      <b2mml:ID>1</b2mml:ID>
      <b2mml:FromID>Process001</b2mml:FromID>
      <b2mml:ToID>Product001</b2mml:ToID>
    </b2mml:DirectedLink>
    <b2mml:ProcessElement>
      <b2mml:ID>Process001</b2mml:ID>
      <b2mml:Description>Process</b2mml:Description>
      <b2mml:ProcessElementType>Process</b2mml:ProcessElementType>
    </b2mml:ProcessElement>
  </b2mml:ProcessProcedure>
</b2mml:GRecipe>`;

const LEGACY_GROUPED_GENERAL_RECIPE_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<b2mml:GRecipe xmlns:b2mml="http://www.mesa.org/xml/B2MML">
  <b2mml:ID>ExampleGeneralRecipe</b2mml:ID>
  <b2mml:GRecipeType>General</b2mml:GRecipeType>
  <b2mml:Formula>
    <b2mml:ProcessInputs>
      <b2mml:ID>inputid</b2mml:ID>
      <b2mml:MaterialsType>Input</b2mml:MaterialsType>
      <b2mml:Material>
        <b2mml:ID>Educt001</b2mml:ID>
        <b2mml:Description>Educt 1</b2mml:Description>
      </b2mml:Material>
      <b2mml:Material>
        <b2mml:ID>Educt002</b2mml:ID>
        <b2mml:Description>Educt 2</b2mml:Description>
      </b2mml:Material>
    </b2mml:ProcessInputs>
    <b2mml:ProcessOutputs>
      <b2mml:ID>outputsid</b2mml:ID>
      <b2mml:MaterialsType>Output</b2mml:MaterialsType>
      <b2mml:Material>
        <b2mml:ID>Product001</b2mml:ID>
        <b2mml:Description>Product</b2mml:Description>
      </b2mml:Material>
    </b2mml:ProcessOutputs>
    <b2mml:ProcessIntermediates>
      <b2mml:ID>intermediateid</b2mml:ID>
      <b2mml:MaterialsType>Intermediate</b2mml:MaterialsType>
      <b2mml:Material>
        <b2mml:ID>Intermediate001</b2mml:ID>
        <b2mml:Description>Intermediate 1</b2mml:Description>
      </b2mml:Material>
      <b2mml:Material>
        <b2mml:ID>Intermediate002</b2mml:ID>
        <b2mml:Description>Intermediate 2</b2mml:Description>
      </b2mml:Material>
    </b2mml:ProcessIntermediates>
  </b2mml:Formula>
  <b2mml:ProcessProcedure>
    <b2mml:ID>Procedure1</b2mml:ID>
    <b2mml:Description>This is the top level ProcessElement</b2mml:Description>
    <b2mml:ProcessElementType>Process</b2mml:ProcessElementType>
    <b2mml:Materials>
      <b2mml:ID>Procedure1InputMaterials</b2mml:ID>
      <b2mml:MaterialsType>Input</b2mml:MaterialsType>
      <b2mml:Material><b2mml:ID>Educt001</b2mml:ID></b2mml:Material>
      <b2mml:Material><b2mml:ID>Educt002</b2mml:ID></b2mml:Material>
    </b2mml:Materials>
    <b2mml:Materials>
      <b2mml:ID>Procedure1IntermediateMaterials</b2mml:ID>
      <b2mml:MaterialsType>Intermediate</b2mml:MaterialsType>
      <b2mml:Material><b2mml:ID>Intermediate001</b2mml:ID></b2mml:Material>
      <b2mml:Material><b2mml:ID>Intermediate002</b2mml:ID></b2mml:Material>
    </b2mml:Materials>
    <b2mml:Materials>
      <b2mml:ID>Procedure1OutputMaterials</b2mml:ID>
      <b2mml:MaterialsType>Output</b2mml:MaterialsType>
      <b2mml:Material><b2mml:ID>Product001</b2mml:ID></b2mml:Material>
    </b2mml:Materials>
    <b2mml:DirectedLink>
      <b2mml:ID>0</b2mml:ID>
      <b2mml:FromID>Educt001</b2mml:FromID>
      <b2mml:ToID>Mixing_of_Liquids001</b2mml:ToID>
    </b2mml:DirectedLink>
    <b2mml:DirectedLink>
      <b2mml:ID>1</b2mml:ID>
      <b2mml:FromID>Educt002</b2mml:FromID>
      <b2mml:ToID>Mixing_of_Liquids001</b2mml:ToID>
    </b2mml:DirectedLink>
    <b2mml:DirectedLink>
      <b2mml:ID>2</b2mml:ID>
      <b2mml:FromID>Mixing_of_Liquids001</b2mml:FromID>
      <b2mml:ToID>Intermediate001</b2mml:ToID>
    </b2mml:DirectedLink>
    <b2mml:DirectedLink>
      <b2mml:ID>3</b2mml:ID>
      <b2mml:FromID>Intermediate001</b2mml:FromID>
      <b2mml:ToID>Dosing001</b2mml:ToID>
    </b2mml:DirectedLink>
    <b2mml:DirectedLink>
      <b2mml:ID>4</b2mml:ID>
      <b2mml:FromID>Dosing001</b2mml:FromID>
      <b2mml:ToID>Intermediate002</b2mml:ToID>
    </b2mml:DirectedLink>
    <b2mml:DirectedLink>
      <b2mml:ID>5</b2mml:ID>
      <b2mml:FromID>Intermediate002</b2mml:FromID>
      <b2mml:ToID>Heating_of_Liquids001</b2mml:ToID>
    </b2mml:DirectedLink>
    <b2mml:DirectedLink>
      <b2mml:ID>6</b2mml:ID>
      <b2mml:FromID>Heating_of_Liquids001</b2mml:FromID>
      <b2mml:ToID>Product001</b2mml:ToID>
    </b2mml:DirectedLink>
    <b2mml:ProcessElement>
      <b2mml:ID>Mixing_of_Liquids001</b2mml:ID>
      <b2mml:Description>Mixing</b2mml:Description>
      <b2mml:ProcessElementType>Process</b2mml:ProcessElementType>
      <b2mml:Materials>
        <b2mml:ID>MixingInputMaterials</b2mml:ID>
        <b2mml:MaterialsType>Input</b2mml:MaterialsType>
      </b2mml:Materials>
      <b2mml:Materials>
        <b2mml:ID>MixingOutputMaterials</b2mml:ID>
        <b2mml:MaterialsType>Output</b2mml:MaterialsType>
      </b2mml:Materials>
    </b2mml:ProcessElement>
    <b2mml:ProcessElement>
      <b2mml:ID>Dosing001</b2mml:ID>
      <b2mml:Description>Dosing</b2mml:Description>
      <b2mml:ProcessElementType>Process</b2mml:ProcessElementType>
      <b2mml:Materials>
        <b2mml:ID>DosingInputMaterials</b2mml:ID>
        <b2mml:MaterialsType>Input</b2mml:MaterialsType>
      </b2mml:Materials>
      <b2mml:Materials>
        <b2mml:ID>DosingOutputMaterials</b2mml:ID>
        <b2mml:MaterialsType>Output</b2mml:MaterialsType>
      </b2mml:Materials>
    </b2mml:ProcessElement>
    <b2mml:ProcessElement>
      <b2mml:ID>Heating_of_Liquids001</b2mml:ID>
      <b2mml:Description>Heating</b2mml:Description>
      <b2mml:ProcessElementType>Process</b2mml:ProcessElementType>
      <b2mml:Materials>
        <b2mml:ID>HeatingInputMaterials</b2mml:ID>
        <b2mml:MaterialsType>Input</b2mml:MaterialsType>
      </b2mml:Materials>
      <b2mml:Materials>
        <b2mml:ID>HeatingOutputMaterials</b2mml:ID>
        <b2mml:MaterialsType>Output</b2mml:MaterialsType>
      </b2mml:Materials>
    </b2mml:ProcessElement>
  </b2mml:ProcessProcedure>
</b2mml:GRecipe>`;

const NORMALIZED_GENERAL_RECIPE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<b2mml:GRecipe xmlns:b2mml="http://www.mesa.org/xml/B2MML">
  <b2mml:ID>GeneralRecipe_Test_001</b2mml:ID>
  <b2mml:GRecipeType>General</b2mml:GRecipeType>
  <b2mml:Formula>
    <b2mml:ProcessInputs>
      <b2mml:ID>PI_001</b2mml:ID>
      <b2mml:MaterialsType>Input</b2mml:MaterialsType>
      <b2mml:Material>
        <b2mml:ID>MAT_IN_001</b2mml:ID>
        <b2mml:Description>Wasser</b2mml:Description>
        <b2mml:MaterialID>WATER_001</b2mml:MaterialID>
        <b2mml:Amount>
          <b2mml:QuantityString>100 kg</b2mml:QuantityString>
          <b2mml:UnitOfMeasure>kg</b2mml:UnitOfMeasure>
        </b2mml:Amount>
      </b2mml:Material>
    </b2mml:ProcessInputs>
    <b2mml:ProcessOutputs>
      <b2mml:ID>PO_001</b2mml:ID>
      <b2mml:MaterialsType>Output</b2mml:MaterialsType>
      <b2mml:Material>
        <b2mml:ID>MAT_OUT_001</b2mml:ID>
        <b2mml:Description>Erwaermtes Wasser</b2mml:Description>
        <b2mml:MaterialID>HEATED_WATER_001</b2mml:MaterialID>
      </b2mml:Material>
    </b2mml:ProcessOutputs>
  </b2mml:Formula>
  <b2mml:ProcessProcedure>
    <b2mml:ID>PROC_001</b2mml:ID>
    <b2mml:Description>Einfacher Verfahrensablauf</b2mml:Description>
    <b2mml:ProcessElementType>Process</b2mml:ProcessElementType>
    <b2mml:Materials>
      <b2mml:ID>STEP_INPUT_001</b2mml:ID>
      <b2mml:MaterialsType>Input</b2mml:MaterialsType>
      <b2mml:Material>
        <b2mml:ID>MAT_IN_001</b2mml:ID>
      </b2mml:Material>
    </b2mml:Materials>
    <b2mml:Materials>
      <b2mml:ID>STEP_OUTPUT_001</b2mml:ID>
      <b2mml:MaterialsType>Output</b2mml:MaterialsType>
      <b2mml:Material>
        <b2mml:ID>MAT_OUT_001</b2mml:ID>
      </b2mml:Material>
    </b2mml:Materials>
    <b2mml:DirectedLink>
      <b2mml:ID>DL_001</b2mml:ID>
      <b2mml:FromID>STEP_INPUT_001</b2mml:FromID>
      <b2mml:ToID>HEATING_001</b2mml:ToID>
    </b2mml:DirectedLink>
    <b2mml:DirectedLink>
      <b2mml:ID>DL_002</b2mml:ID>
      <b2mml:FromID>HEATING_001</b2mml:FromID>
      <b2mml:ToID>STEP_OUTPUT_001</b2mml:ToID>
    </b2mml:DirectedLink>
    <b2mml:ProcessElement>
      <b2mml:ID>HEATING_001</b2mml:ID>
      <b2mml:Description>Erhitzen</b2mml:Description>
      <b2mml:ProcessElementType>Process Operation</b2mml:ProcessElementType>
    </b2mml:ProcessElement>
  </b2mml:ProcessProcedure>
</b2mml:GRecipe>`;

const FORMULA_ONLY_GENERAL_RECIPE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<b2mml:GRecipe xmlns:b2mml="http://www.mesa.org/xml/B2MML">
  <b2mml:ID>FormulaOnly_001</b2mml:ID>
  <b2mml:GRecipeType>General</b2mml:GRecipeType>
  <b2mml:Formula>
    <b2mml:ProcessInputs>
      <b2mml:ID>PI_001</b2mml:ID>
      <b2mml:MaterialsType>Input</b2mml:MaterialsType>
      <b2mml:Material>
        <b2mml:ID>FORMULA_INPUT_001</b2mml:ID>
        <b2mml:Description>Water</b2mml:Description>
      </b2mml:Material>
    </b2mml:ProcessInputs>
    <b2mml:ProcessOutputs>
      <b2mml:ID>PO_001</b2mml:ID>
      <b2mml:MaterialsType>Output</b2mml:MaterialsType>
      <b2mml:Material>
        <b2mml:ID>FORMULA_OUTPUT_001</b2mml:ID>
        <b2mml:Description>Steam</b2mml:Description>
      </b2mml:Material>
    </b2mml:ProcessOutputs>
  </b2mml:Formula>
  <b2mml:ProcessProcedure>
    <b2mml:ID>PROC_001</b2mml:ID>
    <b2mml:ProcessElementType>Process</b2mml:ProcessElementType>
  </b2mml:ProcessProcedure>
</b2mml:GRecipe>`;

const PROCESS_METADATA_GENERAL_RECIPE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<b2mml:GRecipe xmlns:b2mml="http://www.mesa.org/xml/B2MML">
  <b2mml:ID>ProcessMetadata_001</b2mml:ID>
  <b2mml:GRecipeType>General</b2mml:GRecipeType>
  <b2mml:ProcessProcedure>
    <b2mml:ID>PROC_001</b2mml:ID>
    <b2mml:ProcessElementType>Process</b2mml:ProcessElementType>
    <b2mml:ProcessElement>
      <b2mml:ID>MIXING_001</b2mml:ID>
      <b2mml:Description>Mixing</b2mml:Description>
      <b2mml:ProcessElementType>Process</b2mml:ProcessElementType>
      <b2mml:ProcessElementParameter>
        <b2mml:ID>RPM_001</b2mml:ID>
        <b2mml:Description>Revolutions per minute</b2mml:Description>
        <b2mml:Value>
          <b2mml:ValueString>200</b2mml:ValueString>
        </b2mml:Value>
      </b2mml:ProcessElementParameter>
      <b2mml:OtherInformation>
        <b2mml:OtherInfoID>SemanticDescription</b2mml:OtherInfoID>
        <b2mml:Description>URI referencing the Ontology Class definition</b2mml:Description>
        <b2mml:OtherValue>
          <b2mml:ValueString>http://example.com/ontology#Mixing</b2mml:ValueString>
        </b2mml:OtherValue>
      </b2mml:OtherInformation>
    </b2mml:ProcessElement>
  </b2mml:ProcessProcedure>
</b2mml:GRecipe>`;

const PROCEDURE_CHART_GENERAL_RECIPE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<b2mml:GRecipe xmlns:b2mml="http://www.mesa.org/xml/B2MML">
  <b2mml:ID>GeneralRecipe_Chart_001</b2mml:ID>
  <b2mml:GRecipeType>General</b2mml:GRecipeType>
  <b2mml:ProcessProcedure>
    <b2mml:ID>Procedure1</b2mml:ID>
    <b2mml:ProcessElementType>Process</b2mml:ProcessElementType>
    <b2mml:ProcessElement>
      <b2mml:ID>Stage001</b2mml:ID>
      <b2mml:Description>Mixing Stage</b2mml:Description>
      <b2mml:ProcessElementType>Process Stage</b2mml:ProcessElementType>
      <b2mml:Materials>
        <b2mml:ID>StageInput001</b2mml:ID>
        <b2mml:Description>Input</b2mml:Description>
        <b2mml:MaterialsType>Input</b2mml:MaterialsType>
        <b2mml:Material>
          <b2mml:ID>StageMaterial001</b2mml:ID>
          <b2mml:Description>Water</b2mml:Description>
        </b2mml:Material>
      </b2mml:Materials>
      <b2mml:ProcedureChartElement>
        <b2mml:ID>PrevIndicator001</b2mml:ID>
        <b2mml:Description>Previous</b2mml:Description>
        <b2mml:ProcedureChartElementType>Previous Operation Indicator</b2mml:ProcedureChartElementType>
      </b2mml:ProcedureChartElement>
      <b2mml:ProcedureChartElement>
        <b2mml:ID>NextIndicator001</b2mml:ID>
        <b2mml:Description>Next</b2mml:Description>
        <b2mml:ProcedureChartElementType>Next Operation Indicator</b2mml:ProcedureChartElementType>
      </b2mml:ProcedureChartElement>
      <b2mml:DirectedLink>
        <b2mml:ID>StageLink001</b2mml:ID>
        <b2mml:FromID>PrevIndicator001</b2mml:FromID>
        <b2mml:ToID>Operation001</b2mml:ToID>
      </b2mml:DirectedLink>
      <b2mml:DirectedLink>
        <b2mml:ID>StageLink002</b2mml:ID>
        <b2mml:FromID>StageInput001</b2mml:FromID>
        <b2mml:ToID>Operation001</b2mml:ToID>
      </b2mml:DirectedLink>
      <b2mml:ProcessElement>
        <b2mml:ID>Operation001</b2mml:ID>
        <b2mml:Description>Operation</b2mml:Description>
        <b2mml:ProcessElementType>Process Operation</b2mml:ProcessElementType>
      </b2mml:ProcessElement>
    </b2mml:ProcessElement>
  </b2mml:ProcessProcedure>
</b2mml:GRecipe>`;

const AMBIGUOUS_LEGACY_LINK_GENERAL_RECIPE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<b2mml:GRecipe xmlns:b2mml="http://www.mesa.org/xml/B2MML">
  <b2mml:ID>GeneralRecipe_Ambiguous_001</b2mml:ID>
  <b2mml:GRecipeType>General</b2mml:GRecipeType>
  <b2mml:Formula>
    <b2mml:ProcessInputs>
      <b2mml:ID>PI_001</b2mml:ID>
      <b2mml:MaterialsType>Input</b2mml:MaterialsType>
      <b2mml:Material><b2mml:ID>MAT_SHARED</b2mml:ID></b2mml:Material>
    </b2mml:ProcessInputs>
  </b2mml:Formula>
  <b2mml:ProcessProcedure>
    <b2mml:ID>PROC_001</b2mml:ID>
    <b2mml:ProcessElementType>Process</b2mml:ProcessElementType>
    <b2mml:Materials>
      <b2mml:ID>STEP_INPUT_001</b2mml:ID>
      <b2mml:MaterialsType>Input</b2mml:MaterialsType>
      <b2mml:Material><b2mml:ID>MAT_SHARED</b2mml:ID></b2mml:Material>
    </b2mml:Materials>
    <b2mml:Materials>
      <b2mml:ID>STEP_INPUT_002</b2mml:ID>
      <b2mml:MaterialsType>Input</b2mml:MaterialsType>
      <b2mml:Material><b2mml:ID>MAT_SHARED</b2mml:ID></b2mml:Material>
    </b2mml:Materials>
    <b2mml:DirectedLink>
      <b2mml:ID>DL_001</b2mml:ID>
      <b2mml:FromID>MAT_SHARED</b2mml:FromID>
      <b2mml:ToID>PROCESS_001</b2mml:ToID>
    </b2mml:DirectedLink>
    <b2mml:ProcessElement>
      <b2mml:ID>PROCESS_001</b2mml:ID>
      <b2mml:ProcessElementType>Process</b2mml:ProcessElementType>
    </b2mml:ProcessElement>
  </b2mml:ProcessProcedure>
</b2mml:GRecipe>`;

function importGeneralRecipe(content) {
  return importWorkspaceFile({
    filename: "recipe.xml",
    content,
    mode: WorkspaceMode.GENERAL,
  });
}

function findItem(items, id) {
  return items.find((item) => item.id === id);
}

test("hides the top-level ProcessProcedure and resolves legacy material links to visible containers", () => {
  const result = importGeneralRecipe(SIMPLE_GENERAL_RECIPE_XML);
  const inputContainer = findItem(result.items, "Educt001");
  const outputContainer = findItem(result.items, "Product001");

  expect(findItem(result.items, "Procedure1")).toBeUndefined();
  expect(findItem(result.items, "Procedure1InputMaterials")).toBeUndefined();
  expect(findItem(result.items, "Procedure1OutputMaterials")).toBeUndefined();
  expect(findItem(result.items, "Process001")?.type).toBe("process");
  expect(inputContainer).toMatchObject({
    type: "material_container",
    materialType: "Input",
  });
  expect(inputContainer?.materials?.[0]).toMatchObject({
    id: "Educt001",
    description: "Educt",
  });
  expect(outputContainer).toMatchObject({
    type: "material_container",
    materialType: "Output",
  });
  expect(outputContainer?.materials?.[0]).toMatchObject({
    id: "Product001",
    description: "Product",
  });
  expect(result.connections).toEqual([
    { sourceId: "Educt001", targetId: "Process001" },
    { sourceId: "Process001", targetId: "Product001" },
  ]);
  expect(result.warnings).toEqual([]);
});

test("splits legacy grouped procedure materials into separate visible containers per child material", () => {
  const result = importGeneralRecipe(LEGACY_GROUPED_GENERAL_RECIPE_XML);

  expect(findItem(result.items, "Procedure1")).toBeUndefined();
  expect(findItem(result.items, "Procedure1InputMaterials")).toBeUndefined();
  expect(findItem(result.items, "Procedure1IntermediateMaterials")).toBeUndefined();
  expect(findItem(result.items, "Procedure1OutputMaterials")).toBeUndefined();
  expect(findItem(result.items, "MixingInputMaterials")).toBeUndefined();
  expect(findItem(result.items, "DosingInputMaterials")).toBeUndefined();
  expect(findItem(result.items, "HeatingInputMaterials")).toBeUndefined();

  expect(findItem(result.items, "Educt001")).toMatchObject({
    type: "material_container",
    materialType: "Input",
    materials: [{ id: "Educt001", description: "Educt 1" }],
  });
  expect(findItem(result.items, "Educt002")).toMatchObject({
    type: "material_container",
    materialType: "Input",
    materials: [{ id: "Educt002", description: "Educt 2" }],
  });
  expect(findItem(result.items, "Intermediate001")).toMatchObject({
    type: "material_container",
    materialType: "Intermediate",
    materials: [{ id: "Intermediate001", description: "Intermediate 1" }],
  });
  expect(findItem(result.items, "Intermediate002")).toMatchObject({
    type: "material_container",
    materialType: "Intermediate",
    materials: [{ id: "Intermediate002", description: "Intermediate 2" }],
  });
  expect(findItem(result.items, "Product001")).toMatchObject({
    type: "material_container",
    materialType: "Output",
    materials: [{ id: "Product001", description: "Product" }],
  });

  expect(
    result.items.filter((item) => item.type === "material_container").map((item) => item.id)
  ).toEqual(["Educt001", "Educt002", "Intermediate001", "Intermediate002", "Product001"]);
  expect(result.connections).toEqual([
    { sourceId: "Educt001", targetId: "Mixing_of_Liquids001" },
    { sourceId: "Educt002", targetId: "Mixing_of_Liquids001" },
    { sourceId: "Mixing_of_Liquids001", targetId: "Intermediate001" },
    { sourceId: "Intermediate001", targetId: "Dosing001" },
    { sourceId: "Dosing001", targetId: "Intermediate002" },
    { sourceId: "Intermediate002", targetId: "Heating_of_Liquids001" },
    { sourceId: "Heating_of_Liquids001", targetId: "Product001" },
  ]);
  expect(result.warnings).toEqual([]);
});

test("normalizes imported material containers and child materials to the editor model", () => {
  const result = importGeneralRecipe(NORMALIZED_GENERAL_RECIPE_XML);
  const inputContainer = findItem(result.items, "STEP_INPUT_001");
  const process = findItem(result.items, "HEATING_001");

  expect(findItem(result.items, "PROC_001")).toBeUndefined();
  expect(inputContainer).toMatchObject({
    type: "material_container",
    materialType: "Input",
  });
  expect(inputContainer?.materials?.[0]).toMatchObject({
    id: "MAT_IN_001",
    description: "Wasser",
    materialID: "WATER_001",
  });
  expect(inputContainer?.materials?.[0]?.amount).toMatchObject({
    valueString: "100 kg",
    unitOfMeasure: "kg",
  });
  expect(process).toMatchObject({
    type: "process",
    description: "Erhitzen",
    processElementType: "Process Operation",
  });
  expect(result.connections).toEqual([
    { sourceId: "STEP_INPUT_001", targetId: "HEATING_001" },
    { sourceId: "HEATING_001", targetId: "STEP_OUTPUT_001" },
  ]);
  expect(result.warnings).toEqual([]);
});

test("keeps DirectedLinks that already point to visible container IDs", () => {
  const result = importGeneralRecipe(NORMALIZED_GENERAL_RECIPE_XML);

  expect(result.connections).toContainEqual({
    sourceId: "STEP_INPUT_001",
    targetId: "HEATING_001",
  });
  expect(result.connections).toContainEqual({
    sourceId: "HEATING_001",
    targetId: "STEP_OUTPUT_001",
  });
});

test("synthesizes visible material containers from Formula when the Procedure has none", () => {
  const result = importGeneralRecipe(FORMULA_ONLY_GENERAL_RECIPE_XML);

  expect(findItem(result.items, "PI_001")).toMatchObject({
    type: "material_container",
    materialType: "Input",
  });
  expect(findItem(result.items, "PO_001")).toMatchObject({
    type: "material_container",
    materialType: "Output",
  });
  expect(findItem(result.items, "PI_001")?.materials?.[0]).toMatchObject({
    id: "FORMULA_INPUT_001",
    description: "Water",
  });
  expect(findItem(result.items, "PO_001")?.materials?.[0]).toMatchObject({
    id: "FORMULA_OUTPUT_001",
    description: "Steam",
  });
  expect(result.connections).toEqual([]);
  expect(result.warnings).toEqual([]);
});

test("imports process metadata descriptions as full strings", () => {
  const result = importGeneralRecipe(PROCESS_METADATA_GENERAL_RECIPE_XML);
  const process = findItem(result.items, "MIXING_001");

  expect(process?.processElementParameter).toEqual([
    {
      id: "RPM_001",
      description: "Revolutions per minute",
      value: [{ valueString: "200" }],
    },
  ]);
  expect(process?.otherInformation).toEqual([
    {
      otherInfoID: "SemanticDescription",
      description: "URI referencing the Ontology Class definition",
      otherValue: [{ valueString: "http://example.com/ontology#Mixing" }],
    },
  ]);
});

test("imports procedure chart elements and links from nested process elements", () => {
  const result = importGeneralRecipe(PROCEDURE_CHART_GENERAL_RECIPE_XML);

  expect(findItem(result.items, "PrevIndicator001")).toMatchObject({
    type: "chart_element",
    parentId: "Stage001",
    procedureChartElementType: "Previous Operation Indicator",
  });
  expect(findItem(result.items, "NextIndicator001")).toMatchObject({
    type: "chart_element",
    parentId: "Stage001",
    procedureChartElementType: "Next Operation Indicator",
  });
  expect(findItem(result.items, "StageInput001")).toMatchObject({
    type: "material_container",
    parentId: "Stage001",
    materialType: "Input",
  });
  expect(result.connections).toContainEqual({
    sourceId: "PrevIndicator001",
    targetId: "Operation001",
  });
  expect(result.connections).toContainEqual({
    sourceId: "StageInput001",
    targetId: "Operation001",
  });
  expect(result.warnings).toEqual([]);
});

test("warns and skips legacy links when one child material ID belongs to multiple visible containers", () => {
  const result = importGeneralRecipe(AMBIGUOUS_LEGACY_LINK_GENERAL_RECIPE_XML);

  expect(result.connections).toEqual([]);
  expect(result.warnings).toHaveLength(1);
  expect(result.warnings[0]).toContain("MAT_SHARED");
  expect(result.warnings[0]).toContain("ambiguous");
});
