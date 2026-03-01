import { validateGeneralRecipeXmlRequest } from "../../common/http/recipeApiClient";
import { buildGeneralRecipeXmlDocument } from "../builders/generalRecipeBuilder";

export function buildGeneralRecipeXml({ workspaceItems, connections }) {
  return buildGeneralRecipeXmlDocument(workspaceItems, connections);
}

export async function validateGeneralRecipeXml({ client, xml }) {
  return validateGeneralRecipeXmlRequest({ client, xml });
}
