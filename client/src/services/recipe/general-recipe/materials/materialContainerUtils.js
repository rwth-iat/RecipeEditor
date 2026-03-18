export const MATERIAL_CONTAINER_TYPE = "material_container";

function cloneValueObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...value }
    : {};
}

function cloneMaterialSpecificationProperties(properties) {
  if (!Array.isArray(properties)) {
    return [];
  }

  return properties.map((property) => ({
    ...property,
    value: Array.isArray(property?.value)
      ? property.value.map((valueType) =>
          valueType && typeof valueType === "object" ? { ...valueType } : valueType
        )
      : [],
  }));
}

export function createEmptyContainerMaterial(overrides = {}) {
  return {
    id: typeof overrides.id === "string" ? overrides.id : "",
    description:
      typeof overrides.description === "string" ? overrides.description : "",
    materialID: typeof overrides.materialID === "string" ? overrides.materialID : "",
    order: typeof overrides.order === "string" ? overrides.order : "",
    amount: cloneValueObject(overrides.amount),
    materialSpecificationProperty: cloneMaterialSpecificationProperties(
      overrides.materialSpecificationProperty
    ),
  };
}

export function isMaterialContainerItem(item) {
  return item?.type === MATERIAL_CONTAINER_TYPE;
}

export function isLegacyVisibleMaterialItem(item) {
  return item?.type === "material";
}

export function normalizeContainerMaterials(materials) {
  if (!Array.isArray(materials)) {
    return [];
  }

  return materials.map((material) => createEmptyContainerMaterial(material));
}

export function normalizeMaterialContainer(item, overrides = {}) {
  if (!item || typeof item !== "object") {
    return null;
  }

  if (isLegacyVisibleMaterialItem(item)) {
    return {
      ...item,
      ...overrides,
      type: MATERIAL_CONTAINER_TYPE,
      description:
        overrides.description ??
        (typeof item.description === "string"
          ? item.description
          : typeof item.name === "string"
            ? item.name
            : ""),
      materialType: overrides.materialType ?? item.materialType,
      parentId: overrides.parentId ?? item.parentId ?? null,
      materials:
        overrides.materials ??
        [
          createEmptyContainerMaterial({
            id: item.id,
            description:
              typeof item.description === "string"
                ? item.description
                : typeof item.name === "string"
                  ? item.name
                  : "",
            materialID: item.materialID,
            order: item.order,
            amount: item.amount,
            materialSpecificationProperty: item.materialSpecificationProperty,
          }),
        ],
    };
  }

  if (!isMaterialContainerItem(item)) {
    return {
      ...item,
      ...overrides,
    };
  }

  return {
    ...item,
    ...overrides,
    type: MATERIAL_CONTAINER_TYPE,
    description:
      overrides.description ??
      (typeof item.description === "string" ? item.description : ""),
    materialType: overrides.materialType ?? item.materialType,
    parentId: overrides.parentId ?? item.parentId ?? null,
    materials: normalizeContainerMaterials(overrides.materials ?? item.materials),
  };
}

export function createMaterialContainerItem({
  id,
  description = "",
  materialType,
  x = 0,
  y = 0,
  parentId = null,
  materials,
}) {
  return normalizeMaterialContainer(
    {
      id,
      type: MATERIAL_CONTAINER_TYPE,
      description,
      materialType,
      x,
      y,
      parentId,
      materials:
        materials ??
        [
          createEmptyContainerMaterial({
            id: `${id}Material001`,
            description,
          }),
        ],
    },
    {}
  );
}

export function getContainerMaterials(item) {
  const container = normalizeMaterialContainer(item);
  return Array.isArray(container?.materials) ? container.materials : [];
}

export function collectMaterialContainersFromWorkspaceItems(
  workspaceItems,
  parentId = null,
  containers = []
) {
  (Array.isArray(workspaceItems) ? workspaceItems : []).forEach((item) => {
    const normalizedItem = normalizeMaterialContainer(item, {
      parentId: item?.parentId ?? parentId ?? null,
    });
    if (!normalizedItem) {
      return;
    }

    if (isMaterialContainerItem(normalizedItem)) {
      containers.push(normalizedItem);
    }

    if (Array.isArray(item?.materials)) {
      collectMaterialContainersFromWorkspaceItems(item.materials, normalizedItem.id, containers);
    }
    if (Array.isArray(item?.processElement)) {
      collectMaterialContainersFromWorkspaceItems(
        item.processElement,
        normalizedItem.id,
        containers
      );
    }
    if (Array.isArray(item?.procedureChartElement)) {
      collectMaterialContainersFromWorkspaceItems(
        item.procedureChartElement,
        normalizedItem.id,
        containers
      );
    }
  });

  return containers;
}

export function upgradeGeneralWorkspaceItems(items, parentId = null) {
  return (Array.isArray(items) ? items : []).map((item) => {
    if (!item || typeof item !== "object") {
      return item;
    }

    if (item.type === "process") {
      return {
        ...item,
        parentId: item.parentId ?? parentId ?? null,
        materials: upgradeGeneralWorkspaceItems(item.materials, item.id),
        processElement: upgradeGeneralWorkspaceItems(item.processElement, item.id),
        procedureChartElement: upgradeGeneralWorkspaceItems(
          item.procedureChartElement,
          item.id
        ),
      };
    }

    if (isMaterialContainerItem(item) || isLegacyVisibleMaterialItem(item)) {
      return normalizeMaterialContainer(item, {
        parentId: item.parentId ?? parentId ?? null,
      });
    }

    return {
      ...item,
      parentId: item.parentId ?? parentId ?? null,
    };
  });
}
