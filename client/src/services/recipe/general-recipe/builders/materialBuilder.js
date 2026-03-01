import {
  createAmount,
  createValueTypeList,
  isNonEmptyString,
} from "../../common/value-type/valueTypeHelpers";

export function createMaterial(item) {
  return {
    "b2mml:ID": item.id,
    "b2mml:Description": [item.description],
    "b2mml:MaterialID": item.materialID,
    "b2mml:Order": item.order,
    "b2mml:Amount": createAmount(item.amount),
  };
}

export function createMaterialsCollection(
  workspaceItems,
  id,
  description,
  materialsType
) {
  const materials = {
    "b2mml:ID": id,
    "b2mml:Description": [description],
    "b2mml:MaterialsType": materialsType,
    "b2mml:Material": [],
  };

  for (const item of workspaceItems) {
    if (item.type === "material" && item.materialType === materialsType) {
      materials["b2mml:Material"].push(createMaterial(item));
    }
  }
  return materials;
}

export function createMaterialDefinitionProperty(property) {
  const propertyId = property.materialDefinitionPropertyID.trim();
  return {
    "b2mml:ID": propertyId,
    "b2mml:Description": isNonEmptyString(property.description)
      ? [property.description.trim()]
      : undefined,
    "b2mml:Value": createValueTypeList(property.value),
  };
}
