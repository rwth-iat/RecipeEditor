import { buildMasterExecutionModel } from "./masterExecutionModelBuilder";

export function buildRecipeElements(workspaceItems, connections = []) {
  const executionModel = buildMasterExecutionModel(workspaceItems, connections);
  return executionModel.recipeElements;
}
