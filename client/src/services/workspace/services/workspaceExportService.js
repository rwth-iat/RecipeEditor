import { serializeWorkspaceJson } from "../io/workspaceJsonIO";

export function exportWorkspaceJson({ items, connections, mode }) {
  return {
    filename: "workspace.json",
    content: serializeWorkspaceJson({ items, connections, mode }),
    mimeType: "application/json;charset=utf-8",
  };
}
