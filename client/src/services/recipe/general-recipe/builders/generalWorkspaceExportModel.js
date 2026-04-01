import {
  isLegacyVisibleMaterialItem,
  isMaterialContainerItem,
  normalizeMaterialContainer,
} from "../materials/materialContainerUtils";

function toConnectionList(connections) {
  if (Array.isArray(connections)) {
    return connections;
  }
  if (!connections || typeof connections !== "object") {
    return [];
  }
  return Object.values(connections);
}

function dedupeConnections(connections) {
  const seen = new Set();
  return connections.filter((connection) => {
    const sourceId = connection?.sourceId;
    const targetId = connection?.targetId;
    if (typeof sourceId !== "string" || typeof targetId !== "string") {
      return false;
    }
    const sourcePortId =
      typeof connection?.sourcePortId === "string" ? connection.sourcePortId : "";
    const targetPortId =
      typeof connection?.targetPortId === "string" ? connection.targetPortId : "";
    const key = `${sourceId}::${sourcePortId}::${targetId}::${targetPortId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function pushGrouped(map, key, value) {
  const normalizedKey = key ?? "__root__";
  if (!map.has(normalizedKey)) {
    map.set(normalizedKey, []);
  }
  map.get(normalizedKey).push(value);
}

function getGrouped(map, key) {
  return map.get(key ?? "__root__") || [];
}

function normalizeConnection(connection) {
  if (!connection) {
    return null;
  }

  const sourceId = connection.sourceId ?? connection.FromID ?? connection.fromId;
  const targetId = connection.targetId ?? connection.ToID ?? connection.toId;
  if (typeof sourceId !== "string" || typeof targetId !== "string") {
    return null;
  }

  const normalized = {
    sourceId,
    targetId,
  };

  if (typeof connection?.sourcePortId === "string" && connection.sourcePortId.length > 0) {
    normalized.sourcePortId = connection.sourcePortId;
  }
  if (typeof connection?.targetPortId === "string" && connection.targetPortId.length > 0) {
    normalized.targetPortId = connection.targetPortId;
  }

  return normalized;
}

function collectWorkspaceExportEntries(
  workspaceItems,
  parentId = null,
  flatItems = [],
  collectedConnections = []
) {
  (Array.isArray(workspaceItems) ? workspaceItems : []).forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const normalizedItem = isMaterialContainerItem(item) || isLegacyVisibleMaterialItem(item)
      ? normalizeMaterialContainer(item, {
          parentId: item?.parentId ?? parentId ?? null,
        })
      : {
          ...item,
          parentId: item?.parentId ?? parentId ?? null,
        };

    flatItems.push(normalizedItem);

    if (Array.isArray(item.directedLink) || (item.directedLink && typeof item.directedLink === "object")) {
      toConnectionList(item.directedLink)
        .map((connection) => normalizeConnection(connection))
        .filter(Boolean)
        .forEach((connection) => collectedConnections.push(connection));
    }

    if (item.type === "process") {
      collectWorkspaceExportEntries(item.materials, normalizedItem.id, flatItems, collectedConnections);
      collectWorkspaceExportEntries(
        item.procedureChartElement,
        normalizedItem.id,
        flatItems,
        collectedConnections
      );
      collectWorkspaceExportEntries(item.processElement, normalizedItem.id, flatItems, collectedConnections);
    }
  });

  return { flatItems, collectedConnections };
}

function getScopeChain(itemId, itemsById) {
  const item = itemsById.get(itemId);
  const chain = [];

  let currentScopeId = item?.parentId ?? null;
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
    const normalizedScopeId = scopeId ?? "__root__";
    if (targetScopes.has(normalizedScopeId)) {
      return scopeId ?? null;
    }
  }

  return null;
}

export function buildGeneralRecipeExportState(workspaceItems, rootConnections) {
  const { flatItems, collectedConnections } = collectWorkspaceExportEntries(workspaceItems);
  const itemsById = new Map();

  flatItems.forEach((item) => {
    if (typeof item?.id === "string" && item.id.length > 0) {
      itemsById.set(item.id, item);
    }
  });

  const allConnections = dedupeConnections(
    [...toConnectionList(rootConnections), ...collectedConnections]
      .map((connection) => normalizeConnection(connection))
      .filter(Boolean)
      .filter(
        (connection) =>
          itemsById.has(connection.sourceId) && itemsById.has(connection.targetId)
      )
  );

  const processesByParent = new Map();
  const containersByParent = new Map();
  const chartElementsByParent = new Map();
  const connectionsByOwner = new Map();

  itemsById.forEach((item) => {
    if (item.type === "process") {
      pushGrouped(processesByParent, item.parentId ?? null, item);
      return;
    }
    if (isMaterialContainerItem(item)) {
      pushGrouped(containersByParent, item.parentId ?? null, item);
      return;
    }
    if (item.type === "chart_element") {
      pushGrouped(chartElementsByParent, item.parentId ?? null, item);
    }
  });

  allConnections.forEach((connection) => {
    const ownerId = resolveConnectionOwner(connection, itemsById);
    pushGrouped(connectionsByOwner, ownerId, connection);
  });

  return {
    itemsById,
    allItems: flatItems,
    allConnections,
    getChildProcesses(parentId = null) {
      return getGrouped(processesByParent, parentId);
    },
    getMaterialContainers(parentId = null) {
      return getGrouped(containersByParent, parentId);
    },
    getChartElements(parentId = null) {
      return getGrouped(chartElementsByParent, parentId);
    },
    getConnections(parentId = null) {
      return getGrouped(connectionsByOwner, parentId);
    },
  };
}
