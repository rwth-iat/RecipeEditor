import { validateMaterialInformationXmlRequest } from "../../common/http/recipeApiClient";
import { MaterialBuildStatus } from "../../common/types/exportTypes";
import { buildMaterialInformationXmlDocument } from "../materials/materialInformationBuilder";
import { analyzeMaterialInformationExportEligibility } from "../materials/materialEligibilityAnalyzer";

export function buildMaterialInformationXml({ workspaceItems }) {
  const analysis = analyzeMaterialInformationExportEligibility(workspaceItems);
  if (analysis.incompleteEntries.length > 0) {
    return {
      status: MaterialBuildStatus.BLOCKED,
      xml: null,
      issues: analysis.incompleteEntries,
    };
  }

  if (analysis.completeCount === 0) {
    return {
      status: MaterialBuildStatus.NONE,
      xml: null,
      issues: [],
    };
  }

  const materialInfo = buildMaterialInformationXmlDocument(workspaceItems);
  return {
    status: materialInfo ? MaterialBuildStatus.READY : MaterialBuildStatus.NONE,
    xml: materialInfo?.xml ?? null,
    issues: [],
  };
}

export async function validateMaterialInformationXml({ client, xml }) {
  return validateMaterialInformationXmlRequest({ client, xml });
}
