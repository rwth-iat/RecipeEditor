import {
  cleanConditionGroup,
  stringifyConditionGroup,
} from "../conditions/conditionGroupUtils";

function topologicallySortRecipeElementIds(recipeElements, logicalConnections) {
  const adjacencyList = new Map();
  const inDegree = new Map();

  recipeElements.forEach((item) => {
    adjacencyList.set(item.id, []);
    inDegree.set(item.id, 0);
  });

  logicalConnections.forEach((connection) => {
    const sourceId = connection.sourceId;
    const targetId = connection.targetId;
    if (adjacencyList.has(sourceId) && adjacencyList.has(targetId)) {
      adjacencyList.get(sourceId).push(targetId);
      inDegree.set(targetId, inDegree.get(targetId) + 1);
    }
  });

  const sortedIds = [];
  const queue = [];
  inDegree.forEach((degree, itemId) => {
    if (degree === 0) {
      queue.push(itemId);
    }
  });

  while (queue.length > 0) {
    const currentId = queue.shift();
    sortedIds.push(currentId);

    adjacencyList.get(currentId).forEach((neighborId) => {
      inDegree.set(neighborId, inDegree.get(neighborId) - 1);
      if (inDegree.get(neighborId) === 0) {
        queue.push(neighborId);
      }
    });
  }

  inDegree.forEach((degree, itemId) => {
    if (degree > 0 && !sortedIds.includes(itemId)) {
      sortedIds.push(itemId);
    }
  });

  return sortedIds;
}

function buildTransitionCondition(targetItem) {
  if (
    targetItem &&
    targetItem.conditionGroup &&
    targetItem.conditionGroup.children &&
    targetItem.conditionGroup.children.length > 0
  ) {
    const cleanedGroup = cleanConditionGroup(targetItem.conditionGroup);
    return cleanedGroup ? stringifyConditionGroup(cleanedGroup) : "True";
  }

  if (Array.isArray(targetItem?.conditionList) && targetItem.conditionList.length > 0) {
    return targetItem.conditionList
      .map((condition, index) => {
        let conditionString = `${condition.keyword} ${condition.operator} ${condition.value}`;
        if (condition.instance) {
          conditionString = `${condition.instance}: ${conditionString}`;
        }
        if (
          condition.binaryOperator &&
          index < targetItem.conditionList.length - 1
        ) {
          conditionString += ` ${condition.binaryOperator}`;
        }
        return conditionString;
      })
      .join(" ");
  }

  return "True";
}

export function buildProcedureLogic(workspaceItems, connections) {
  const recipeElements = workspaceItems.filter(
    (item) =>
      item.type === "process" ||
      item.type === "procedure" ||
      item.type === "recipe_element"
  );

  const logicalConnections = (connections || []).filter(
    (connection) => connection.isTransition
  );

  const elementUseCount = {};
  recipeElements.forEach((item) => {
    elementUseCount[item.id] = (elementUseCount[item.id] || 0) + 1;
  });

  const elementPrefixCount = {};
  const elementToPrefixedId = new Map();
  recipeElements.forEach((item) => {
    elementPrefixCount[item.id] = (elementPrefixCount[item.id] || 0) + 1;
    const prefix =
      elementUseCount[item.id] > 1
        ? `${String(elementPrefixCount[item.id]).padStart(3, "0")}:`
        : "";
    elementToPrefixedId.set(item, `${prefix}${item.id}`);
  });

  const sortedStepIds = topologicallySortRecipeElementIds(
    recipeElements,
    logicalConnections
  );

  const steps = sortedStepIds
    .map((itemId, index) => {
      const item = recipeElements.find((candidate) => candidate.id === itemId);
      if (!item) {
        return null;
      }
      const prefixedId = elementToPrefixedId.get(item);
      return {
        "b2mml:ID": `S${index + 1}`,
        "b2mml:RecipeElementID": prefixedId,
        "b2mml:RecipeElementVersion": "",
        "b2mml:Description":
          item.description ||
          `${prefixedId}: ${
            item.equipmentInfo?.equipment_data?.service_info?.name ||
            item.equipmentInfo?.service ||
            item.recipeElementType ||
            "Process"
          }`,
      };
    })
    .filter(Boolean);

  const transitions = logicalConnections.map((connection, index) => {
    const targetItem = workspaceItems.find(
      (item) => item.id === connection.targetId
    );
    return {
      "b2mml:ID": `T${index + 1}`,
      "b2mml:Condition": buildTransitionCondition(targetItem),
    };
  });

  const links = logicalConnections.map((connection, index) => {
    const sourceItem = workspaceItems.find((item) => item.id === connection.sourceId);
    const targetItem = workspaceItems.find((item) => item.id === connection.targetId);
    const sourceRecipeElementId = sourceItem
      ? elementToPrefixedId.get(sourceItem)
      : null;
    const targetRecipeElementId = targetItem
      ? elementToPrefixedId.get(targetItem)
      : null;
    const sourceStepIndex = steps.findIndex(
      (step) => step["b2mml:RecipeElementID"] === sourceRecipeElementId
    );
    const targetStepIndex = steps.findIndex(
      (step) => step["b2mml:RecipeElementID"] === targetRecipeElementId
    );

    const fromType = sourceStepIndex !== -1 ? "Step" : "Transition";
    const toType = targetStepIndex !== -1 ? "Step" : "Transition";
    const fromIdValue =
      sourceStepIndex !== -1 ? `S${sourceStepIndex + 1}` : `T${index + 1}`;
    const toIdValue =
      targetStepIndex !== -1 ? `S${targetStepIndex + 1}` : `T${index + 1}`;

    return {
      "b2mml:ID": `L${index + 1}`,
      "b2mml:FromID": {
        "b2mml:FromIDValue": fromIdValue,
        "b2mml:FromType": fromType,
        "b2mml:IDScope": "External",
      },
      "b2mml:ToID": {
        "b2mml:ToIDValue": toIdValue,
        "b2mml:ToType": toType,
        "b2mml:IDScope": "External",
      },
      "b2mml:LinkType": "ControlLink",
      "b2mml:Depiction": "LineAndArrow",
      "b2mml:EvaluationOrder": "1",
      "b2mml:Description": `Link from ${fromIdValue} to ${toIdValue}`,
    };
  });

  return { step: steps, transition: transitions, link: links };
}
