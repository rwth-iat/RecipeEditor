import { dedupeConnections } from "../core/connectionUtils";
import {
  ensureParallelIndicatorDefaults,
  getParallelBranchCount,
  getParallelBranchPortId,
  getParallelFixedSourcePortId,
  getParallelFixedTargetPortId,
  isParallelIndicatorItem,
  isParallelJoinType,
  isParallelSplitType,
  normalizeParallelBranchCount,
} from "../core/generalParallelIndicatorUtils";
import {
  MATERIAL_CONTAINER_TYPE,
  createEmptyContainerMaterial,
  normalizeContainerMaterials,
  normalizeMaterialContainer,
} from "../../recipe/general-recipe/materials/materialContainerUtils";

const FORMULA_MATERIAL_SECTIONS = [
  ["ProcessInputs", "Input"],
  ["ProcessOutputs", "Output"],
  ["ProcessIntermediates", "Intermediate"],
];

function asArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function getId(rawId) {
  return typeof rawId === "string" ? rawId : rawId?.["#text"] || "";
}

function getStringValue(rawValue) {
  if (typeof rawValue === "string") {
    return rawValue;
  }
  if (rawValue && typeof rawValue === "object") {
    return typeof rawValue["#text"] === "string" ? rawValue["#text"] : "";
  }
  return "";
}

function normalizeText(rawValue) {
  return getStringValue(rawValue).trim();
}

function hasObjectContent(value) {
  return !!value && typeof value === "object" && Object.keys(value).length > 0;
}

function normalizeValueType(value) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || typeof candidate !== "object") {
    return {};
  }

  const normalized = {
    valueString: normalizeText(candidate.ValueString || candidate.QuantityString),
    dataType: normalizeText(candidate.DataType),
    unitOfMeasure: normalizeText(candidate.UnitOfMeasure),
    key: normalizeText(candidate.Key),
  };

  return Object.fromEntries(
    Object.entries(normalized).filter(([, entryValue]) => isNonEmptyString(entryValue))
  );
}

function normalizeValueTypeList(value) {
  return asArray(value)
    .map((entry) => normalizeValueType(entry))
    .filter((entry) => hasObjectContent(entry));
}

function normalizeMaterialType(rawType, fallback) {
  const value = normalizeText(rawType) || fallback || "";
  if (value === "Input" || value === "Intermediate" || value === "Output") {
    return value;
  }
  return undefined;
}

function normalizeProcessElementParameter(parameter) {
  return {
    id: getId(parameter?.ID),
    description: normalizeText(parameter?.Description),
    value: normalizeValueTypeList(parameter?.Value),
  };
}

function normalizeOtherInformation(otherInformation) {
  return {
    otherInfoID: normalizeText(otherInformation?.OtherInfoID),
    description: normalizeText(otherInformation?.Description),
    otherValue: normalizeValueTypeList(otherInformation?.OtherValue),
  };
}

function normalizeResourceConstraint(resourceConstraint) {
  return {
    constraintID: normalizeText(resourceConstraint?.ConstraintID),
    description: normalizeText(resourceConstraint?.Description),
    range: normalizeValueTypeList(resourceConstraint?.Range),
  };
}

function normalizeMaterialEntry(material, overrides = {}) {
  const normalizedAmount = normalizeValueType(material?.Amount);

  return createEmptyContainerMaterial({
    id: overrides.id ?? getId(material?.ID),
    description: overrides.description ?? normalizeText(material?.Description),
    materialID: overrides.materialID ?? normalizeText(material?.MaterialID),
    order: overrides.order ?? normalizeText(material?.Order),
    amount: overrides.amount ?? (hasObjectContent(normalizedAmount) ? normalizedAmount : {}),
    materialSpecificationProperty:
      overrides.materialSpecificationProperty ?? material?.materialSpecificationProperty,
  });
}

function mergeMaterialEntry(existing, incoming) {
  return createEmptyContainerMaterial({
    ...existing,
    ...incoming,
    id: incoming?.id || existing?.id || "",
    description: incoming?.description || existing?.description || "",
    materialID: incoming?.materialID || existing?.materialID || "",
    order: incoming?.order || existing?.order || "",
    amount:
      hasObjectContent(incoming?.amount) ? incoming.amount : existing?.amount || {},
    materialSpecificationProperty:
      Array.isArray(incoming?.materialSpecificationProperty) &&
      incoming.materialSpecificationProperty.length > 0
        ? incoming.materialSpecificationProperty
        : existing?.materialSpecificationProperty || [],
  });
}

function normalizeContainer(materialGroup, overrides = {}) {
  const materialType =
    overrides.materialType ??
    normalizeMaterialType(materialGroup?.MaterialsType || materialGroup?.MaterialType);
  const materials = normalizeContainerMaterials(
    overrides.materials ??
      asArray(materialGroup?.Material).map((material) => normalizeMaterialEntry(material))
  );

  return normalizeMaterialContainer({
    id: overrides.id ?? getId(materialGroup?.ID),
    type: MATERIAL_CONTAINER_TYPE,
    parentId: overrides.parentId ?? null,
    x: typeof materialGroup?.x === "number" ? materialGroup.x : 0,
    y: typeof materialGroup?.y === "number" ? materialGroup.y : 0,
    description: overrides.description ?? normalizeText(materialGroup?.Description),
    materialType,
    materials,
  });
}

function normalizeProcess(processElement, parentId) {
  return {
    id: getId(processElement?.ID),
    type: "process",
    parentId,
    x: typeof processElement?.x === "number" ? processElement.x : 0,
    y: typeof processElement?.y === "number" ? processElement.y : 0,
    description: normalizeText(processElement?.Description),
    processElementType: normalizeText(processElement?.ProcessElementType),
    processElementParameter: asArray(processElement?.ProcessElementParameter)
      .map((parameter) => normalizeProcessElementParameter(parameter))
      .filter((parameter) =>
        isNonEmptyString(parameter.id) ||
        isNonEmptyString(parameter.description) ||
        parameter.value.length > 0
      ),
    resourceConstraint: asArray(processElement?.ResourceConstraint)
      .map((resourceConstraint) => normalizeResourceConstraint(resourceConstraint))
      .filter((resourceConstraint) =>
        isNonEmptyString(resourceConstraint.constraintID) ||
        isNonEmptyString(resourceConstraint.description) ||
        resourceConstraint.range.length > 0
      ),
    otherInformation: asArray(processElement?.OtherInformation)
      .map((otherInformation) => normalizeOtherInformation(otherInformation))
      .filter((otherInformation) =>
        isNonEmptyString(otherInformation.otherInfoID) ||
        isNonEmptyString(otherInformation.description) ||
        otherInformation.otherValue.length > 0
      ),
  };
}

function normalizeProcedureChartElement(procedureChartElement, parentId) {
  return ensureParallelIndicatorDefaults({
    id: getId(procedureChartElement?.ID),
    type: "chart_element",
    parentId,
    x: typeof procedureChartElement?.x === "number" ? procedureChartElement.x : 0,
    y: typeof procedureChartElement?.y === "number" ? procedureChartElement.y : 0,
    description: normalizeText(procedureChartElement?.Description),
    procedureChartElementType: normalizeText(procedureChartElement?.ProcedureChartElementType),
  });
}

function mergeContainer(existing, incoming) {
  const materialsById = new Map();

  normalizeContainerMaterials(existing?.materials).forEach((material, index) => {
    materialsById.set(material.id || `existing_${index}`, material);
  });
  normalizeContainerMaterials(incoming?.materials).forEach((material, index) => {
    const key = material.id || `incoming_${index}`;
    if (!materialsById.has(key)) {
      materialsById.set(key, material);
      return;
    }
    materialsById.set(key, mergeMaterialEntry(materialsById.get(key), material));
  });

  return normalizeMaterialContainer({
    ...existing,
    ...incoming,
    description: incoming?.description || existing?.description || "",
    materialType: incoming?.materialType || existing?.materialType,
    parentId: incoming?.parentId ?? existing?.parentId ?? null,
    x: typeof incoming?.x === "number" ? incoming.x : existing?.x ?? 0,
    y: typeof incoming?.y === "number" ? incoming.y : existing?.y ?? 0,
    materials: Array.from(materialsById.values()),
  });
}

function mergeProcess(existing, incoming) {
  return {
    ...existing,
    ...incoming,
    description: incoming?.description || existing?.description || "",
    processElementType:
      incoming?.processElementType || existing?.processElementType || "",
    processElementParameter:
      incoming?.processElementParameter?.length > 0
        ? incoming.processElementParameter
        : existing?.processElementParameter || [],
    resourceConstraint:
      incoming?.resourceConstraint?.length > 0
        ? incoming.resourceConstraint
        : existing?.resourceConstraint || [],
    otherInformation:
      incoming?.otherInformation?.length > 0
        ? incoming.otherInformation
        : existing?.otherInformation || [],
    parentId: incoming?.parentId ?? existing?.parentId ?? null,
    x: typeof incoming?.x === "number" ? incoming.x : existing?.x ?? 0,
    y: typeof incoming?.y === "number" ? incoming.y : existing?.y ?? 0,
  };
}

function mergeProcedureChartElement(existing, incoming) {
  const procedureChartElementType =
    incoming?.procedureChartElementType || existing?.procedureChartElementType || "";

  return {
    ...existing,
    ...incoming,
    description: incoming?.description || existing?.description || "",
    procedureChartElementType,
    parallelBranchCount: normalizeParallelBranchCount(
      procedureChartElementType,
      incoming?.parallelBranchCount ?? existing?.parallelBranchCount
    ),
    parentId: incoming?.parentId ?? existing?.parentId ?? null,
    x: typeof incoming?.x === "number" ? incoming.x : existing?.x ?? 0,
    y: typeof incoming?.y === "number" ? incoming.y : existing?.y ?? 0,
  };
}

function decorateParallelIndicatorConnections(connections, itemsById) {
  const splitBranchCounts = new Map();
  const joinBranchCounts = new Map();

  const decoratedConnections = connections.map((connection) => {
    const decoratedConnection = {
      ...connection,
      sourcePortId:
        typeof connection?.sourcePortId === "string" ? connection.sourcePortId : "",
      targetPortId:
        typeof connection?.targetPortId === "string" ? connection.targetPortId : "",
    };

    const sourceItem = itemsById.get(connection.sourceId);
    if (isParallelIndicatorItem(sourceItem)) {
      const sourceType = sourceItem.procedureChartElementType;
      if (isParallelSplitType(sourceType)) {
        const nextBranchIndex = (splitBranchCounts.get(sourceItem.id) || 0) + 1;
        splitBranchCounts.set(sourceItem.id, nextBranchIndex);
        decoratedConnection.sourcePortId =
          decoratedConnection.sourcePortId ||
          getParallelBranchPortId(sourceType, nextBranchIndex);
      } else {
        decoratedConnection.sourcePortId =
          decoratedConnection.sourcePortId || getParallelFixedSourcePortId(sourceType);
      }
    }

    const targetItem = itemsById.get(connection.targetId);
    if (isParallelIndicatorItem(targetItem)) {
      const targetType = targetItem.procedureChartElementType;
      if (isParallelJoinType(targetType)) {
        const nextBranchIndex = (joinBranchCounts.get(targetItem.id) || 0) + 1;
        joinBranchCounts.set(targetItem.id, nextBranchIndex);
        decoratedConnection.targetPortId =
          decoratedConnection.targetPortId ||
          getParallelBranchPortId(targetType, nextBranchIndex);
      } else {
        decoratedConnection.targetPortId =
          decoratedConnection.targetPortId || getParallelFixedTargetPortId(targetType);
      }
    }

    return decoratedConnection;
  });

  itemsById.forEach((item, itemId) => {
    if (!isParallelIndicatorItem(item)) {
      return;
    }

    const relevantBranchCount = isParallelSplitType(item.procedureChartElementType)
      ? splitBranchCounts.get(itemId) || 0
      : joinBranchCounts.get(itemId) || 0;

    item.parallelBranchCount = normalizeParallelBranchCount(
      item.procedureChartElementType,
      Math.max(getParallelBranchCount(item), relevantBranchCount)
    );
  });

  return decoratedConnections;
}

function addOrMergeItem(itemsById, item, warnings) {
  if (!item?.id) {
    return;
  }

  const existing = itemsById.get(item.id);
  if (!existing) {
    itemsById.set(item.id, item);
    return;
  }

  if (existing.type !== item.type) {
    warnings.push(
      `Import skipped duplicate ID '${item.id}' because it is used as both '${existing.type}' and '${item.type}'.`
    );
    return;
  }

  if (item.type === MATERIAL_CONTAINER_TYPE) {
    itemsById.set(item.id, mergeContainer(existing, item));
    return;
  }

  if (item.type === "chart_element") {
    itemsById.set(item.id, mergeProcedureChartElement(existing, item));
    return;
  }

  itemsById.set(item.id, mergeProcess(existing, item));
}

function registerContainerMaterialIds(container, materialIdToContainers) {
  normalizeContainerMaterials(container?.materials).forEach((material) => {
    if (!isNonEmptyString(material.id)) {
      return;
    }
    const aliases = materialIdToContainers.get(material.id) || [];
    if (!aliases.includes(container.id)) {
      aliases.push(container.id);
      materialIdToContainers.set(material.id, aliases);
    }
  });
}

function getReferencedLinkIds(container) {
  const referencedIds = new Set();
  asArray(container?.DirectedLink).forEach((link) => {
    const sourceId = getId(link?.FromID) || normalizeText(link?.FromID);
    const targetId = getId(link?.ToID) || normalizeText(link?.ToID);
    if (sourceId) {
      referencedIds.add(sourceId);
    }
    if (targetId) {
      referencedIds.add(targetId);
    }
  });
  return referencedIds;
}

function shouldSplitMaterialGroup(materialGroup, referencedIds) {
  const groupId = getId(materialGroup?.ID);
  const childIds = asArray(materialGroup?.Material)
    .map((material) => getId(material?.ID))
    .filter(isNonEmptyString);

  if (childIds.length === 0) {
    return false;
  }

  const referencesGroupId = isNonEmptyString(groupId) && referencedIds.has(groupId);
  const referencesAnyChild = childIds.some((childId) => referencedIds.has(childId));

  return referencesAnyChild && !referencesGroupId;
}

function buildSplitContainerId(materialGroup, material, index, itemsById) {
  const groupId = getId(materialGroup?.ID);
  const candidates = [
    material?.id,
    groupId && `${groupId}_${material?.id || index + 1}`,
    groupId && `${groupId}_${index + 1}`,
    `MaterialGroup_${material?.id || index + 1}`,
    `MaterialGroup_${index + 1}`,
  ].filter(isNonEmptyString);

  const uniqueCandidate = candidates.find((candidate) => !itemsById.has(candidate));
  if (uniqueCandidate) {
    return uniqueCandidate;
  }

  const baseId = `${groupId || "MaterialGroup"}_${material?.id || index + 1}`;
  let suffix = 2;
  let candidate = `${baseId}_${suffix}`;
  while (itemsById.has(candidate)) {
    suffix += 1;
    candidate = `${baseId}_${suffix}`;
  }
  return candidate;
}

function buildFormulaData(formula) {
  const materialDetailsById = new Map();
  const formulaContainers = [];

  FORMULA_MATERIAL_SECTIONS.forEach(([sectionName, defaultType]) => {
    const group = formula?.[sectionName];
    if (!group) {
      return;
    }

    const materialType = normalizeMaterialType(group.MaterialsType, defaultType);
    const materials = asArray(group.Material).map((material) => {
      const normalizedMaterial = normalizeMaterialEntry(material);
      if (normalizedMaterial.id) {
        materialDetailsById.set(normalizedMaterial.id, normalizedMaterial);
      }
      return normalizedMaterial;
    });

    formulaContainers.push(
      normalizeContainer(group, {
        id: getId(group.ID) || sectionName,
        materialType,
        materials,
      })
    );
  });

  return { formulaContainers, materialDetailsById };
}

function collectMaterialContainers({
  container,
  visibleParentId,
  materialDetailsById,
  itemsById,
  materialIdToContainers,
  warnings,
}) {
  const referencedIds = getReferencedLinkIds(container);
  asArray(container?.Materials).forEach((materialGroup) => {
    const materialType = normalizeMaterialType(materialGroup?.MaterialsType);
    const materials = asArray(materialGroup?.Material).map((materialReference) => {
      const materialId = getId(materialReference?.ID);
      const formulaMaterial = materialId ? materialDetailsById.get(materialId) : null;
      return mergeMaterialEntry(
        formulaMaterial || createEmptyContainerMaterial({ id: materialId }),
        normalizeMaterialEntry(materialReference, {
          id: materialId,
        })
      );
    });

    if (materials.length === 0) {
      return;
    }

    if (shouldSplitMaterialGroup(materialGroup, referencedIds)) {
      materials.forEach((material, index) => {
        const splitContainer = normalizeMaterialContainer({
          id: buildSplitContainerId(materialGroup, material, index, itemsById),
          type: MATERIAL_CONTAINER_TYPE,
          parentId: visibleParentId,
          x: typeof materialGroup?.x === "number" ? materialGroup.x : 0,
          y: typeof materialGroup?.y === "number" ? materialGroup.y : 0,
          description: material.description || normalizeText(materialGroup?.Description),
          materialType,
          materials: [material],
        });

        addOrMergeItem(itemsById, splitContainer, warnings);
        registerContainerMaterialIds(splitContainer, materialIdToContainers);
      });
      return;
    }

    const normalizedContainer = normalizeContainer(materialGroup, {
      parentId: visibleParentId,
      materialType,
      materials,
    });

    addOrMergeItem(itemsById, normalizedContainer, warnings);
    registerContainerMaterialIds(normalizedContainer, materialIdToContainers);
  });
}

function collectRawConnections(container, rawConnections) {
  asArray(container?.DirectedLink).forEach((link) => {
    const sourceId = getId(link?.FromID) || normalizeText(link?.FromID);
    const targetId = getId(link?.ToID) || normalizeText(link?.ToID);
    if (!sourceId || !targetId) {
      return;
    }
    rawConnections.push({
      id: getId(link?.ID),
      sourceId,
      targetId,
    });
  });
}

function collectProcedureChartElements({ container, visibleParentId, itemsById, warnings }) {
  asArray(container?.ProcedureChartElement).forEach((procedureChartElement) => {
    const normalizedChartElement = normalizeProcedureChartElement(
      procedureChartElement,
      visibleParentId
    );
    if (!normalizedChartElement.id || !normalizedChartElement.procedureChartElementType) {
      return;
    }
    addOrMergeItem(itemsById, normalizedChartElement, warnings);
  });
}

function collectProcessItems({
  processElement,
  parentId,
  includeCurrentProcess,
  materialDetailsById,
  itemsById,
  materialIdToContainers,
  rawConnections,
  warnings,
}) {
  if (!processElement) {
    return;
  }

  const processId = getId(processElement?.ID);
  const visibleParentId = includeCurrentProcess ? processId : parentId;

  if (includeCurrentProcess && processId && normalizeText(processElement?.ProcessElementType)) {
    addOrMergeItem(itemsById, normalizeProcess(processElement, parentId), warnings);
  }

  collectMaterialContainers({
    container: processElement,
    visibleParentId: includeCurrentProcess ? processId : parentId,
    materialDetailsById,
    itemsById,
    materialIdToContainers,
    warnings,
  });
  collectProcedureChartElements({
    container: processElement,
    visibleParentId: includeCurrentProcess ? processId : parentId,
    itemsById,
    warnings,
  });
  collectRawConnections(processElement, rawConnections);

  asArray(processElement?.ProcessElement).forEach((childProcessElement) => {
    collectProcessItems({
      processElement: childProcessElement,
      parentId: visibleParentId,
      includeCurrentProcess: true,
      materialDetailsById,
      itemsById,
      materialIdToContainers,
      rawConnections,
      warnings,
    });
  });
}

function synthesizeFormulaContainers({
  formulaContainers,
  itemsById,
  materialIdToContainers,
  warnings,
}) {
  if (Array.from(itemsById.values()).some((item) => item.type === MATERIAL_CONTAINER_TYPE)) {
    return;
  }

  formulaContainers
    .filter((container) => Array.isArray(container?.materials) && container.materials.length > 0)
    .forEach((container) => {
      const visibleContainer = normalizeMaterialContainer({
        ...container,
        parentId: null,
      });
      addOrMergeItem(itemsById, visibleContainer, warnings);
      registerContainerMaterialIds(visibleContainer, materialIdToContainers);
    });
}

function resolveConnectionId(rawId, itemsById, materialIdToContainers, warnings, linkId) {
  const aliases = materialIdToContainers.get(rawId);
  if (aliases) {
    if (aliases.length === 1) {
      return aliases[0];
    }

    warnings.push(
      `DirectedLink '${linkId || `${rawId}`}' refers to legacy material ID '${rawId}' that belongs to ${aliases.length} visible containers and was skipped because the target is ambiguous.`
    );
    return null;
  }

  if (itemsById.has(rawId)) {
    return rawId;
  }
  return rawId;
}

export function mapGeneralXmlTreeToWorkspace(xmlTree) {
  const warnings = [];
  const itemsById = new Map();
  const materialIdToContainers = new Map();
  const rawConnections = [];
  const { formulaContainers, materialDetailsById } = buildFormulaData(xmlTree?.Formula);

  collectProcessItems({
    processElement: xmlTree?.ProcessProcedure,
    parentId: null,
    includeCurrentProcess: false,
    materialDetailsById,
    itemsById,
    materialIdToContainers,
    rawConnections,
    warnings,
  });

  synthesizeFormulaContainers({
    formulaContainers,
    itemsById,
    materialIdToContainers,
    warnings,
  });

  const connections = rawConnections
    .map((connection) => {
      const resolvedSourceId = resolveConnectionId(
        connection.sourceId,
        itemsById,
        materialIdToContainers,
        warnings,
        connection.id
      );
      const resolvedTargetId = resolveConnectionId(
        connection.targetId,
        itemsById,
        materialIdToContainers,
        warnings,
        connection.id
      );

      if (!resolvedSourceId || !resolvedTargetId) {
        return null;
      }

      if (!itemsById.has(resolvedSourceId) || !itemsById.has(resolvedTargetId)) {
        warnings.push(
          `DirectedLink '${connection.id || `${connection.sourceId}->${connection.targetId}`}' was skipped because '${resolvedSourceId}' or '${resolvedTargetId}' is not represented as a visible workspace item.`
        );
        return null;
      }

      return {
        sourceId: resolvedSourceId,
        targetId: resolvedTargetId,
      };
    })
    .filter(Boolean);

  const decoratedConnections = decorateParallelIndicatorConnections(
    connections,
    itemsById
  );

  return {
    items: Array.from(itemsById.values()),
    connections: dedupeConnections(decoratedConnections),
    warnings,
  };
}
