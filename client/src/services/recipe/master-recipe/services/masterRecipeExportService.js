import { requestMasterRecipeXmlRequest } from "../../common/http/recipeApiClient";
import { buildMasterRecipePayload as buildMasterRecipePayloadInternal } from "../builders/masterPayloadBuilder";
import { validateMasterParameterRanges } from "../validators/parameterRangeValidator";

export function buildMasterRecipePayload({ workspaceItems, connections, config }) {
  const payload = buildMasterRecipePayloadInternal(
    workspaceItems,
    connections,
    config
  );
  const validationWarnings = validateMasterParameterRanges(workspaceItems);

  return {
    payload,
    warnings: [],
    validationWarnings,
  };
}

export async function requestMasterRecipeXml({ client, payload }) {
  return requestMasterRecipeXmlRequest({ client, payload });
}
