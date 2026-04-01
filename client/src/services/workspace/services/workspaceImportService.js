import { applyTopologicalLayout } from "../layout/topologicalLayout";
import { parseRecipeXmlToTree } from "../io/recipeXmlIO";
import { parseWorkspaceJson } from "../io/workspaceJsonIO";
import { mapGeneralXmlTreeToWorkspace } from "../mapping/generalXmlToWorkspaceMapper";
import { mapMasterXmlTreeToWorkspace } from "../mapping/masterXmlToWorkspaceMapper";
import { mapRecipeJsonToWorkspace } from "../mapping/recipeJsonToWorkspaceMapper";
import { WorkspaceMode, WorkspaceSourceType } from "../core/workspaceTypes";
import { upgradeGeneralWorkspaceItems } from "../../recipe/general-recipe/materials/materialContainerUtils";
import { ensureParallelIndicatorDefaults } from "../core/generalParallelIndicatorUtils";

function isJsonFilename(filename) {
  return typeof filename === "string" && filename.toLowerCase().endsWith(".json");
}

function isXmlFilename(filename) {
  return typeof filename === "string" && filename.toLowerCase().endsWith(".xml");
}

function normalizeGeneralImportItems(items) {
  return upgradeGeneralWorkspaceItems(items).map((item) =>
    normalizeGeneralImportItem(item)
  );
}

function normalizeGeneralImportItem(item) {
  const normalizedItem = ensureParallelIndicatorDefaults(item);
  if (normalizedItem?.type !== "process") {
    return normalizedItem;
  }

  return {
    ...normalizedItem,
    materials: Array.isArray(normalizedItem?.materials)
      ? normalizedItem.materials.map((child) => normalizeGeneralImportItem(child))
      : normalizedItem?.materials,
    procedureChartElement: Array.isArray(normalizedItem?.procedureChartElement)
      ? normalizedItem.procedureChartElement.map((child) =>
          normalizeGeneralImportItem(child)
        )
      : normalizedItem?.procedureChartElement,
    processElement: Array.isArray(normalizedItem?.processElement)
      ? normalizedItem.processElement.map((child) => normalizeGeneralImportItem(child))
      : normalizedItem?.processElement,
  };
}

export function importWorkspaceFile({ filename, content, mode }) {
  const warnings = [];
  if (isXmlFilename(filename)) {
    const xmlTree = parseRecipeXmlToTree(content);
    const mapped =
      mode === WorkspaceMode.MASTER
        ? mapMasterXmlTreeToWorkspace(xmlTree)
        : mapGeneralXmlTreeToWorkspace(xmlTree);
    warnings.push(...(mapped.warnings || []));

    const { items } = applyTopologicalLayout({
      items: mapped.items,
      connections: mapped.connections,
    });
    return {
      items,
      connections: mapped.connections,
      config: mapped.config || null,
      sourceType: WorkspaceSourceType.XML,
      warnings,
    };
  }

  if (isJsonFilename(filename)) {
    const parsedWorkspaceState = parseWorkspaceJson(content);
    if (parsedWorkspaceState) {
      return {
        items:
          mode === WorkspaceMode.GENERAL
            ? normalizeGeneralImportItems(parsedWorkspaceState.items)
            : parsedWorkspaceState.items,
        connections: parsedWorkspaceState.connections,
        config: parsedWorkspaceState.config || null,
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
        config: mapped.config || null,
        sourceType: WorkspaceSourceType.RECIPE_JSON,
        warnings,
      };
    }

    warnings.push("JSON not recognized as workspace or recipe.");
    return {
      items: [],
      connections: [],
      config: null,
      sourceType: WorkspaceSourceType.WORKSPACE_JSON,
      warnings,
    };
  }

  warnings.push("Unsupported import format.");
  return {
    items: [],
    connections: [],
    config: null,
    sourceType: null,
    warnings,
  };
}
