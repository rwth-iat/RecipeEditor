import {
  hasAnyValueTypeContent,
  isNonEmptyString,
} from "../../common/value-type/valueTypeHelpers";

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

  workspaceItems.forEach((item, itemIndex) => {
    if (!item || item.type !== "material") {
      return;
    }

    if (!Array.isArray(item.materialSpecificationProperty)) {
      return;
    }

    item.materialSpecificationProperty.forEach((property, propertyIndex) => {
      if (isMaterialSpecificationPropertyIncomplete(property)) {
        incompleteEntries.push({
          itemIndex,
          propertyIndex,
          itemId: item.id,
          materialId: item.materialID,
          description: item.description,
        });
        return;
      }

      if (isMaterialSpecificationPropertyComplete(property)) {
        completeCount += 1;
      }
    });
  });

  return { completeCount, incompleteEntries };
}
