import {
  buildGeneralRecipeXml as buildGeneralRecipeXmlService,
  validateGeneralRecipeXml,
} from "./services/generalRecipeExportService";
import {
  buildMaterialInformationXml,
  validateMaterialInformationXml,
} from "./services/materialInformationService";

export { validateGeneralRecipeXml };
export { buildMaterialInformationXml, validateMaterialInformationXml };
export const buildGeneralRecipeXml = buildGeneralRecipeXmlService;

export function generate_batchml(workspace_items, connections) {
  return buildGeneralRecipeXmlService({
    workspaceItems: workspace_items,
    connections,
  }).xml;
}
