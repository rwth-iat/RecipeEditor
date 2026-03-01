import { dedupeConnections } from "../core/connectionUtils";

function asArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function getId(rawId) {
  return typeof rawId === "string" ? rawId : rawId?.["#text"] || "";
}

function flattenProcessElements(
  obj,
  parentId = null,
  items = [],
  connections = [],
  materialsTypeHint = undefined
) {
  if (!obj) {
    return;
  }

  if (obj.ProcessProcedure) {
    flattenProcessElements(
      obj.ProcessProcedure,
      parentId,
      items,
      connections,
      materialsTypeHint
    );
  }

  asArray(obj.ProcessElement).forEach((child) => {
    flattenProcessElements(
      child,
      obj.ID || parentId,
      items,
      connections,
      materialsTypeHint
    );
  });

  asArray(obj.Material).forEach((material) => {
    const groupMaterialsType = obj.MaterialsType || materialsTypeHint;
    if (material?.ID) {
      items.push({
        ...material,
        id: getId(material.ID),
        type: "material",
        parentId: obj.ID || parentId,
        x: typeof material.x === "number" ? material.x : 0,
        y: typeof material.y === "number" ? material.y : 0,
        materialType: material.materialType || groupMaterialsType || undefined,
      });
    }
    flattenProcessElements(
      material,
      obj.ID || parentId,
      items,
      connections,
      groupMaterialsType
    );
  });

  if (obj.ID && obj.ProcessElementType) {
    items.push({
      ...obj,
      id: getId(obj.ID),
      type: "process",
      parentId,
      x: typeof obj.x === "number" ? obj.x : 0,
      y: typeof obj.y === "number" ? obj.y : 0,
      processElementParameter: obj.ProcessElementParameter
        ? asArray(obj.ProcessElementParameter)
        : [],
    });
  }

  const knownMaterialParents = [
    "ProcessInputs",
    "ProcessOutputs",
    "ProcessIntermediates",
    "Materials",
  ];
  if (obj.ID && (obj.MaterialID || knownMaterialParents.includes(parentId) || parentId)) {
    items.push({
      ...obj,
      id: getId(obj.ID),
      type: "material",
      parentId,
      x: typeof obj.x === "number" ? obj.x : 0,
      y: typeof obj.y === "number" ? obj.y : 0,
      materialType: obj.materialType || materialsTypeHint || undefined,
    });
  }

  asArray(obj.DirectedLink).forEach((link) => {
    const fromId = link.FromID?.["#text"] || link.FromID || "";
    const toId = link.ToID?.["#text"] || link.ToID || "";
    if (fromId && toId) {
      connections.push({ sourceId: fromId, targetId: toId });
    }
  });
}

export function mapGeneralXmlTreeToWorkspace(xmlTree) {
  const items = [];
  const connections = [];

  flattenProcessElements(xmlTree, null, items, connections);

  if (xmlTree.Formula) {
    ["ProcessInputs", "ProcessOutputs", "ProcessIntermediates"].forEach((section) => {
      const group = xmlTree.Formula[section];
      if (!group?.Material) {
        return;
      }
      asArray(group.Material).forEach((material) => {
        const id = getId(material.ID);
        if (!id || items.some((item) => item.id === id)) {
          return;
        }
        items.push({
          ...material,
          id,
          type: "material",
          parentId: section,
          x: typeof material.x === "number" ? material.x : 0,
          y: typeof material.y === "number" ? material.y : 0,
        });
      });
    });
  }

  const dedupedItems = [];
  const seen = new Set();
  items.forEach((item) => {
    const key = `${item.id}|${item.type}`;
    if (!item.id || seen.has(key)) {
      return;
    }
    seen.add(key);
    dedupedItems.push(item);
  });

  return {
    items: dedupedItems,
    connections: dedupeConnections(connections),
  };
}
