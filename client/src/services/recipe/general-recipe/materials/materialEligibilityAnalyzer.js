import {
  hasAnyValueTypeContent,
  isNonEmptyString,
} from "../../common/value-type/valueTypeHelpers";
import { collectMaterialContainersFromWorkspaceItems } from "./materialContainerUtils";

export function isMaterialSpecificationPropertyIncomplete(property) {
  if (!property || typeof property !== "object") {
    return false;
  }

  const hasId = isNonEmptyString(property.materialDefinitionPropertyID);
  const hasDescription = isNonEmptyString(property.description);
  const hasValue = hasAnyValueTypeContent(property.value);

  return !hasId && (hasDescription || hasValue);
}

export function isMaterialSpecificationPropertyComplete(property) {
  if (!property || typeof property !== "object") {
    return false;
  }
  return isNonEmptyString(property.materialDefinitionPropertyID);
}

export function getMaterialSpecificationProperties(item) {
  if (!Array.isArray(item.materialSpecificationProperty)) {
    return [];
  }

  return item.materialSpecificationProperty.filter((property) =>
    isMaterialSpecificationPropertyComplete(property)
  );
}

export function analyzeMaterialInformationExportEligibility(workspaceItems) {
  const incompleteEntries = [];
  let completeCount = 0;

  collectMaterialContainersFromWorkspaceItems(workspaceItems).forEach((container, containerIndex) => {
    (Array.isArray(container.materials) ? container.materials : []).forEach(
      (material, materialIndex) => {
        if (!Array.isArray(material.materialSpecificationProperty)) {
          return;
        }

        material.materialSpecificationProperty.forEach((property, propertyIndex) => {
          if (isMaterialSpecificationPropertyIncomplete(property)) {
            incompleteEntries.push({
              itemIndex: containerIndex,
              materialIndex,
              propertyIndex,
              itemId: material.id,
              containerId: container.id,
              materialId: material.materialID,
              description: material.description,
            });
            return;
          }

          if (isMaterialSpecificationPropertyComplete(property)) {
            completeCount += 1;
          }
        });
      }
    );
  });

  return { completeCount, incompleteEntries };
}
