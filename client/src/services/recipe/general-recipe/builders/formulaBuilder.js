import { createMaterialsCollection } from "./materialBuilder";

export function createFormula(workspaceItems) {
  return {
    "b2mml:Description": [
      "The formula defines the Inputs, Intermediates and Outputs of the Procedure",
    ],
    "b2mml:ProcessInputs": createMaterialsCollection(
      workspaceItems,
      "inputid",
      "List of Process Inputs",
      "Input"
    ),
    "b2mml:ProcessOutputs": createMaterialsCollection(
      workspaceItems,
      "outputsid",
      "List of Process Outputs",
      "Output"
    ),
    "b2mml:ProcessIntermediates": createMaterialsCollection(
      workspaceItems,
      "intermediateid",
      "List of Process Intermediates",
      "Intermediate"
    ),
    "b2mml:ProcessElementParameter": [],
  };
}
