import { buildMasterExecutionModel } from "./masterExecutionModelBuilder";

export function buildProcedureLogic(workspaceItems, connections) {
  const executionModel = buildMasterExecutionModel(workspaceItems, connections);
  return {
    step: executionModel.steps,
    transition: executionModel.transitions,
    link: executionModel.links,
  };
}
