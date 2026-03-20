import { buildMasterExecutionModel } from "./masterExecutionModelBuilder";

export function buildEquipmentElements(workspaceItems, connections = []) {
  const executionModel = buildMasterExecutionModel(workspaceItems, connections);
  return executionModel.equipmentElements;
}
