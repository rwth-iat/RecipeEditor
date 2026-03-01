export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function createValueType(valueType = {}) {
  return {
    "b2mml:ValueString": valueType.valueString,
    "b2mml:DataType": valueType.dataType,
    "b2mml:UnitOfMeasure": valueType.unitOfMeasure,
    "b2mml:Key": valueType.key,
  };
}

export function createAmount(valueType = {}) {
  return {
    "b2mml:QuantityString": valueType.valueString,
    "b2mml:DataType": valueType.dataType,
    "b2mml:UnitOfMeasure": valueType.unitOfMeasure,
    "b2mml:Key": valueType.key,
  };
}

export function hasValueTypeContent(valueType) {
  if (!valueType || typeof valueType !== "object") {
    return false;
  }

  return (
    isNonEmptyString(valueType.valueString) ||
    isNonEmptyString(valueType.dataType) ||
    isNonEmptyString(valueType.unitOfMeasure) ||
    isNonEmptyString(valueType.key)
  );
}

export function hasValueTypeExportableContent(valueType) {
  if (!valueType || typeof valueType !== "object") {
    return false;
  }
  return isNonEmptyString(valueType.valueString);
}

export function normalizeValueTypeArray(valueTypes) {
  return Array.isArray(valueTypes) ? valueTypes : [];
}

export function hasAnyValueTypeContent(valueTypes) {
  return normalizeValueTypeArray(valueTypes).some(hasValueTypeContent);
}

export function createValueTypeList(valueTypes) {
  const valueTypeList = normalizeValueTypeArray(valueTypes)
    .filter((valueType) => hasValueTypeExportableContent(valueType))
    .map((valueType) => createValueType(valueType));

  return valueTypeList.length > 0 ? valueTypeList : undefined;
}

export function getFirstExportableValueString(valueTypes) {
  for (const valueType of normalizeValueTypeArray(valueTypes)) {
    if (hasValueTypeExportableContent(valueType)) {
      return valueType.valueString.trim();
    }
  }
  return null;
}
