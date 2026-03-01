import { buildXmlFromObject } from "../../common/xml/xmlBuilder";
import { cleanUpObject } from "../../common/xml/xmlCleanup";
import { isNonEmptyString } from "../../common/value-type/valueTypeHelpers";
import { createMaterialDefinitionProperty } from "../builders/materialBuilder";
import { getMaterialSpecificationProperties } from "./materialEligibilityAnalyzer";

function createMaterialInformationPayload(workspaceItems) {
  const materialDefinitionsById = new Map();

  workspaceItems.forEach((item, index) => {
    if (item.type !== "material") {
      return;
    }

    const properties = getMaterialSpecificationProperties(item);
    if (properties.length === 0) {
      return;
    }

    const materialDefinitionId = isNonEmptyString(item.materialID)
      ? item.materialID.trim()
      : isNonEmptyString(item.id)
        ? item.id.trim()
        : `MaterialDefinition_${index + 1}`;

    if (!materialDefinitionsById.has(materialDefinitionId)) {
      materialDefinitionsById.set(materialDefinitionId, {
        "b2mml:ID": materialDefinitionId,
        "b2mml:Description": isNonEmptyString(item.description)
          ? [item.description.trim()]
          : undefined,
        "b2mml:MaterialDefinitionProperty": [],
      });
    }

    const materialDefinition = materialDefinitionsById.get(materialDefinitionId);
    properties.forEach((property) => {
      materialDefinition["b2mml:MaterialDefinitionProperty"].push(
        createMaterialDefinitionProperty(property)
      );
    });
  });

  const materialDefinitions = Array.from(materialDefinitionsById.values()).filter(
    (materialDefinition) =>
      Array.isArray(materialDefinition["b2mml:MaterialDefinitionProperty"]) &&
      materialDefinition["b2mml:MaterialDefinitionProperty"].length > 0
  );

  if (materialDefinitions.length === 0) {
    return null;
  }

  return {
    "b2mml:MaterialInformation": {
      $: {
        "xmlns:b2mml": "http://www.mesa.org/xml/B2MML",
      },
      "b2mml:ID": "MaterialInformationFromGeneralRecipe",
      "b2mml:Description": [
        "Material definitions and properties referenced by the General Recipe",
      ],
      "b2mml:MaterialDefinition": materialDefinitions,
    },
  };
}

export function buildMaterialInformationXmlDocument(workspaceItems) {
  const payload = createMaterialInformationPayload(workspaceItems);
  if (!payload) {
    return null;
  }

  cleanUpObject(payload);
  return {
    xml: buildXmlFromObject(payload),
    document: payload,
  };
}
