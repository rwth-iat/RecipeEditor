import {
  createValueTypeList,
  isNonEmptyString,
} from "../../common/value-type/valueTypeHelpers";
import { createMaterialsCollection } from "./materialBuilder";

function createProcedureChartElement(item) {
  return {
    "b2mml:ID": item.id,
    "b2mml:Description": isNonEmptyString(item.description)
      ? [item.description.trim()]
      : undefined,
    "b2mml:ProcedureChartElementType": item.procedureChartElementType,
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

function createDirectedLink(connection, scopeId, index) {
  const suffix = scopeId || "Root";
  return {
    "b2mml:ID": `DirectedLink_${suffix}_${index + 1}`,
    "b2mml:Description": [],
    "b2mml:FromID": connection.sourceId,
    "b2mml:ToID": connection.targetId,
  };
}

export function createProcessElementType(item, exportState) {
  const scopeId = item?.scopeId !== undefined ? item.scopeId : item?.id ?? null;
  const processElement = {
    "b2mml:ID": item.id,
    "b2mml:Description": isNonEmptyString(item.description)
      ? [item.description.trim()]
      : undefined,
    "b2mml:ProcessElementType": item.processElementType,
    "b2mml:Materials": exportState
      .getMaterialContainers(scopeId)
      .map((container) => createMaterialsCollection(container)),
    "b2mml:DirectedLink": exportState
      .getConnections(scopeId)
      .map((connection, index) => createDirectedLink(connection, scopeId, index)),
    "b2mml:ProcedureChartElement": exportState
      .getChartElements(scopeId)
      .map((chartElement) => createProcedureChartElement(chartElement)),
    "b2mml:ProcessElement": exportState
      .getChildProcesses(scopeId)
      .map((childProcess) => createProcessElementType(childProcess, exportState)),
    "b2mml:ProcessElementParameter": [],
    "b2mml:ResourceConstraint": [],
    "b2mml:OtherInformation": [],
  };

  if (Array.isArray(item.processElementParameter)) {
    item.processElementParameter.forEach((parameter) => {
      processElement["b2mml:ProcessElementParameter"].push(
        createProcessElementParameter(parameter)
      );
    });
  }

  if (Array.isArray(item.otherInformation)) {
    item.otherInformation.forEach((otherInformation) => {
      processElement["b2mml:OtherInformation"].push(
        createOtherInformation(otherInformation)
      );
    });
  }

  if (Array.isArray(item.resourceConstraint)) {
    item.resourceConstraint.forEach((resourceConstraint) => {
      processElement["b2mml:ResourceConstraint"].push(
        createResourceConstraint(resourceConstraint)
      );
    });
  }

  return processElement;
}
