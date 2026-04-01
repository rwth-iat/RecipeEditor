import { dedupeConnections } from "./connectionUtils";
import { WorkspaceMode } from "./workspaceTypes";

const generalWorkspaceFields = [
  "id",
  "type",
  "parentId",
  "materialType",
  "x",
  "y",
  "description",
  "materialID",
  "order",
  "amount",
  "materialSpecificationProperty",
  "materials",
  "processElement",
  "procedureChartElement",
  "directedLink",
  "processElementParameter",
  "resourceConstraint",
  "otherInformation",
  "processElementType",
  "procedureChartElementType",
  "parallelBranchCount",
];

const masterWorkspaceFields = [
  "id",
  "type",
  "name",
  "x",
  "y",
  "description",
  "amount",
  "processElementType",
  "recipeElementType",
  "conditionGroup",
  "conditionList",
  "procId",
  "serviceId",
  "selfCompleting",
  "params",
  "processElementParameter",
  "equipmentInfo",
];

export function normalizeWorkspaceItems(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    x: typeof item?.x === "number" ? item.x : 0,
    y: typeof item?.y === "number" ? item.y : 0,
  }));
}

export function normalizeWorkspaceState({ items, connections }) {
  return {
    items: normalizeWorkspaceItems(items),
    connections: dedupeConnections(connections),
  };
}

export function pickWorkspaceItemFields(item, mode) {
  const fields =
    mode === WorkspaceMode.MASTER ? masterWorkspaceFields : generalWorkspaceFields;
  const result = {};
  fields.forEach((field) => {
    if (item?.[field] !== undefined) {
      result[field] = item[field];
    }
  });
  return result;
}
