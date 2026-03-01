import { dedupeConnections } from "../core/connectionUtils";

function asArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function getId(rawId) {
  return typeof rawId === "string" ? rawId : rawId?.["#text"] || "";
}

function flattenProcessElements(obj, parentId = null, items = [], connections = []) {
  if (!obj) {
    return;
  }

  if (obj.ProcessProcedure) {
    flattenProcessElements(obj.ProcessProcedure, parentId, items, connections);
  }

  asArray(obj.ProcessElement).forEach((child) => {
    flattenProcessElements(child, obj.ID || parentId, items, connections);
  });

  if (obj.ID && obj.ProcessElementType) {
    items.push({
      ...obj,
      id: getId(obj.ID),
      type: "procedure",
      parentId,
      x: typeof obj.x === "number" ? obj.x : 0,
      y: typeof obj.y === "number" ? obj.y : 0,
      processElementParameter: obj.ProcessElementParameter
        ? asArray(obj.ProcessElementParameter)
        : [],
    });
  }

  asArray(obj.DirectedLink).forEach((link) => {
    const fromId = link.FromID?.["#text"] || link.FromID || "";
    const toId = link.ToID?.["#text"] || link.ToID || "";
    if (fromId && toId) {
      connections.push({ sourceId: fromId, targetId: toId });
    }
  });
}

export function mapMasterXmlTreeToWorkspace(xmlTree) {
  const items = [];
  const connections = [];
  flattenProcessElements(xmlTree, null, items, connections);

  const dedupedItems = [];
  const seen = new Set();
  items.forEach((item) => {
    const key = `${item.id}|${item.type}`;
    if (!item.id || seen.has(key)) {
      return;
    }
    seen.add(key);
    dedupedItems.push(item);
  });

  return {
    items: dedupedItems,
    connections: dedupeConnections(connections),
  };
}
