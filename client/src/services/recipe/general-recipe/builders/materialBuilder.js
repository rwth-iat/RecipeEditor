import {
  createAmount,
  createValueTypeList,
  isNonEmptyString,
} from "../../common/value-type/valueTypeHelpers";
import { normalizeContainerMaterials } from "../materials/materialContainerUtils";

function createMaterialId(material, fallbackId) {
  if (isNonEmptyString(material?.id)) {
    return material.id.trim();
  }
  return fallbackId;
}

export function createMaterial(item, fallbackId) {
  return {
    "b2mml:ID": createMaterialId(item, fallbackId),
    "b2mml:Description": isNonEmptyString(item?.description)
      ? [item.description.trim()]
      : undefined,
    "b2mml:MaterialID": isNonEmptyString(item?.materialID)
      ? item.materialID.trim()
      : undefined,
    "b2mml:Order": isNonEmptyString(item?.order) ? item.order.trim() : undefined,
    "b2mml:Amount": createAmount(item?.amount),
  };
}

export function createMaterialsCollectionFromMaterials(
  materials,
  id,
  description,
  materialsType
) {
  return {
    "b2mml:ID": id,
    "b2mml:Description": isNonEmptyString(description) ? [description.trim()] : undefined,
    "b2mml:MaterialsType": materialsType,
    "b2mml:Material": normalizeContainerMaterials(materials).map((material, index) =>
      createMaterial(material, `${id}Material${(index + 1).toString().padStart(3, "0")}`)
    ),
  };
}

export function createMaterialsCollection(container) {
  return createMaterialsCollectionFromMaterials(
    container?.materials,
    container?.id,
    container?.description,
    container?.materialType
  );
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
