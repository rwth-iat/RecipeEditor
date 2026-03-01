import { WorkspaceMode } from "../core/workspaceTypes";

export function mapRecipeJsonToWorkspace(recipeJson, mode) {
  const steps = Array.isArray(recipeJson?.steps) ? recipeJson.steps : [];
  const horizontalSpacing = 300;
  const verticalPosition = 100;
  const margin = 50;

  const items = steps.map((step, index) => ({
    id: `step_${index + 1}`,
    type: mode === WorkspaceMode.MASTER ? "procedure" : "process",
    x: margin + index * horizontalSpacing,
    y: verticalPosition,
    description: `${step.type} ${step.target}${step.unit}`,
    amount: {},
    processElementType: mode === WorkspaceMode.MASTER ? "Process" : "Process",
    recipeElementType: mode === WorkspaceMode.MASTER ? "" : undefined,
    procedureChartElementType: mode === WorkspaceMode.GENERAL ? "" : undefined,
  }));

  const connections = items.slice(0, -1).map((from, index) => ({
    sourceId: from.id,
    targetId: items[index + 1].id,
  }));

  return { items, connections };
}
