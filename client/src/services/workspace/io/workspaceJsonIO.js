import { dedupeConnections } from "../core/connectionUtils";
import {
  normalizeWorkspaceItems,
  pickWorkspaceItemFields,
} from "../core/workspaceModel";

export function parseWorkspaceJson(content) {
  const data = JSON.parse(content);
  const looksLikeWorkspace =
    Array.isArray(data.items) &&
    data.items.every(
      (item) => typeof item?.x === "number" && typeof item?.y === "number"
    ) &&
    Array.isArray(data.connections);

  if (!looksLikeWorkspace) {
    return null;
  }

  return {
    items: normalizeWorkspaceItems(data.items),
    connections: dedupeConnections(data.connections),
  };
}

export function serializeWorkspaceState({ items, connections, mode }) {
  const normalizedItems = normalizeWorkspaceItems(items).map((item) =>
    pickWorkspaceItemFields(item, mode)
  );
  return {
    items: normalizedItems,
    connections: dedupeConnections(connections),
  };
}

export function serializeWorkspaceJson({ items, connections, mode }) {
  const workspaceState = serializeWorkspaceState({ items, connections, mode });
  return JSON.stringify(workspaceState, null, 2);
}
