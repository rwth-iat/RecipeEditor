import {
  cleanConditionGroup,
  stringifyConditionGroup,
} from "../conditions/conditionGroupUtils";

const BEGIN_RECIPE_TYPE = "Begin";
const END_RECIPE_TYPE = "End";
const CONDITION_RECIPE_TYPE = "Condition";

const recipeElementTypeMap = {
  "Recipe Procedure Containing Lower Level PFC": "Procedure",
  "Recipe Unit Procedure Containing Lower Level PFC": "UnitProcedure",
  "Recipe Operation Containing Lower Level PFC": "Operation",
  "Recipe Procedure Referencing Equipment Procedure": "Procedure",
  "Recipe Unit Procedure Referencing Equipment Unit Procedure": "UnitProcedure",
  "Recipe Operation Referencing Equipment Operation": "Operation",
  "Recipe Phase Referencing Equipment Phase": "Phase",
  Procedure: "Procedure",
  UnitProcedure: "UnitProcedure",
  Operation: "Operation",
  Phase: "Phase",
};

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

function asArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function stripExecutionPrefix(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/^\d{3}:/, "").trim();
}

function getTextValue(value) {
  if (Array.isArray(value)) {
    const firstNonEmptyValue = value.find(
      (entry) => typeof getTextValue(entry) === "string" && getTextValue(entry).trim()
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

export function getMasterItemDescriptionText(item) {
  const descriptionText = getTextValue(item?.description).trim();
  if (descriptionText) {
    return descriptionText;
  }
  if (typeof item?.name === "string" && item.name.trim()) {
    return item.name.trim();
  }
  if (typeof item?.id === "string" && item.id.trim()) {
    return item.id.trim();
  }
  return "";
}

function isConditionItem(item) {
  return (
    item?.type === "recipe_element" &&
    item.recipeElementType === CONDITION_RECIPE_TYPE
  );
}

function isBeginItem(item) {
  return (
    item?.type === "recipe_element" &&
    item.recipeElementType === BEGIN_RECIPE_TYPE
  );
}

function isEndItem(item) {
  return (
    item?.type === "recipe_element" &&
    item.recipeElementType === END_RECIPE_TYPE
  );
}

function isProcedureItem(item) {
  return item?.type === "procedure";
}

function isExecutableStepItem(item) {
  return isProcedureItem(item) || isBeginItem(item) || isEndItem(item);
}

function dedupeConnections(connections) {
  const seen = new Set();
  return (Array.isArray(connections) ? connections : []).filter((connection) => {
    const sourceId = connection?.sourceId || "";
    const targetId = connection?.targetId || "";
    if (!sourceId || !targetId) {
      return false;
    }
    const key = `${sourceId}|${targetId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function topologicalSort(nodeKeys, edges) {
  const adjacency = new Map();
  const inDegree = new Map();

  nodeKeys.forEach((nodeKey) => {
    adjacency.set(nodeKey, []);
    inDegree.set(nodeKey, 0);
  });

  edges.forEach((edge) => {
    if (!adjacency.has(edge.from) || !adjacency.has(edge.to)) {
      return;
    }
    adjacency.get(edge.from).push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
  });

  const queue = [];
  nodeKeys.forEach((nodeKey) => {
    if ((inDegree.get(nodeKey) || 0) === 0) {
      queue.push(nodeKey);
    }
  });

  const sorted = [];
  while (queue.length > 0) {
    const currentNode = queue.shift();
    sorted.push(currentNode);

    adjacency.get(currentNode).forEach((neighborKey) => {
      inDegree.set(neighborKey, inDegree.get(neighborKey) - 1);
      if (inDegree.get(neighborKey) === 0) {
        queue.push(neighborKey);
      }
    });
  }

  nodeKeys.forEach((nodeKey) => {
    if (!sorted.includes(nodeKey)) {
      sorted.push(nodeKey);
    }
  });

  return sorted;
}

function resolveEquipmentData(item) {
  return item?.equipmentInfo?.equipment_data || null;
}

function resolveTechnicalProcedureId(item) {
  const equipmentData = resolveEquipmentData(item);
  return (
    equipmentData?.procedure_info?.id ||
    item?.procId ||
    item?.id ||
    ""
  );
}

function resolveActualEquipmentId(item) {
  const equipmentData = resolveEquipmentData(item);
  return (
    equipmentData?.service_info?.id ||
    equipmentData?.aas_id ||
    item?.serviceId ||
    item?.equipmentInfo?.instance ||
    item?.id ||
    ""
  );
}

function resolveProcedureType(item) {
  return (
    recipeElementTypeMap[item?.processElementType] ||
    recipeElementTypeMap[item?.recipeElementType] ||
    "Procedure"
  );
}

function resolveProcedureStepLabel(item) {
  const explicitDescription = stripExecutionPrefix(getMasterItemDescriptionText(item));
  if (explicitDescription) {
    return explicitDescription;
  }

  const equipmentData = resolveEquipmentData(item);
  const serviceName = equipmentData?.service_info?.name || item?.serviceId || "";
  const procedureName =
    equipmentData?.procedure_info?.name ||
    item?.name ||
    resolveTechnicalProcedureId(item);

  if (serviceName && procedureName) {
    return `${serviceName}:${procedureName}`;
  }

  return procedureName || item?.id || "Procedure";
}

function resolveRecipeElementDescription(item) {
  const equipmentData = resolveEquipmentData(item);
  if (
    typeof equipmentData?.recipe_element_description === "string" &&
    equipmentData.recipe_element_description.trim()
  ) {
    return equipmentData.recipe_element_description.trim();
  }
  if (
    typeof equipmentData?.procedure_info?.name === "string" &&
    equipmentData.procedure_info.name.trim()
  ) {
    const serviceName = equipmentData?.service_info?.name;
    if (serviceName) {
      return `${serviceName}:${equipmentData.procedure_info.name}`;
    }
    return equipmentData.procedure_info.name;
  }
  return stripExecutionPrefix(getMasterItemDescriptionText(item));
}

function normalizeBatchValue(parameter, actualValue) {
  const resolvedValue =
    actualValue !== undefined && actualValue !== null && actualValue !== ""
      ? actualValue
      : parameter?.default ?? parameter?.value ?? parameter?.valueString ?? "";

  return {
    "b2mml:ValueString": String(resolvedValue),
    "b2mml:DataInterpretation":
      parameter?.dataInterpretation || "Constant",
    "b2mml:DataType": normalizeBatchDataType(
      parameter?.dataType ||
        parameter?.paramElem?.Type ||
        parameter?.parameterDataType,
      Boolean(parameter?.unit || parameter?.unitOfMeasure)
    ),
    "b2mml:UnitOfMeasure": parameter?.unit || parameter?.unitOfMeasure || "seconds",
  };
}

function resolveWorkspaceParameterValue(parameterList, idCandidates, fallbackValue) {
  if (!Array.isArray(parameterList) || !idCandidates.length) {
    return fallbackValue;
  }

  const workspaceParam = parameterList.find((parameter) =>
    idCandidates.includes(parameter?.id)
  );

  if (!workspaceParam || workspaceParam.value === undefined) {
    return fallbackValue;
  }

  const { value } = workspaceParam;
  if (Array.isArray(value) && value.length > 0) {
    return value[0]?.valueString ?? value[0];
  }
  if (value && typeof value === "object" && value.valueString !== undefined) {
    return value.valueString;
  }
  return value;
}

function mapParameterRecord(parameter, item) {
  const technicalId = String(parameter?.id || "");
  if (!technicalId) {
    return null;
  }

  const actualValue = resolveWorkspaceParameterValue(
    item?.processElementParameter,
    [technicalId, parameter?.name, parameter?.description].filter(Boolean),
    parameter?.default ?? parameter?.value
  );

  return {
    technicalId,
    description:
      parameter?.description ||
      parameter?.name ||
      technicalId,
    parameterType: parameter?.parameterType || "ProcessParameter",
    parameterSubType:
      parameter?.paramElem?.Type ||
      parameter?.subType ||
      parameter?.parameterSubType ||
      "ST",
    value: normalizeBatchValue(parameter, actualValue),
  };
}

function extractProcedureParameters(item) {
  const equipmentData = resolveEquipmentData(item);
  if (Array.isArray(equipmentData?.recipe_parameters)) {
    return equipmentData.recipe_parameters
      .map((parameter) => mapParameterRecord(parameter, item))
      .filter(Boolean);
  }

  if (Array.isArray(equipmentData?.properties)) {
    return equipmentData.properties
      .map((parameter) =>
        mapParameterRecord(
          {
            id: parameter?.id,
            description: parameter?.name || parameter?.description || parameter?.id,
            value: parameter?.value,
            dataType: parameter?.dataType || parameter?.data_type,
            unit: parameter?.unit,
            parameterSubType: parameter?.parameterSubType,
          },
          item
        )
      )
      .filter(Boolean);
  }

  if (Array.isArray(item?.equipmentInfo?.parameters)) {
    return item.equipmentInfo.parameters
      .map((parameter) => mapParameterRecord(parameter, item))
      .filter(Boolean);
  }

  if (Array.isArray(item?.params)) {
    return item.params
      .map((parameter) => mapParameterRecord(parameter, item))
      .filter(Boolean);
  }

  return [];
}

function extractEquipmentRequirements(item) {
  const equipmentData = resolveEquipmentData(item);
  if (Array.isArray(equipmentData?.equipment_requirements)) {
    return equipmentData.equipment_requirements
      .filter((requirement) => requirement?.id)
      .map((requirement) => ({
        "b2mml:ID": requirement.id,
        "b2mml:Description":
          requirement.description ||
          `Equipment requirement for ${resolveActualEquipmentId(item)}`,
      }));
  }

  if (item?.equipmentInfo?.requirement?.id) {
    return [
      {
        "b2mml:ID": item.equipmentInfo.requirement.id,
        "b2mml:Description":
          item.equipmentInfo.requirement.description ||
          `Equipment requirement for ${resolveActualEquipmentId(item)}`,
      },
    ];
  }

  return [];
}

function createProcedureStepNode(item) {
  return {
    workspaceId: item.id,
    nodeKind: "step",
    stepKind: "procedure",
    item,
    technicalProcedureId: resolveTechnicalProcedureId(item),
    actualEquipmentId: resolveActualEquipmentId(item),
    recipeElementType: resolveProcedureType(item),
    stepBaseLabel: resolveProcedureStepLabel(item),
    recipeElementDescription: resolveRecipeElementDescription(item),
    equipmentRequirement: extractEquipmentRequirements(item),
    parameters: extractProcedureParameters(item),
  };
}

function createBeginStepNode(item) {
  return {
    workspaceId: item.id,
    nodeKind: "step",
    stepKind: "begin",
    item,
    technicalProcedureId: "Init",
    actualEquipmentId: "",
    recipeElementType: "Begin",
    stepBaseLabel: "Init",
    recipeElementDescription: "Init",
    equipmentRequirement: [],
    parameters: [],
  };
}

function createEndStepNode(item) {
  return {
    workspaceId: item.id,
    nodeKind: "step",
    stepKind: "end",
    item,
    technicalProcedureId: "End",
    actualEquipmentId: "",
    recipeElementType: "End",
    stepBaseLabel: "End",
    recipeElementDescription: "End",
    equipmentRequirement: [],
    parameters: [],
  };
}

function buildTransitionCondition(item, resolveStepLabel) {
  const cleanedGroup = cleanConditionGroup(item?.conditionGroup);
  if (cleanedGroup) {
    return (
      stringifyConditionGroup(cleanedGroup, {
        quoteStepInstance: false,
        resolveStepLabel,
      }) || "True"
    );
  }

  if (Array.isArray(item?.conditionList) && item.conditionList.length > 0) {
    const conditionText = item.conditionList
      .map((condition) => {
        if (!condition?.keyword) {
          return "";
        }
        if (condition.keyword === "Step") {
          const resolvedStepLabel = resolveStepLabel(condition.instance || "");
          return `Step ${resolvedStepLabel} is Completed`;
        }
        const parts = [
          condition.keyword,
          condition.instance,
          condition.operator,
          condition.value,
        ].filter(Boolean);
        return parts.join(" ");
      })
      .filter(Boolean)
      .join(" AND ");

    return conditionText || "True";
  }

  return "True";
}

function buildLinkDescription(fromId, toId) {
  return `Link from ${fromId} to ${toId}`;
}

function collectEquipmentConnections(procedureNodesByEquipmentId) {
  const connections = [];
  const seen = new Set();

  procedureNodesByEquipmentId.forEach((procedureNodes, equipmentId) => {
    procedureNodes.forEach((procedureNode) => {
      const equipmentData = resolveEquipmentData(procedureNode.item);
      const nextEquipmentId = equipmentData?.next_equipment;
      const previousEquipmentId = equipmentData?.previous_equipment;

      const candidateConnections = [
        nextEquipmentId
          ? {
              "b2mml:ID": `EquipmentConnection${equipmentId}To${nextEquipmentId}`,
              "b2mml:Description": `Material transfer from ${equipmentId} to ${nextEquipmentId}`,
              "b2mml:ConnectionType": "MaterialMovement",
              "b2mml:FromEquipmentID": equipmentId,
              "b2mml:ToEquipmentID": nextEquipmentId,
            }
          : null,
        previousEquipmentId
          ? {
              "b2mml:ID": `EquipmentConnection${previousEquipmentId}To${equipmentId}`,
              "b2mml:Description": `Material transfer from ${previousEquipmentId} to ${equipmentId}`,
              "b2mml:ConnectionType": "MaterialMovement",
              "b2mml:FromEquipmentID": previousEquipmentId,
              "b2mml:ToEquipmentID": equipmentId,
            }
          : null,
      ].filter(Boolean);

      candidateConnections.forEach((connection) => {
        const key = `${connection["b2mml:FromEquipmentID"]}|${connection["b2mml:ToEquipmentID"]}`;
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        connections.push(connection);
      });
    });
  });

  return connections;
}

function buildEquipmentElementsFromProcedureNodes(procedureNodes) {
  const procedureNodesByEquipmentId = new Map();
  procedureNodes.forEach((procedureNode) => {
    const equipmentId = procedureNode.actualEquipmentId;
    if (!equipmentId) {
      return;
    }
    if (!procedureNodesByEquipmentId.has(equipmentId)) {
      procedureNodesByEquipmentId.set(equipmentId, []);
    }
    procedureNodesByEquipmentId.get(equipmentId).push(procedureNode);
  });

  const equipmentConnections = collectEquipmentConnections(procedureNodesByEquipmentId);

  return Array.from(procedureNodesByEquipmentId.entries()).map(
    ([equipmentId, nodesForEquipment]) => {
      const firstNode = nodesForEquipment[0];
      const equipmentData = resolveEquipmentData(firstNode.item);
      const serviceName =
        equipmentData?.service_info?.name || equipmentId;

      const proceduralElementGroups = new Map();
      nodesForEquipment.forEach((procedureNode) => {
        const key = procedureNode.technicalProcedureId;
        if (!proceduralElementGroups.has(key)) {
          proceduralElementGroups.set(key, procedureNode);
        }
      });

      return {
        "b2mml:ID": equipmentId,
        "b2mml:Description": `${serviceName} instance`,
        "b2mml:EquipmentElementType": "Other",
        "b2mml:EquipmentElementLevel": "EquipmentModule",
        "b2mml:EquipmentProceduralElement": Array.from(
          proceduralElementGroups.values()
        ).map((procedureNode) => ({
          "b2mml:ID": procedureNode.technicalProcedureId,
          "b2mml:Description": procedureNode.recipeElementDescription,
          "b2mml:EquipmentProceduralElementType":
            procedureNode.recipeElementType,
          "b2mml:Parameter": procedureNode.parameters.map((parameter) => ({
            "b2mml:ID": parameter.technicalId,
            "b2mml:Description": parameter.description,
            "b2mml:ParameterType": parameter.parameterType,
            "b2mml:ParameterSubType": parameter.parameterSubType,
            "b2mml:Value": parameter.value,
          })),
        })),
        "b2mml:EquipmentConnection": equipmentConnections.filter(
          (connection) =>
            connection["b2mml:FromEquipmentID"] === equipmentId ||
            connection["b2mml:ToEquipmentID"] === equipmentId
        ),
      };
    }
  );
}

export function buildMasterExecutionModel(workspaceItems, connections) {
  const relevantItems = (Array.isArray(workspaceItems) ? workspaceItems : []).filter(
    (item) => isExecutableStepItem(item) || isConditionItem(item)
  );

  const itemById = new Map(
    relevantItems.map((item) => [item.id, item])
  );
  const itemNodeMetadata = new Map();
  const nodeKeys = [];

  relevantItems.forEach((item) => {
    const nodeKey = `item:${item.id}`;
    nodeKeys.push(nodeKey);

    if (isProcedureItem(item)) {
      itemNodeMetadata.set(nodeKey, createProcedureStepNode(item));
      return;
    }

    if (isBeginItem(item)) {
      itemNodeMetadata.set(nodeKey, createBeginStepNode(item));
      return;
    }

    if (isEndItem(item)) {
      itemNodeMetadata.set(nodeKey, createEndStepNode(item));
      return;
    }

    if (isConditionItem(item)) {
      itemNodeMetadata.set(nodeKey, {
        workspaceId: item.id,
        nodeKind: "transition",
        transitionKind: "explicit",
        item,
      });
    }
  });

  const expandedEdges = [];
  let implicitTransitionCount = 0;

  dedupeConnections(connections).forEach((connection) => {
    const sourceItem = itemById.get(connection.sourceId);
    const targetItem = itemById.get(connection.targetId);

    if (!sourceItem || !targetItem) {
      return;
    }

    if (isExecutableStepItem(sourceItem) && isExecutableStepItem(targetItem)) {
      implicitTransitionCount += 1;
      const implicitKey = `implicit:${implicitTransitionCount}`;
      nodeKeys.push(implicitKey);
      itemNodeMetadata.set(implicitKey, {
        nodeKind: "transition",
        transitionKind: "implicit",
        workspaceId: implicitKey,
        item: null,
      });
      expandedEdges.push(
        { from: `item:${sourceItem.id}`, to: implicitKey },
        { from: implicitKey, to: `item:${targetItem.id}` }
      );
      return;
    }

    if (
      (isExecutableStepItem(sourceItem) && isConditionItem(targetItem)) ||
      (isConditionItem(sourceItem) && isExecutableStepItem(targetItem))
    ) {
      expandedEdges.push({
        from: `item:${sourceItem.id}`,
        to: `item:${targetItem.id}`,
      });
    }
  });

  const sortedNodeKeys = topologicalSort(nodeKeys, expandedEdges);
  const orderedStepNodeKeys = sortedNodeKeys.filter(
    (nodeKey) => itemNodeMetadata.get(nodeKey)?.nodeKind === "step"
  );
  const orderedTransitionNodeKeys = sortedNodeKeys.filter(
    (nodeKey) => itemNodeMetadata.get(nodeKey)?.nodeKind === "transition"
  );

  const procedureNodeKeys = orderedStepNodeKeys.filter(
    (nodeKey) => itemNodeMetadata.get(nodeKey)?.stepKind === "procedure"
  );
  const procedurePrefixByWorkspaceId = new Map();
  procedureNodeKeys.forEach((nodeKey, index) => {
    const stepNode = itemNodeMetadata.get(nodeKey);
    procedurePrefixByWorkspaceId.set(
      stepNode.workspaceId,
      String(index + 1).padStart(3, "0")
    );
  });

  const stepDescriptionByWorkspaceId = new Map();
  const stepIdByNodeKey = new Map();
  const transitionIdByNodeKey = new Map();

  const steps = orderedStepNodeKeys.map((nodeKey, index) => {
    const stepNode = itemNodeMetadata.get(nodeKey);
    const stepId = `S${index + 1}`;
    stepIdByNodeKey.set(nodeKey, stepId);

    if (stepNode.stepKind === "begin") {
      stepDescriptionByWorkspaceId.set(stepNode.workspaceId, "Init");
      return {
        "b2mml:ID": stepId,
        "b2mml:RecipeElementID": "Init",
        "b2mml:RecipeElementVersion": "",
        "b2mml:Description": "Init",
      };
    }

    if (stepNode.stepKind === "end") {
      stepDescriptionByWorkspaceId.set(stepNode.workspaceId, "End");
      return {
        "b2mml:ID": stepId,
        "b2mml:RecipeElementID": "End",
        "b2mml:RecipeElementVersion": "",
        "b2mml:Description": "End",
      };
    }

    const prefix = procedurePrefixByWorkspaceId.get(stepNode.workspaceId);
    const recipeElementId = `${prefix}:${stepNode.technicalProcedureId}`;
    const stepDescription = `${prefix}:${stepNode.stepBaseLabel}`;
    stepDescriptionByWorkspaceId.set(stepNode.workspaceId, stepDescription);

    return {
      "b2mml:ID": stepId,
      "b2mml:RecipeElementID": recipeElementId,
      "b2mml:RecipeElementVersion": "",
      "b2mml:Description": stepDescription,
    };
  });

  orderedTransitionNodeKeys.forEach((nodeKey, index) => {
    transitionIdByNodeKey.set(nodeKey, `T${index + 1}`);
  });

  const resolveStepLabel = (workspaceId) =>
    stepDescriptionByWorkspaceId.get(workspaceId) || workspaceId || "";

  const transitions = orderedTransitionNodeKeys.map((nodeKey) => {
    const transitionNode = itemNodeMetadata.get(nodeKey);
    const transitionId = transitionIdByNodeKey.get(nodeKey);
    const condition =
      transitionNode.transitionKind === "implicit"
        ? "True"
        : buildTransitionCondition(transitionNode.item, resolveStepLabel);

    return {
      "b2mml:ID": transitionId,
      "b2mml:Condition": condition,
      "b2mml:Description":
        condition === "True" ? "True transition" : condition,
    };
  });

  const links = expandedEdges.map((edge, index) => {
    const fromNode = itemNodeMetadata.get(edge.from);
    const toNode = itemNodeMetadata.get(edge.to);
    const fromId =
      fromNode.nodeKind === "step"
        ? stepIdByNodeKey.get(edge.from)
        : transitionIdByNodeKey.get(edge.from);
    const toId =
      toNode.nodeKind === "step"
        ? stepIdByNodeKey.get(edge.to)
        : transitionIdByNodeKey.get(edge.to);

    return {
      "b2mml:ID": `L${index + 1}`,
      "b2mml:FromID": {
        "b2mml:FromIDValue": fromId,
        "b2mml:FromType": fromNode.nodeKind === "step" ? "Step" : "Transition",
        "b2mml:IDScope": "External",
      },
      "b2mml:ToID": {
        "b2mml:ToIDValue": toId,
        "b2mml:ToType": toNode.nodeKind === "step" ? "Step" : "Transition",
        "b2mml:IDScope": "External",
      },
      "b2mml:LinkType": "ControlLink",
      "b2mml:Depiction": "LineAndArrow",
      "b2mml:EvaluationOrder": "1",
      "b2mml:Description": buildLinkDescription(fromId, toId),
    };
  });

  const procedureStepNodes = orderedStepNodeKeys
    .map((nodeKey) => itemNodeMetadata.get(nodeKey))
    .filter((node) => node.stepKind === "procedure");

  const recipeElements = [
    orderedStepNodeKeys
      .map((nodeKey) => itemNodeMetadata.get(nodeKey))
      .filter((node) => node.stepKind === "begin")
      .map(() => ({
        "b2mml:ID": "Init",
        "b2mml:Description": "Init",
        "b2mml:RecipeElementType": "Begin",
      })),
    orderedStepNodeKeys
      .map((nodeKey) => itemNodeMetadata.get(nodeKey))
      .filter((node) => node.stepKind === "end")
      .map(() => ({
        "b2mml:ID": "End",
        "b2mml:Description": "End",
        "b2mml:RecipeElementType": "End",
      })),
    procedureStepNodes.map((procedureNode) => {
      const prefix = procedurePrefixByWorkspaceId.get(procedureNode.workspaceId);
      return {
        "b2mml:ID": `${prefix}:${procedureNode.technicalProcedureId}`,
        "b2mml:Description": procedureNode.recipeElementDescription,
        "b2mml:RecipeElementType": procedureNode.recipeElementType,
        "b2mml:ActualEquipmentID": procedureNode.actualEquipmentId,
        "b2mml:EquipmentRequirement": procedureNode.equipmentRequirement,
        "b2mml:Parameter": procedureNode.parameters.map((parameter) => ({
          "b2mml:ID": `${prefix}:${parameter.technicalId}`,
          "b2mml:Description": parameter.description,
          "b2mml:ParameterType": parameter.parameterType,
          "b2mml:ParameterSubType": parameter.parameterSubType,
          "b2mml:Value": parameter.value,
        })),
      };
    }),
  ].flat();

  const formulaParameters = procedureStepNodes.flatMap((procedureNode) => {
    const prefix = procedurePrefixByWorkspaceId.get(procedureNode.workspaceId);
    return procedureNode.parameters.map((parameter) => ({
      "b2mml:ID": `${prefix}:${parameter.technicalId}`,
      "b2mml:Description": `${prefix}:${parameter.description}`,
      "b2mml:ParameterType": parameter.parameterType,
      "b2mml:ParameterSubType": parameter.parameterSubType,
      "b2mml:Value": parameter.value,
    }));
  });

  return {
    procedurePrefixes: procedurePrefixByWorkspaceId,
    stepDescriptions: stepDescriptionByWorkspaceId,
    steps,
    transitions,
    links,
    recipeElements,
    formulaParameters,
    equipmentElements: buildEquipmentElementsFromProcedureNodes(procedureStepNodes),
    hasInstanceFormulaParameters: formulaParameters.length > 0,
  };
}
