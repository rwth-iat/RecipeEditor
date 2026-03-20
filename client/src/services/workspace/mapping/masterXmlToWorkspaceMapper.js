import { dedupeConnections } from "../core/connectionUtils";
import {
  createEmptyConditionGroup,
  parseConditionExpression,
} from "../../recipe/master-recipe/conditions/conditionGroupUtils";

function asArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function getTextValue(value) {
  if (Array.isArray(value)) {
    const firstNonEmptyValue = value.find(
      (entry) => typeof normalizeText(entry) === "string" && normalizeText(entry)
    );
    return getTextValue(firstNonEmptyValue);
  }

  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    if (typeof value["#text"] === "string") {
      return value["#text"];
    }
  }

  return "";
}

function normalizeText(value) {
  return getTextValue(value).trim();
}

function splitPrefixedId(value) {
  const normalizedValue = normalizeText(value);
  const match = normalizedValue.match(/^(\d{3}):(.*)$/);
  if (!match) {
    return {
      prefix: "",
      technicalId: normalizedValue,
    };
  }

  return {
    prefix: match[1],
    technicalId: match[2].trim(),
  };
}

function stripExecutionPrefix(value) {
  return normalizeText(value).replace(/^\d{3}:/, "").trim();
}

function sanitizeWorkspaceId(value, fallback) {
  const normalizedValue = normalizeText(value) || fallback;
  const sanitizedValue = normalizedValue
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9:._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return sanitizedValue || fallback;
}

function createUniqueWorkspaceId(baseValue, fallbackPrefix, seenIds) {
  const baseId = sanitizeWorkspaceId(baseValue, fallbackPrefix);
  if (!seenIds.has(baseId)) {
    seenIds.add(baseId);
    return baseId;
  }

  let index = 2;
  while (seenIds.has(`${baseId}_${index}`)) {
    index += 1;
  }
  const uniqueId = `${baseId}_${index}`;
  seenIds.add(uniqueId);
  return uniqueId;
}

function parseParameterValue(valueNode) {
  if (!valueNode || typeof valueNode !== "object") {
    return {
      valueString: "",
      dataInterpretation: "",
      dataType: "",
      unitOfMeasure: "",
    };
  }

  return {
    valueString: normalizeText(valueNode.ValueString || valueNode.QuantityString),
    dataInterpretation: normalizeText(valueNode.DataInterpretation),
    dataType: normalizeText(valueNode.DataType),
    unitOfMeasure: normalizeText(valueNode.UnitOfMeasure),
  };
}

function parseParameterRecord(parameterNode) {
  const rawId = normalizeText(parameterNode?.ID);
  const { prefix, technicalId } = splitPrefixedId(rawId);
  const value = parseParameterValue(parameterNode?.Value);

  return {
    exactId: rawId,
    prefix,
    technicalId,
    description: stripExecutionPrefix(parameterNode?.Description),
    parameterType: normalizeText(parameterNode?.ParameterType),
    parameterSubType: normalizeText(parameterNode?.ParameterSubType),
    value,
  };
}

function normalizeEquipmentServiceName(equipmentDescription, equipmentId) {
  const description = normalizeText(equipmentDescription);
  if (!description) {
    return equipmentId;
  }
  return (
    description
      .replace(/\s+instance(?:\s+for.*)?$/i, "")
      .trim() || equipmentId
  );
}

function buildEquipmentLibrary(equipmentElements) {
  const equipmentLibrary = new Map();

  asArray(equipmentElements).forEach((equipmentNode) => {
    const equipmentId = normalizeText(equipmentNode?.ID);
    if (!equipmentId) {
      return;
    }

    const serviceName = normalizeEquipmentServiceName(
      equipmentNode?.Description,
      equipmentId
    );
    const procedures = new Map();

    asArray(equipmentNode?.EquipmentProceduralElement).forEach((procedureNode) => {
      const technicalId = normalizeText(procedureNode?.ID);
      if (!technicalId) {
        return;
      }

      const parameters = new Map();
      asArray(procedureNode?.Parameter).forEach((parameterNode) => {
        const parameterRecord = parseParameterRecord(parameterNode);
        if (!parameterRecord.technicalId) {
          return;
        }
        parameters.set(parameterRecord.technicalId, parameterRecord);
      });

      procedures.set(technicalId, {
        technicalId,
        description: normalizeText(procedureNode?.Description),
        equipmentProceduralElementType: normalizeText(
          procedureNode?.EquipmentProceduralElementType
        ),
        parameters,
      });
    });

    equipmentLibrary.set(equipmentId, {
      id: equipmentId,
      description: normalizeText(equipmentNode?.Description),
      serviceName,
      procedures,
    });
  });

  return equipmentLibrary;
}

function buildRecipeElementMap(recipeElements) {
  const recipeElementMap = new Map();

  asArray(recipeElements).forEach((recipeElementNode) => {
    const recipeElementId = normalizeText(recipeElementNode?.ID);
    if (!recipeElementId) {
      return;
    }

    const parameters = new Map();
    asArray(recipeElementNode?.Parameter).forEach((parameterNode) => {
      const parameterRecord = parseParameterRecord(parameterNode);
      if (!parameterRecord.technicalId) {
        return;
      }
      parameters.set(parameterRecord.technicalId, parameterRecord);
    });

    recipeElementMap.set(recipeElementId, {
      id: recipeElementId,
      ...splitPrefixedId(recipeElementId),
      description: normalizeText(recipeElementNode?.Description),
      recipeElementType: normalizeText(recipeElementNode?.RecipeElementType),
      actualEquipmentId: normalizeText(recipeElementNode?.ActualEquipmentID),
      parameters,
      equipmentRequirements: asArray(recipeElementNode?.EquipmentRequirement)
        .map((requirementNode) => ({
          id: normalizeText(requirementNode?.ID),
          description: normalizeText(requirementNode?.Description),
        }))
        .filter((requirement) => requirement.id),
    });
  });

  return recipeElementMap;
}

function buildFormulaParameterMap(formulaNode) {
  const formulaParameterMap = new Map();

  asArray(formulaNode?.Parameter).forEach((parameterNode) => {
    const parameterRecord = parseParameterRecord(parameterNode);
    if (!parameterRecord.exactId) {
      return;
    }
    formulaParameterMap.set(parameterRecord.exactId, parameterRecord);
  });

  return formulaParameterMap;
}

function buildEquipmentRequirementConfig(requirementNodes) {
  return asArray(requirementNodes)
    .map((requirementNode) => ({
      id: normalizeText(requirementNode?.ID),
      constraint: normalizeText(requirementNode?.Constraint?.Condition),
      description: normalizeText(requirementNode?.Description),
    }))
    .filter((requirement) => requirement.id);
}

function createProcessElementParameter(parameterRecord) {
  return {
    id: parameterRecord.technicalId,
    description: parameterRecord.description,
    value: parameterRecord.value.valueString
      ? [
          {
            valueString: parameterRecord.value.valueString,
            dataType: parameterRecord.value.dataType,
            unitOfMeasure: parameterRecord.value.unitOfMeasure,
          },
        ]
      : [],
  };
}

function buildImportedRecipeParameters({
  prefix,
  recipeElementRecord,
  equipmentProcedureRecord,
  formulaParameterMap,
}) {
  const technicalIds = new Set([
    ...Array.from(recipeElementRecord?.parameters?.keys?.() || []),
    ...Array.from(equipmentProcedureRecord?.parameters?.keys?.() || []),
  ]);

  const importedParameters = Array.from(technicalIds)
    .map((technicalId) => {
      const recipeElementParameter = recipeElementRecord?.parameters?.get(technicalId);
      const equipmentParameter = equipmentProcedureRecord?.parameters?.get(technicalId);
      const formulaParameter = formulaParameterMap.get(`${prefix}:${technicalId}`);

      const description =
        recipeElementParameter?.description ||
        equipmentParameter?.description ||
        stripExecutionPrefix(formulaParameter?.description) ||
        technicalId;
      const parameterType =
        recipeElementParameter?.parameterType ||
        formulaParameter?.parameterType ||
        equipmentParameter?.parameterType ||
        "ProcessParameter";
      const parameterSubType =
        recipeElementParameter?.parameterSubType ||
        formulaParameter?.parameterSubType ||
        equipmentParameter?.parameterSubType ||
        "ST";
      const value =
        formulaParameter?.value ||
        recipeElementParameter?.value ||
        equipmentParameter?.value || {
          valueString: "",
          dataInterpretation: "",
          dataType: "",
          unitOfMeasure: "",
        };

      return {
        id: technicalId,
        name: description,
        description,
        default: value.valueString,
        value: value.valueString,
        unit: value.unitOfMeasure,
        dataType: value.dataType,
        dataInterpretation: value.dataInterpretation,
        parameterType,
        parameterSubType,
        paramElem: {
          Type: parameterSubType || "ST",
        },
      };
    })
    .filter((parameter) => parameter.id);

  return importedParameters;
}

function registerStepAlias(stepAliasMap, alias, workspaceId) {
  const normalizedAlias = normalizeText(alias);
  if (!normalizedAlias) {
    return;
  }

  stepAliasMap.set(normalizedAlias, workspaceId);
  stepAliasMap.set(stripExecutionPrefix(normalizedAlias), workspaceId);
}

function getStepAliasResolver(stepAliasMap) {
  return (rawLabel) => {
    const normalizedLabel = normalizeText(rawLabel);
    return (
      stepAliasMap.get(normalizedLabel) ||
      stepAliasMap.get(stripExecutionPrefix(normalizedLabel)) ||
      null
    );
  };
}

function buildLinkEndpointMap(endpointNode, kind) {
  const typeKey = kind == "FromID" ? "FromType" : "ToType";
  const valueKey = kind == "FromID" ? "FromIDValue" : "ToIDValue";
  if (!endpointNode || typeof endpointNode !== "object") {
    return {
      kind: "Step",
      value: "",
    };
  }

  return {
    kind: normalizeText(endpointNode[typeKey]) || "Step",
    value: normalizeText(endpointNode[valueKey]),
  };
}

export function mapMasterXmlTreeToWorkspace(xmlTree) {
  const warnings = [];
  const masterRecipeNode = asArray(xmlTree?.MasterRecipe)[0];

  if (!masterRecipeNode) {
    warnings.push("No MasterRecipe element found in BatchInformation XML.");
    return {
      items: [],
      connections: [],
      config: {
        listHeaderId: "",
        listHeaderCreateDate: "",
        batchInfoDescription: normalizeText(xmlTree?.Description),
        masterRecipeId: "",
        masterRecipeVersion: "",
        masterRecipeVersionDate: "",
        masterRecipeDescription: "",
        productId: "",
        productName: "",
        version: "",
        description: normalizeText(xmlTree?.Description),
        formulaParameters: [],
        equipmentRequirements: [],
      },
      warnings,
    };
  }

  const equipmentLibrary = buildEquipmentLibrary(xmlTree?.EquipmentElement);
  const recipeElementMap = buildRecipeElementMap(masterRecipeNode?.RecipeElement);
  const formulaParameterMap = buildFormulaParameterMap(masterRecipeNode?.Formula);
  const seenWorkspaceIds = new Set();
  const items = [];

  const stepXmlIdToWorkspaceId = new Map();
  const stepAliasMap = new Map();

  asArray(masterRecipeNode?.ProcedureLogic?.Step).forEach((stepNode, index) => {
    const stepXmlId = normalizeText(stepNode?.ID) || `S${index + 1}`;
    const recipeElementId = normalizeText(stepNode?.RecipeElementID);
    const stepDescription = normalizeText(stepNode?.Description);
    const recipeElementRecord = recipeElementMap.get(recipeElementId);
    const { prefix, technicalId } = splitPrefixedId(recipeElementId);
    const stepLabel =
      stripExecutionPrefix(stepDescription) ||
      recipeElementRecord?.description ||
      technicalId ||
      stepXmlId;

    let item = null;
    if (recipeElementId === "Init" || recipeElementRecord?.recipeElementType === "Begin") {
      const workspaceId = createUniqueWorkspaceId("Init", "Init", seenWorkspaceIds);
      item = {
        id: workspaceId,
        name: "Init",
        type: "recipe_element",
        recipeElementType: "Begin",
        description: [stepDescription || "Init"],
        conditionGroup: createEmptyConditionGroup(),
      };
    } else if (
      recipeElementId === "End" ||
      recipeElementRecord?.recipeElementType === "End"
    ) {
      const workspaceId = createUniqueWorkspaceId("End", "End", seenWorkspaceIds);
      item = {
        id: workspaceId,
        name: "End",
        type: "recipe_element",
        recipeElementType: "End",
        description: [stepDescription || "End"],
        conditionGroup: createEmptyConditionGroup(),
      };
    } else {
      const workspaceId = createUniqueWorkspaceId(
        stepDescription || `${prefix}:${technicalId}` || stepXmlId,
        `Step_${index + 1}`,
        seenWorkspaceIds
      );
      const actualEquipmentId =
        recipeElementRecord?.actualEquipmentId || normalizeText(stepNode?.ActualEquipmentID);
      const equipmentRecord = equipmentLibrary.get(actualEquipmentId);
      const equipmentProcedureRecord = equipmentRecord?.procedures?.get(technicalId);
      const importedParameters = buildImportedRecipeParameters({
        prefix,
        recipeElementRecord,
        equipmentProcedureRecord,
        formulaParameterMap,
      });

      item = {
        id: workspaceId,
        name: stepLabel,
        type: "procedure",
        processElementType: "Recipe Procedure Containing Lower Level PFC",
        description: [stepDescription || `${prefix}:${stepLabel}`],
        procId: technicalId,
        serviceId: actualEquipmentId,
        selfCompleting: false,
        params: importedParameters.map((parameter) => ({ ...parameter })),
        processElementParameter: importedParameters.map((parameter) =>
          createProcessElementParameter({
            technicalId: parameter.id,
            description: parameter.description,
            value: {
              valueString: parameter.default,
              dataType: parameter.dataType,
              unitOfMeasure: parameter.unit,
            },
          })
        ),
        equipmentInfo: {
          source_type: "BatchML",
          source_file: "BatchInformation.xml",
          equipment_data: {
            service_info: {
              id: actualEquipmentId,
              name: equipmentRecord?.serviceName || actualEquipmentId,
            },
            procedure_info: {
              id: technicalId,
              name:
                equipmentProcedureRecord?.description ||
                recipeElementRecord?.description ||
                stepLabel,
            },
            recipe_element_description: recipeElementRecord?.description || "",
            recipe_parameters: importedParameters.map((parameter) => ({
              ...parameter,
            })),
            equipment_requirements: (recipeElementRecord?.equipmentRequirements || []).map(
              (requirement) => ({
                id: requirement.id,
                description: requirement.description,
              })
            ),
          },
        },
      };
    }

    items.push(item);
    stepXmlIdToWorkspaceId.set(stepXmlId, item.id);
    registerStepAlias(stepAliasMap, stepDescription, item.id);
    registerStepAlias(stepAliasMap, stepLabel, item.id);
    registerStepAlias(stepAliasMap, recipeElementId, item.id);
    registerStepAlias(stepAliasMap, technicalId, item.id);
  });

  const resolveStepId = getStepAliasResolver(stepAliasMap);
  const transitionXmlIdToWorkspaceId = new Map();

  asArray(masterRecipeNode?.ProcedureLogic?.Transition).forEach(
    (transitionNode, index) => {
      const transitionXmlId =
        normalizeText(transitionNode?.ID) || `T${index + 1}`;
      const conditionExpression = normalizeText(transitionNode?.Condition) || "True";
      const parsedCondition = parseConditionExpression(conditionExpression, {
        resolveStepId,
      });
      warnings.push(
        ...parsedCondition.warnings.map(
          (warning) => `Transition ${transitionXmlId}: ${warning}`
        )
      );

      const workspaceId = createUniqueWorkspaceId(
        transitionXmlId,
        `Condition_${index + 1}`,
        seenWorkspaceIds
      );

      items.push({
        id: workspaceId,
        name: transitionXmlId,
        type: "recipe_element",
        recipeElementType: "Condition",
        description: [normalizeText(transitionNode?.Description) || conditionExpression],
        conditionGroup: parsedCondition.group || createEmptyConditionGroup(),
      });
      transitionXmlIdToWorkspaceId.set(transitionXmlId, workspaceId);
    }
  );

  const connections = [];
  asArray(masterRecipeNode?.ProcedureLogic?.Link).forEach((linkNode, index) => {
    const linkId = normalizeText(linkNode?.ID) || `L${index + 1}`;
    const fromId = buildLinkEndpointMap(linkNode?.FromID, "FromID");
    const toId = buildLinkEndpointMap(linkNode?.ToID, "ToID");

    const sourceId =
      fromId.kind === "Step"
        ? stepXmlIdToWorkspaceId.get(fromId.value)
        : transitionXmlIdToWorkspaceId.get(fromId.value);
    const targetId =
      toId.kind === "Step"
        ? stepXmlIdToWorkspaceId.get(toId.value)
        : transitionXmlIdToWorkspaceId.get(toId.value);

    if (!sourceId || !targetId) {
      warnings.push(
        `Link ${linkId} could not be resolved (${fromId.kind}:${fromId.value} -> ${toId.kind}:${toId.value}).`
      );
      return;
    }

    connections.push({
      sourceId,
      targetId,
    });
  });

  const headerNode = masterRecipeNode?.Header || {};
  const config = {
    listHeaderId: normalizeText(xmlTree?.ListHeader?.ID),
    listHeaderCreateDate: normalizeText(xmlTree?.ListHeader?.CreateDate),
    batchInfoDescription: normalizeText(xmlTree?.Description),
    masterRecipeId: normalizeText(masterRecipeNode?.ID),
    masterRecipeVersion: normalizeText(masterRecipeNode?.Version),
    masterRecipeVersionDate: normalizeText(masterRecipeNode?.VersionDate),
    masterRecipeDescription: normalizeText(masterRecipeNode?.Description),
    productId: normalizeText(headerNode?.ProductID),
    productName: normalizeText(headerNode?.ProductName),
    version: normalizeText(masterRecipeNode?.Version),
    description:
      normalizeText(masterRecipeNode?.Description) ||
      normalizeText(xmlTree?.Description),
    formulaParameters: [],
    equipmentRequirements: buildEquipmentRequirementConfig(
      masterRecipeNode?.EquipmentRequirement
    ),
  };

  return {
    items,
    connections: dedupeConnections(connections),
    config,
    warnings,
  };
}
