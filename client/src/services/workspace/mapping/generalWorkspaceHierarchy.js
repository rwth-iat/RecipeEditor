import { dedupeConnections } from "../core/connectionUtils";
import {
  isLegacyVisibleMaterialItem,
  isMaterialContainerItem,
  normalizeMaterialContainer,
} from "../../recipe/general-recipe/materials/materialContainerUtils";

function cloneWorkspaceItem(item) {
  if (isMaterialContainerItem(item) || isLegacyVisibleMaterialItem(item)) {
    return normalizeMaterialContainer(item);
  }

  if (item?.type === "process") {
    return {
      ...item,
      materials: Array.isArray(item?.materials) ? [...item.materials] : [],
      processElement: Array.isArray(item?.processElement) ? [...item.processElement] : [],
      procedureChartElement: Array.isArray(item?.procedureChartElement)
        ? [...item.procedureChartElement]
        : [],
      directedLink: Array.isArray(item?.directedLink) ? [...item.directedLink] : [],
    };
  }

  return { ...item };
}

function getScopeChain(itemId, itemsById) {
  const chain = [];
  let currentScopeId = itemsById.get(itemId)?.parentId ?? null;

  while (true) {
    chain.push(currentScopeId ?? null);
    if (currentScopeId == null) {
      break;
    }
    currentScopeId = itemsById.get(currentScopeId)?.parentId ?? null;
  }

  return chain;
}

function resolveConnectionOwner(connection, itemsById) {
  const sourceChain = getScopeChain(connection.sourceId, itemsById);
  const targetScopes = new Set(
    getScopeChain(connection.targetId, itemsById).map((scopeId) => scopeId ?? "__root__")
  );

  for (const scopeId of sourceChain) {
    if (targetScopes.has(scopeId ?? "__root__")) {
      return scopeId ?? null;
    }
  }

  return null;
}

export function buildGeneralWorkspaceHierarchy(items, connections) {
  const orderedItems = Array.isArray(items) ? items : [];
  const dedupedConnections = dedupeConnections(Array.isArray(connections) ? connections : []);
  const itemsById = new Map();
  const rootItems = [];
  const rootConnections = [];

  orderedItems.forEach((item) => {
    if (typeof item?.id === "string" && item.id.length > 0) {
      itemsById.set(item.id, cloneWorkspaceItem(item));
    }
  });

  orderedItems.forEach((item) => {
    const clonedItem = itemsById.get(item?.id);
    if (!clonedItem) {
      return;
    }

    const parentId = clonedItem.parentId ?? null;
    if (parentId === null) {
      rootItems.push(clonedItem);
      return;
    }

    const parent = itemsById.get(parentId);
    if (!parent || parent.type !== "process") {
      rootItems.push(clonedItem);
      return;
    }

    if (clonedItem.type === "process") {
      parent.processElement.push(clonedItem);
      return;
    }

    if (isMaterialContainerItem(clonedItem)) {
      parent.materials.push(clonedItem);
      return;
    }

    if (clonedItem.type === "chart_element") {
      parent.procedureChartElement.push(clonedItem);
      return;
    }

    rootItems.push(clonedItem);
  });

  dedupedConnections.forEach((connection) => {
    const ownerId = resolveConnectionOwner(connection, itemsById);
    if (ownerId === null) {
      rootConnections.push(connection);
      return;
    }

    const owner = itemsById.get(ownerId);
    if (!owner || owner.type !== "process") {
      rootConnections.push(connection);
      return;
    }

    owner.directedLink.push(connection);
  });

  return {
    items: rootItems,
    connections: rootConnections,
  };
}
