import { expect, test } from "vitest";
import { buildMasterRecipePayload } from "@/services/recipe";
import { importWorkspaceFile, WorkspaceMode } from "@/services/workspace";

const SIMPLE_MASTER_RECIPE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<b2mml:BatchInformation xmlns:b2mml="http://www.mesa.org/xml/B2MML">
  <b2mml:ListHeader>
    <b2mml:ID>ListHeader001</b2mml:ID>
    <b2mml:CreateDate>2026-03-20T10:00:00Z</b2mml:CreateDate>
  </b2mml:ListHeader>
  <b2mml:Description>Imported batch information</b2mml:Description>
  <b2mml:MasterRecipe>
    <b2mml:ID>MasterRecipe001</b2mml:ID>
    <b2mml:Version>1.2.3</b2mml:Version>
    <b2mml:VersionDate>2026-03-20T10:00:00Z</b2mml:VersionDate>
    <b2mml:Description>Imported master recipe</b2mml:Description>
    <b2mml:Header>
      <b2mml:ProductID>Product001</b2mml:ProductID>
      <b2mml:ProductName>Imported Product</b2mml:ProductName>
    </b2mml:Header>
    <b2mml:EquipmentRequirement>
      <b2mml:ID>REQ-1</b2mml:ID>
      <b2mml:Constraint>
        <b2mml:ID>REQ-1_constraint</b2mml:ID>
        <b2mml:Condition>Material == H2O</b2mml:Condition>
      </b2mml:Constraint>
      <b2mml:Description>Only water is allowed</b2mml:Description>
    </b2mml:EquipmentRequirement>
    <b2mml:Formula>
      <b2mml:Description>Formula description</b2mml:Description>
      <b2mml:Parameter>
        <b2mml:ID>001:ParamTemp</b2mml:ID>
        <b2mml:Description>001:Temperature</b2mml:Description>
        <b2mml:ParameterType>ProcessParameter</b2mml:ParameterType>
        <b2mml:ParameterSubType>ST</b2mml:ParameterSubType>
        <b2mml:Value>
          <b2mml:ValueString>80</b2mml:ValueString>
          <b2mml:DataInterpretation>Constant</b2mml:DataInterpretation>
          <b2mml:DataType>temperature</b2mml:DataType>
          <b2mml:UnitOfMeasure>C</b2mml:UnitOfMeasure>
        </b2mml:Value>
      </b2mml:Parameter>
    </b2mml:Formula>
    <b2mml:ProcedureLogic>
      <b2mml:Link>
        <b2mml:ID>L1</b2mml:ID>
        <b2mml:FromID>
          <b2mml:FromIDValue>S1</b2mml:FromIDValue>
          <b2mml:FromType>Step</b2mml:FromType>
          <b2mml:IDScope>External</b2mml:IDScope>
        </b2mml:FromID>
        <b2mml:ToID>
          <b2mml:ToIDValue>T1</b2mml:ToIDValue>
          <b2mml:ToType>Transition</b2mml:ToType>
          <b2mml:IDScope>External</b2mml:IDScope>
        </b2mml:ToID>
        <b2mml:LinkType>ControlLink</b2mml:LinkType>
      </b2mml:Link>
      <b2mml:Link>
        <b2mml:ID>L2</b2mml:ID>
        <b2mml:FromID>
          <b2mml:FromIDValue>T1</b2mml:FromIDValue>
          <b2mml:FromType>Transition</b2mml:FromType>
          <b2mml:IDScope>External</b2mml:IDScope>
        </b2mml:FromID>
        <b2mml:ToID>
          <b2mml:ToIDValue>S2</b2mml:ToIDValue>
          <b2mml:ToType>Step</b2mml:ToType>
          <b2mml:IDScope>External</b2mml:IDScope>
        </b2mml:ToID>
        <b2mml:LinkType>ControlLink</b2mml:LinkType>
      </b2mml:Link>
      <b2mml:Link>
        <b2mml:ID>L3</b2mml:ID>
        <b2mml:FromID>
          <b2mml:FromIDValue>S2</b2mml:FromIDValue>
          <b2mml:FromType>Step</b2mml:FromType>
          <b2mml:IDScope>External</b2mml:IDScope>
        </b2mml:FromID>
        <b2mml:ToID>
          <b2mml:ToIDValue>T2</b2mml:ToIDValue>
          <b2mml:ToType>Transition</b2mml:ToType>
          <b2mml:IDScope>External</b2mml:IDScope>
        </b2mml:ToID>
        <b2mml:LinkType>ControlLink</b2mml:LinkType>
      </b2mml:Link>
      <b2mml:Link>
        <b2mml:ID>L4</b2mml:ID>
        <b2mml:FromID>
          <b2mml:FromIDValue>T2</b2mml:FromIDValue>
          <b2mml:FromType>Transition</b2mml:FromType>
          <b2mml:IDScope>External</b2mml:IDScope>
        </b2mml:FromID>
        <b2mml:ToID>
          <b2mml:ToIDValue>S3</b2mml:ToIDValue>
          <b2mml:ToType>Step</b2mml:ToType>
          <b2mml:IDScope>External</b2mml:IDScope>
        </b2mml:ToID>
        <b2mml:LinkType>ControlLink</b2mml:LinkType>
      </b2mml:Link>
      <b2mml:Step>
        <b2mml:ID>S1</b2mml:ID>
        <b2mml:RecipeElementID>Init</b2mml:RecipeElementID>
        <b2mml:RecipeElementVersion></b2mml:RecipeElementVersion>
        <b2mml:Description>Init</b2mml:Description>
      </b2mml:Step>
      <b2mml:Step>
        <b2mml:ID>S2</b2mml:ID>
        <b2mml:RecipeElementID>001:ProcHeat</b2mml:RecipeElementID>
        <b2mml:RecipeElementVersion></b2mml:RecipeElementVersion>
        <b2mml:Description>001:Heat Step</b2mml:Description>
      </b2mml:Step>
      <b2mml:Step>
        <b2mml:ID>S3</b2mml:ID>
        <b2mml:RecipeElementID>End</b2mml:RecipeElementID>
        <b2mml:RecipeElementVersion></b2mml:RecipeElementVersion>
        <b2mml:Description>End</b2mml:Description>
      </b2mml:Step>
      <b2mml:Transition>
        <b2mml:ID>T1</b2mml:ID>
        <b2mml:Condition>True</b2mml:Condition>
        <b2mml:Description>True transition</b2mml:Description>
      </b2mml:Transition>
      <b2mml:Transition>
        <b2mml:ID>T2</b2mml:ID>
        <b2mml:Condition>Step 001:Heat Step is Completed</b2mml:Condition>
        <b2mml:Description>Imported condition</b2mml:Description>
      </b2mml:Transition>
    </b2mml:ProcedureLogic>
    <b2mml:RecipeElement>
      <b2mml:ID>Init</b2mml:ID>
      <b2mml:Description>Init</b2mml:Description>
      <b2mml:RecipeElementType>Begin</b2mml:RecipeElementType>
    </b2mml:RecipeElement>
    <b2mml:RecipeElement>
      <b2mml:ID>001:ProcHeat</b2mml:ID>
      <b2mml:Description>Heating Procedure</b2mml:Description>
      <b2mml:RecipeElementType>Operation</b2mml:RecipeElementType>
      <b2mml:ActualEquipmentID>EQ-1</b2mml:ActualEquipmentID>
      <b2mml:EquipmentRequirement>
        <b2mml:ID>REQ-1</b2mml:ID>
        <b2mml:Description>Only water is allowed</b2mml:Description>
      </b2mml:EquipmentRequirement>
      <b2mml:Parameter>
        <b2mml:ID>001:ParamTemp</b2mml:ID>
        <b2mml:Description>Temperature</b2mml:Description>
        <b2mml:ParameterType>ProcessParameter</b2mml:ParameterType>
        <b2mml:ParameterSubType>ST</b2mml:ParameterSubType>
      </b2mml:Parameter>
    </b2mml:RecipeElement>
    <b2mml:RecipeElement>
      <b2mml:ID>End</b2mml:ID>
      <b2mml:Description>End</b2mml:Description>
      <b2mml:RecipeElementType>End</b2mml:RecipeElementType>
    </b2mml:RecipeElement>
  </b2mml:MasterRecipe>
  <b2mml:EquipmentElement>
    <b2mml:ID>EQ-1</b2mml:ID>
    <b2mml:Description>Heating Unit instance</b2mml:Description>
    <b2mml:EquipmentElementType>Other</b2mml:EquipmentElementType>
    <b2mml:EquipmentElementLevel>EquipmentModule</b2mml:EquipmentElementLevel>
    <b2mml:EquipmentProceduralElement>
      <b2mml:ID>ProcHeat</b2mml:ID>
      <b2mml:Description>Heating Library Procedure</b2mml:Description>
      <b2mml:EquipmentProceduralElementType>Procedure</b2mml:EquipmentProceduralElementType>
      <b2mml:Parameter>
        <b2mml:ID>ParamTemp</b2mml:ID>
        <b2mml:Description>Temperature</b2mml:Description>
        <b2mml:ParameterType>ProcessParameter</b2mml:ParameterType>
        <b2mml:ParameterSubType>ST</b2mml:ParameterSubType>
        <b2mml:Value>
          <b2mml:ValueString>80</b2mml:ValueString>
          <b2mml:DataInterpretation>Constant</b2mml:DataInterpretation>
          <b2mml:DataType>temperature</b2mml:DataType>
          <b2mml:UnitOfMeasure>C</b2mml:UnitOfMeasure>
        </b2mml:Value>
      </b2mml:Parameter>
    </b2mml:EquipmentProceduralElement>
  </b2mml:EquipmentElement>
</b2mml:BatchInformation>`;

function createProcedureItem() {
  return {
    id: "Heat001",
    type: "procedure",
    name: "Heat",
    description: ["Heat Step"],
    processElementType: "Recipe Procedure Containing Lower Level PFC",
    procId: "ProcHeat",
    serviceId: "EQ-1",
    processElementParameter: [
      {
        id: "ParamTemp",
        description: "Temperature",
        value: [
          {
            valueString: "80",
            dataType: "temperature",
            unitOfMeasure: "C",
          },
        ],
      },
    ],
    equipmentInfo: {
      source_type: "MTP",
      equipment_data: {
        service_info: {
          id: "EQ-1",
          name: "Heating Unit",
        },
        procedure_info: {
          id: "ProcHeat",
          name: "Heating Procedure",
        },
        recipe_element_description: "Heating Procedure",
        recipe_parameters: [
          {
            id: "ParamTemp",
            name: "Temperature",
            description: "Temperature",
            default: "80",
            unit: "C",
            dataType: "temperature",
            paramElem: {
              Type: "ST",
            },
          },
        ],
        equipment_requirements: [
          {
            id: "REQ-1",
            description: "Only water is allowed",
          },
        ],
      },
    },
  };
}

test("exports transitions, links and prefixed identifiers for master recipes", () => {
  const begin = {
    id: "Begin001",
    type: "recipe_element",
    recipeElementType: "Begin",
    description: ["Init"],
  };
  const procedure = createProcedureItem();
  const condition = {
    id: "Condition001",
    type: "recipe_element",
    recipeElementType: "Condition",
    description: ["Completed transition"],
    conditionGroup: {
      type: "group",
      operator: "AND",
      children: [
        {
          type: "condition",
          keyword: "Step",
          instance: "Heat001",
          operator: "is",
          value: "Completed",
        },
      ],
    },
  };
  const end = {
    id: "End001",
    type: "recipe_element",
    recipeElementType: "End",
    description: ["End"],
  };

  const buildResult = buildMasterRecipePayload({
    workspaceItems: [begin, procedure, condition, end],
    connections: [
      { sourceId: "Begin001", targetId: "Heat001" },
      { sourceId: "Heat001", targetId: "Condition001" },
      { sourceId: "Condition001", targetId: "End001" },
    ],
    config: {
      listHeaderId: "ListHeader001",
      batchInfoDescription: "Batch description",
      masterRecipeId: "MasterRecipe001",
      masterRecipeVersion: "1.0.0",
      masterRecipeVersionDate: "2026-03-20T10:00:00Z",
      masterRecipeDescription: "Exported master recipe",
      productId: "Product001",
      productName: "Export Product",
      equipmentRequirements: [
        {
          id: "REQ-1",
          constraint: "Material == H2O",
          description: "Only water is allowed",
        },
      ],
    },
  });

  const payload = buildResult.payload;
  const procedureLogic = payload.masterRecipe.procedureLogic;
  const exportedRecipeElement = payload.masterRecipe.recipeElement.find(
    (element) => element["b2mml:ID"] === "001:ProcHeat"
  );
  const exportedEquipmentElement = payload.equipmentElement.find(
    (element) => element["b2mml:ID"] === "EQ-1"
  );

  expect(procedureLogic.step).toHaveLength(3);
  expect(procedureLogic.transition).toHaveLength(2);
  expect(procedureLogic.link).toHaveLength(4);
  expect(procedureLogic.step[1]).toMatchObject({
    "b2mml:RecipeElementID": "001:ProcHeat",
    "b2mml:Description": "001:Heat Step",
  });
  expect(procedureLogic.transition).toContainEqual(
    expect.objectContaining({
      "b2mml:Condition": "True",
    })
  );
  expect(procedureLogic.transition).toContainEqual(
    expect.objectContaining({
      "b2mml:Condition": "Step 001:Heat Step is Completed",
    })
  );
  expect(procedureLogic.link).toContainEqual(
    expect.objectContaining({
      "b2mml:FromID": expect.objectContaining({
        "b2mml:FromType": "Transition",
      }),
      "b2mml:ToID": expect.objectContaining({
        "b2mml:ToType": "Step",
      }),
    })
  );
  expect(exportedRecipeElement).toMatchObject({
    "b2mml:ID": "001:ProcHeat",
    "b2mml:Description": "Heating Procedure",
    "b2mml:ActualEquipmentID": "EQ-1",
  });
  expect(exportedRecipeElement["b2mml:Parameter"]).toContainEqual(
    expect.objectContaining({
      "b2mml:ID": "001:ParamTemp",
      "b2mml:Description": "Temperature",
    })
  );
  expect(payload.masterRecipe.formula.parameter).toContainEqual(
    expect.objectContaining({
      "b2mml:ID": "001:ParamTemp",
      "b2mml:Description": "001:Temperature",
    })
  );
  expect(
    exportedEquipmentElement["b2mml:EquipmentProceduralElement"]
  ).toContainEqual(
    expect.objectContaining({
      "b2mml:ID": "ProcHeat",
    })
  );
});

test("imports BatchInformation master recipes into master workspace items and config", () => {
  const importResult = importWorkspaceFile({
    filename: "master_recipe.xml",
    content: SIMPLE_MASTER_RECIPE_XML,
    mode: WorkspaceMode.MASTER,
  });

  const procedureItem = importResult.items.find((item) => item.type === "procedure");
  const conditionItems = importResult.items.filter(
    (item) => item.type === "recipe_element" && item.recipeElementType === "Condition"
  );
  const stepCondition = conditionItems.find(
    (item) => item.conditionGroup?.children?.[0]?.keyword === "Step"
  );

  expect(importResult.config).toMatchObject({
    listHeaderId: "ListHeader001",
    batchInfoDescription: "Imported batch information",
    masterRecipeId: "MasterRecipe001",
    masterRecipeVersion: "1.2.3",
    masterRecipeDescription: "Imported master recipe",
    productId: "Product001",
    productName: "Imported Product",
  });
  expect(importResult.config.equipmentRequirements).toEqual([
    {
      id: "REQ-1",
      constraint: "Material == H2O",
      description: "Only water is allowed",
    },
  ]);

  expect(procedureItem).toMatchObject({
    processElementType: "Recipe Procedure Containing Lower Level PFC",
    procId: "ProcHeat",
    serviceId: "EQ-1",
    equipmentInfo: expect.objectContaining({
      source_type: "BatchML",
    }),
  });
  expect(procedureItem.params).toContainEqual(
    expect.objectContaining({
      id: "ParamTemp",
      default: "80",
      unit: "C",
    })
  );
  expect(conditionItems).toHaveLength(2);
  expect(stepCondition.conditionGroup.children[0]).toMatchObject({
    keyword: "Step",
    operator: "is",
    value: "Completed",
    instance: procedureItem.id,
  });
  expect(importResult.connections).toHaveLength(4);
  expect(importResult.warnings).toEqual([]);
});
