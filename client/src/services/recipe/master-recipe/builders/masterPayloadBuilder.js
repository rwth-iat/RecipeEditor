import { buildEquipmentElements } from "./equipmentBuilder";
import { buildProcedureLogic } from "./procedureLogicBuilder";
import { buildRecipeElements } from "./recipeElementBuilder";

function normalizeMasterConfig(config) {
  return config || {
    productId: "",
    productName: "",
    version: "",
    description: "",
    formulaParameters: [],
    equipmentRequirements: [],
  };
}

function collectFormulaMaterials(workspaceItems) {
  const materialInputs = [];
  const materialOutputs = [];

  workspaceItems.forEach((item) => {
    if (item.type !== "material") {
      return;
    }
    const materialInfo = {
      "b2mml:ID": item.id,
      "b2mml:Description": item.description || item.name,
      "b2mml:MaterialType": item.materialType || "Intermediate",
      "b2mml:Amount": {
        "b2mml:ValueString": item.amount?.valueString || "1",
        "b2mml:UnitOfMeasure": item.amount?.unitOfMeasure || "kg",
      },
    };
    if (item.materialType === "Input") {
      materialInputs.push(materialInfo);
    } else if (item.materialType === "Output") {
      materialOutputs.push(materialInfo);
    }
  });

  return { materialInputs, materialOutputs };
}

function collectEquipmentAndFormulaParameters(workspaceItems, config) {
  const equipmentInstances = new Set();
  const formulaParameters = [];

  workspaceItems.forEach((item) => {
    if (
      (item.type !== "process" && item.type !== "procedure") ||
      !item.equipmentInfo
    ) {
      return;
    }

    if (
      item.equipmentInfo.source_type === "MTP" &&
      item.equipmentInfo.equipment_data
    ) {
      const equipmentData = item.equipmentInfo.equipment_data;
      if (equipmentData.service_info?.id) {
        equipmentInstances.add(equipmentData.service_info.id);
      }
      if (Array.isArray(equipmentData.recipe_parameters)) {
        equipmentData.recipe_parameters.forEach((parameter) => {
          formulaParameters.push({
            "b2mml:ID": String(parameter.id),
            "b2mml:ParameterType": "ProcessParameter",
            "b2mml:ParameterSubType": parameter.paramElem?.Type || "ST",
            "b2mml:Value": {
              "b2mml:ValueString":
                parameter.default !== undefined && parameter.default !== null
                  ? String(parameter.default)
                  : "10",
              "b2mml:DataInterpretation": "Constant",
              "b2mml:DataType": parameter.unit ? "Measure" : "duration",
              "b2mml:UnitOfMeasure": parameter.unit || "seconds",
            },
          });
        });
      }
      return;
    }

    if (item.equipmentInfo.instance) {
      equipmentInstances.add(item.equipmentInfo.instance);
    }
    if (Array.isArray(item.equipmentInfo.parameters)) {
      item.equipmentInfo.parameters.forEach((parameter) => {
        formulaParameters.push({
          "b2mml:ID": String(parameter.id),
          "b2mml:ParameterType": "ProcessParameter",
          "b2mml:ParameterSubType": parameter.subType || "ST",
          "b2mml:Value": {
            "b2mml:ValueString":
              parameter.value !== undefined && parameter.value !== null
                ? String(parameter.value)
                : "10",
            "b2mml:DataInterpretation": "Constant",
            "b2mml:DataType": parameter.dataType || "duration",
            "b2mml:UnitOfMeasure": parameter.unit || "seconds",
          },
        });
      });
    }
  });

  if (Array.isArray(config.formulaParameters)) {
    config.formulaParameters.forEach((parameter) => {
      if (!parameter.id || parameter.value === undefined || parameter.value === null) {
        return;
      }
      formulaParameters.push({
        "b2mml:ID": String(parameter.id),
        "b2mml:ParameterType": "ProcessParameter",
        "b2mml:ParameterSubType": "ST",
        "b2mml:Value": {
          "b2mml:ValueString": String(parameter.value),
          "b2mml:DataInterpretation": "Constant",
          "b2mml:DataType": parameter.dataType || "duration",
          "b2mml:UnitOfMeasure": parameter.unit || "seconds",
        },
      });
    });
  }

  return { equipmentInstances, formulaParameters };
}

function buildEquipmentRequirements(config) {
  if (!Array.isArray(config.equipmentRequirements)) {
    return [];
  }
  return config.equipmentRequirements
    .filter((requirement) => requirement?.id)
    .map((requirement) => ({
      "b2mml:ID": requirement.id,
      "b2mml:Constraint": {
        "b2mml:ID": "Material constraint",
        "b2mml:Condition": requirement.constraint || "Material == H2O",
      },
      "b2mml:Description":
        requirement.description || "Equipment requirement for the process",
    }));
}

export function buildMasterRecipePayload(workspaceItems, connections, rawConfig) {
  const config = normalizeMasterConfig(rawConfig);
  const { equipmentInstances, formulaParameters } =
    collectEquipmentAndFormulaParameters(workspaceItems, config);
  const { materialInputs, materialOutputs } = collectFormulaMaterials(workspaceItems);
  const equipmentRequirements = buildEquipmentRequirements(config);

  const payload = {
    listHeader: {
      id: "ListHeadID",
      createDate: new Date().toISOString(),
    },
    description: config.description || "",
    masterRecipe: {
      id: "MasterRecipeHC",
      version: config.version || "",
      versionDate: new Date().toISOString(),
      description: config.description || "",
      header: {
        productId: config.productId || "",
        productName: config.productName || "",
      },
      equipmentRequirement: equipmentRequirements,
      formula: {
        parameter: formulaParameters,
        material: [
          ...materialInputs.map((material) => ({
            ...material,
            "b2mml:MaterialType": "Input",
            "b2mml:Description":
              material["b2mml:Description"] ||
              `Input material ${material["b2mml:ID"]}`,
          })),
          ...materialOutputs.map((material) => ({
            ...material,
            "b2mml:MaterialType": "Output",
            "b2mml:Description":
              material["b2mml:Description"] ||
              `Output material ${material["b2mml:ID"]}`,
          })),
        ],
        description:
          "Formula defines the Inputs, Intermediates, Outputs and Parameters of the Master Recipe",
      },
      procedureLogic: buildProcedureLogic(workspaceItems, connections),
      recipeElement: buildRecipeElements(workspaceItems),
    },
    equipmentElement: buildEquipmentElements(workspaceItems, equipmentInstances),
  };

  return payload;
}
