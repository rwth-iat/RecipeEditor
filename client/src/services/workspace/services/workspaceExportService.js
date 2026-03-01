import { serializeWorkspaceJson, serializeWorkspaceState } from "../io/workspaceJsonIO";

export function buildWorkspaceState({ items, connections, mode }) {
  return serializeWorkspaceState({ items, connections, mode });
}

export function exportWorkspaceJson({ items, connections, mode }) {
  return {
    filename: "workspace.json",
    content: serializeWorkspaceJson({ items, connections, mode }),
    mimeType: "application/json;charset=utf-8",
  };
}
