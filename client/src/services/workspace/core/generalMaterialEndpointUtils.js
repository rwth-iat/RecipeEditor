import { MATERIAL_CONTAINER_TYPE } from "@/services/recipe/general-recipe/materials/materialContainerUtils";

function clampEndpointCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

export function getDesiredMaterialEndpointCounts(materialType) {
  switch (materialType) {
    case "Input":
      return { source: 1, target: 0 };
    case "Intermediate":
      return { source: 1, target: 1 };
    case "Output":
      return { source: 0, target: 1 };
    default:
      return { source: 0, target: 0 };
  }
}

export function reconcileMaterialEndpoints({
  item,
  createSourceEndpoint,
  createTargetEndpoint,
  deleteEndpoint,
}) {
  if (!item || item.type !== MATERIAL_CONTAINER_TYPE) {
    return { changed: false, desired: getDesiredMaterialEndpointCounts(undefined) };
  }

  const desired = getDesiredMaterialEndpointCounts(item.materialType);
  const sourceCount = clampEndpointCount(desired.source);
  const targetCount = clampEndpointCount(desired.target);

  item.sourceEndpoints = Array.isArray(item.sourceEndpoints)
    ? item.sourceEndpoints
    : [];
  item.targetEndpoints = Array.isArray(item.targetEndpoints)
    ? item.targetEndpoints
    : [];

  let changed = false;

  while (item.sourceEndpoints.length > sourceCount) {
    const endpoint = item.sourceEndpoints.pop();
    deleteEndpoint?.(endpoint);
    changed = true;
  }

  while (item.targetEndpoints.length > targetCount) {
    const endpoint = item.targetEndpoints.pop();
    deleteEndpoint?.(endpoint);
    changed = true;
  }

  while (item.sourceEndpoints.length < sourceCount) {
    const endpoint = createSourceEndpoint?.();
    if (!endpoint) {
      break;
    }
    item.sourceEndpoints.push(endpoint);
    changed = true;
  }

  while (item.targetEndpoints.length < targetCount) {
    const endpoint = createTargetEndpoint?.();
    if (!endpoint) {
      break;
    }
    item.targetEndpoints.push(endpoint);
    changed = true;
  }

  return {
    changed,
    desired: {
      source: sourceCount,
      target: targetCount,
    },
  };
}
