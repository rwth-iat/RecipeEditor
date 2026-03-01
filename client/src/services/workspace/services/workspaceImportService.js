import { applyTopologicalLayout } from "../layout/topologicalLayout";
import { parseRecipeXmlToTree } from "../io/recipeXmlIO";
import { parseWorkspaceJson } from "../io/workspaceJsonIO";
import { mapGeneralXmlTreeToWorkspace } from "../mapping/generalXmlToWorkspaceMapper";
import { mapMasterXmlTreeToWorkspace } from "../mapping/masterXmlToWorkspaceMapper";
import { mapRecipeJsonToWorkspace } from "../mapping/recipeJsonToWorkspaceMapper";
import { WorkspaceMode, WorkspaceSourceType } from "../core/workspaceTypes";

function isJsonFilename(filename) {
  return typeof filename === "string" && filename.toLowerCase().endsWith(".json");
}

function isXmlFilename(filename) {
  return typeof filename === "string" && filename.toLowerCase().endsWith(".xml");
}

export function importWorkspaceFile({ filename, content, mode }) {
  const warnings = [];
  if (isXmlFilename(filename)) {
    const xmlTree = parseRecipeXmlToTree(content);
    const mapped =
      mode === WorkspaceMode.MASTER
        ? mapMasterXmlTreeToWorkspace(xmlTree)
        : mapGeneralXmlTreeToWorkspace(xmlTree);
    const { items } = applyTopologicalLayout({
      items: mapped.items,
      connections: mapped.connections,
    });
    return {
      items,
      connections: mapped.connections,
      sourceType: WorkspaceSourceType.XML,
      warnings,
    };
  }

  if (isJsonFilename(filename)) {
    const parsedWorkspaceState = parseWorkspaceJson(content);
    if (parsedWorkspaceState) {
      return {
        ...parsedWorkspaceState,
        sourceType: WorkspaceSourceType.WORKSPACE_JSON,
        warnings,
      };
    }

    const jsonData = JSON.parse(content);
    if (Array.isArray(jsonData.steps)) {
      const mapped = mapRecipeJsonToWorkspace(jsonData, mode);
      const { items } = applyTopologicalLayout({
        items: mapped.items,
        connections: mapped.connections,
      });
      return {
        items,
        connections: mapped.connections,
        sourceType: WorkspaceSourceType.RECIPE_JSON,
        warnings,
      };
    }

    warnings.push("JSON not recognized as workspace or recipe.");
    return {
      items: [],
      connections: [],
      sourceType: WorkspaceSourceType.WORKSPACE_JSON,
      warnings,
    };
  }

  warnings.push("Unsupported import format.");
  return {
    items: [],
    connections: [],
    sourceType: null,
    warnings,
  };
}
