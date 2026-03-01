import {
  createValueTypeList,
  isNonEmptyString,
} from "../../common/value-type/valueTypeHelpers";
import { createMaterialsCollection } from "./materialBuilder";

function createProcedureChartElement(item) {
  return {
    "b2mml:ID": item.id,
    "b2mml:Description": [item.description],
  };
}

function createProcessElementParameter(item) {
  const descriptions = Array.isArray(item.description)
    ? item.description.filter(isNonEmptyString).map((value) => value.trim())
    : isNonEmptyString(item.description)
      ? [item.description.trim()]
      : undefined;

  return {
    "b2mml:ID": item.id,
    "b2mml:Description": descriptions,
    "b2mml:Value": createValueTypeList(item.value),
  };
}

function createOtherInformation(item) {
  const descriptions = Array.isArray(item.description)
    ? item.description.filter(isNonEmptyString).map((value) => value.trim())
    : isNonEmptyString(item.description)
      ? [item.description.trim()]
      : undefined;

  return {
    "b2mml:OtherInfoID": item.otherInfoID,
    "b2mml:Description": descriptions,
    "b2mml:OtherValue": createValueTypeList(item.otherValue),
  };
}

function createResourceConstraint(item) {
  const descriptions = Array.isArray(item.description)
    ? item.description.filter(isNonEmptyString).map((value) => value.trim())
    : isNonEmptyString(item.description)
      ? [item.description.trim()]
      : undefined;

  return {
    "b2mml:ConstraintID": item.constraintID,
    "b2mml:Description": descriptions,
    "b2mml:LifeCycleState": {},
    "b2mml:Range": createValueTypeList(item.range),
  };
}

export function createProcessElementType(item, workspaceItems, connections) {
  const processElement = {
    "b2mml:ID": item.id,
    "b2mml:Description": [item.description],
    "b2mml:ProcessElementType": item.processElementType,
    "b2mml:Materials": [],
    "b2mml:DirectedLink": [],
    "b2mml:ProcedureChartElement": [],
    "b2mml:ProcessElement": [],
    "b2mml:ProcessElementParameter": [],
    "b2mml:ResourceConstraint": [],
    "b2mml:OtherInformation": [],
  };

  if (item.processElementParameter) {
    item.processElementParameter.forEach((parameter) => {
      processElement["b2mml:ProcessElementParameter"].push(
        createProcessElementParameter(parameter)
      );
    });
  }

  processElement["b2mml:Materials"].push(
    createMaterialsCollection(
      workspaceItems,
      `${item.id}InputMaterials`,
      `Input Materials of Process${item.id}`,
      "Input"
    )
  );
  processElement["b2mml:Materials"].push(
    createMaterialsCollection(
      workspaceItems,
      `${item.id}IntermediateMaterials`,
      `Intermediate Materials of Process${item.id}`,
      "Intermediate"
    )
  );
  processElement["b2mml:Materials"].push(
    createMaterialsCollection(
      workspaceItems,
      `${item.id}OutputMaterials`,
      `Output Materials of Process${item.id}`,
      "Output"
    )
  );

  for (const connectionId in connections) {
    const connection = connections[connectionId];
    processElement["b2mml:DirectedLink"].push({
      "b2mml:ID": connectionId,
      "b2mml:Description": [],
      "b2mml:FromID": connection.sourceId,
      "b2mml:ToID": connection.targetId,
    });
  }

  workspaceItems.forEach((childItem) => {
    if (childItem.type === "process" || childItem.type === "procedure") {
      const childWorkspaceItems = [];
      if (childItem.materials) {
        childWorkspaceItems.push(...childItem.materials);
      }
      if (childItem.processElement) {
        childWorkspaceItems.push(...childItem.processElement);
      }
      if (childItem.procedureChartElement) {
        childWorkspaceItems.push(...childItem.procedureChartElement);
      }

      processElement["b2mml:ProcessElement"].push(
        createProcessElementType(
          childItem,
          childWorkspaceItems,
          childItem.directedLink || {}
        )
      );
    }
  });

  if (item.otherInformation !== undefined) {
    for (const otherInformation of item.otherInformation) {
      processElement["b2mml:OtherInformation"].push(
        createOtherInformation(otherInformation)
      );
    }
  }

  if (item.resourceConstraint !== undefined) {
    for (const resourceConstraint of item.resourceConstraint) {
      processElement["b2mml:ResourceConstraint"].push(
        createResourceConstraint(resourceConstraint)
      );
    }
  }

  workspaceItems.forEach((childItem) => {
    if (childItem.type === "chart_element") {
      processElement["b2mml:ProcedureChartElement"].push(
        createProcedureChartElement(childItem)
      );
    }
  });

  return processElement;
}
