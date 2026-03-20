import { buildMasterExecutionModel } from "./masterExecutionModelBuilder";

function asArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function normalizeString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeBatchDataType(rawDataType, hasUnit) {
  const normalizedDataType = typeof rawDataType === "string" ? rawDataType.trim() : "";
  const normalizedLookup = normalizedDataType.toLowerCase();
  const aliasMap = {
    temperature: "Measure",
    pressure: "Measure",
    flow: "Measure",
    level: "Measure",
    speed: "Measure",
    weight: "Measure",
    density: "Measure",
    time: "duration",
    st: "string",
    bool: "boolean",
    dint: "integer",
    int: "integer",
    real: "double",
    float: "float",
    double: "double",
  };

  if (aliasMap[normalizedLookup]) {
    return aliasMap[normalizedLookup];
  }
  if (normalizedDataType) {
    return normalizedDataType;
  }
  return hasUnit ? "Measure" : "duration";
}

function normalizeDateTime(value, fallback) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return fallback;
  }

  return parsedDate.toISOString();
}

function normalizeMasterConfig(config) {
  const normalizedConfig = config || {};
  const nowIso = new Date().toISOString();

  return {
    listHeaderId: normalizeString(normalizedConfig.listHeaderId, "ListHeadID"),
    listHeaderCreateDate: normalizeDateTime(
      normalizedConfig.listHeaderCreateDate,
      nowIso
    ),
    batchInfoDescription: normalizeString(
      normalizedConfig.batchInfoDescription,
      normalizeString(normalizedConfig.description, "")
    ),
    masterRecipeId: normalizeString(
      normalizedConfig.masterRecipeId,
      "MasterRecipeHC"
    ),
    masterRecipeVersion: normalizeString(
      normalizedConfig.masterRecipeVersion,
      normalizeString(normalizedConfig.version, "")
    ),
    masterRecipeVersionDate: normalizeDateTime(
      normalizedConfig.masterRecipeVersionDate,
      nowIso
    ),
    masterRecipeDescription: normalizeString(
      normalizedConfig.masterRecipeDescription,
      normalizeString(normalizedConfig.description, "")
    ),
    productId: normalizeString(normalizedConfig.productId, ""),
    productName: normalizeString(normalizedConfig.productName, ""),
    version: normalizeString(
      normalizedConfig.version,
      normalizeString(normalizedConfig.masterRecipeVersion, "")
    ),
    description: normalizeString(
      normalizedConfig.description,
      normalizeString(normalizedConfig.masterRecipeDescription, "")
    ),
    formulaParameters: asArray(normalizedConfig.formulaParameters),
    equipmentRequirements: asArray(normalizedConfig.equipmentRequirements),
  };
}

function normalizeLegacyFormulaParameters(formulaParameters) {
  return asArray(formulaParameters)
    .filter((parameter) => parameter?.id)
    .map((parameter) => ({
      "b2mml:ID": String(parameter.id),
      "b2mml:Description": normalizeString(parameter.description, String(parameter.id)),
      "b2mml:ParameterType": "ProcessParameter",
      "b2mml:ParameterSubType": normalizeString(parameter.parameterSubType, "ST"),
      "b2mml:Value": {
        "b2mml:ValueString": String(parameter.value ?? ""),
        "b2mml:DataInterpretation": normalizeString(
          parameter.dataInterpretation,
          "Constant"
        ),
        "b2mml:DataType": normalizeBatchDataType(
          parameter.dataType,
          Boolean(parameter.unit)
        ),
        "b2mml:UnitOfMeasure": normalizeString(parameter.unit, "seconds"),
      },
    }));
}

function collectFormulaMaterials(workspaceItems) {
  const materialInputs = [];
  const materialOutputs = [];

  (Array.isArray(workspaceItems) ? workspaceItems : []).forEach((item) => {
    if (item?.type !== "material") {
      return;
    }

    const materialInfo = {
      "b2mml:ID": item.id,
      "b2mml:Description": item.description || item.name || item.id,
      "b2mml:MaterialType": item.materialType || "Intermediate",
      "b2mml:Amount": {
        "b2mml:ValueString": item.amount?.valueString || "1",
        "b2mml:UnitOfMeasure": item.amount?.unitOfMeasure || "kg",
      },
    };

    if (item.materialType === "Input") {
      materialInputs.push(materialInfo);
      return;
    }

    if (item.materialType === "Output") {
      materialOutputs.push(materialInfo);
    }
  });

  return { materialInputs, materialOutputs };
}

function buildEquipmentRequirements(config) {
  return asArray(config.equipmentRequirements)
    .filter((requirement) => requirement?.id)
    .map((requirement) => ({
      "b2mml:ID": requirement.id,
      "b2mml:Constraint": requirement.constraint
        ? {
            "b2mml:ID": `${requirement.id}_constraint`,
            "b2mml:Condition": requirement.constraint,
          }
        : null,
      "b2mml:Description":
        requirement.description || "Equipment requirement for the master recipe",
    }))
    .map((requirement) => {
      if (requirement["b2mml:Constraint"]) {
        return requirement;
      }
      const { ["b2mml:Constraint"]: _omittedConstraint, ...withoutConstraint } =
        requirement;
      return withoutConstraint;
    });
}

export function buildMasterRecipePayload(workspaceItems, connections, rawConfig) {
  const config = normalizeMasterConfig(rawConfig);
  const executionModel = buildMasterExecutionModel(workspaceItems, connections);
  const { materialInputs, materialOutputs } = collectFormulaMaterials(workspaceItems);
  const formulaParameters =
    executionModel.formulaParameters.length > 0
      ? executionModel.formulaParameters
      : normalizeLegacyFormulaParameters(config.formulaParameters);

  return {
    listHeader: {
      id: config.listHeaderId,
      createDate: config.listHeaderCreateDate,
    },
    description: config.batchInfoDescription,
    masterRecipe: {
      id: config.masterRecipeId,
      version: config.masterRecipeVersion,
      versionDate: config.masterRecipeVersionDate,
      description: config.masterRecipeDescription,
      header: {
        productId: config.productId,
        productName: config.productName,
      },
      equipmentRequirement: buildEquipmentRequirements(config),
      formula: {
        parameter: formulaParameters,
        material: [
          ...materialInputs.map((material) => ({
            ...material,
            "b2mml:MaterialType": "Input",
          })),
          ...materialOutputs.map((material) => ({
            ...material,
            "b2mml:MaterialType": "Output",
          })),
        ],
        description:
          "Formula defines the Inputs, Intermediates, Outputs and Parameters of the Master Recipe",
      },
      procedureLogic: {
        step: executionModel.steps,
        transition: executionModel.transitions,
        link: executionModel.links,
      },
      recipeElement: executionModel.recipeElements,
    },
    equipmentElement: executionModel.equipmentElements,
  };
}
