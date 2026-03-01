function resolveWorkspaceParameterValue(parameterList, idCandidates, fallbackValue) {
  if (!Array.isArray(parameterList)) {
    return fallbackValue;
  }

  const workspaceParam = parameterList.find((parameter) =>
    idCandidates.includes(parameter.id)
  );
  if (!workspaceParam || workspaceParam.value === undefined) {
    return fallbackValue;
  }

  const value = workspaceParam.value;
  if (Array.isArray(value) && value.length > 0) {
    return value[0].valueString ?? value[0];
  }
  if (typeof value === "object" && value?.valueString !== undefined) {
    return value.valueString;
  }
  return value;
}

export function buildEquipmentElements(workspaceItems, equipmentInstances) {
  return Array.from(equipmentInstances).map((instance) => {
    const workspaceItem = workspaceItems.find(
      (item) =>
        item.equipmentInfo &&
        item.equipmentInfo.source_type === "MTP" &&
        item.equipmentInfo.equipment_data &&
        item.equipmentInfo.equipment_data.service_info &&
        item.equipmentInfo.equipment_data.service_info.id === instance
    );

    if (workspaceItem?.equipmentInfo?.equipment_data) {
      const equipmentData = workspaceItem.equipmentInfo.equipment_data;
      const equipmentProceduralElements = [];

      if (Array.isArray(equipmentData.recipe_parameters)) {
        equipmentData.recipe_parameters.forEach((parameter) => {
          const actualValue = resolveWorkspaceParameterValue(
            workspaceItem.processElementParameter,
            [parameter.id, parameter.name],
            parameter.default
          );
          equipmentProceduralElements.push({
            "b2mml:ID": parameter.id,
            "b2mml:Description": `${equipmentData.service_info?.name || "Service"}:${
              equipmentData.procedure_info?.name || "Procedure"
            }:${parameter.name || parameter.id}`,
            "b2mml:EquipmentProceduralElementType": "Procedure",
            "b2mml:Parameter": [
              {
                "b2mml:ID": parameter.id,
                "b2mml:Description": `${parameter.name || parameter.id}_Param`,
                "b2mml:ParameterType": "ProcessParameter",
                "b2mml:ParameterSubType": parameter.paramElem?.Type || "ST",
                "b2mml:Value": {
                  "b2mml:ValueString": String(
                    actualValue !== undefined && actualValue !== null
                      ? actualValue
                      : parameter.default || "10"
                  ),
                  "b2mml:DataInterpretation": "Constant",
                  "b2mml:DataType": parameter.unit ? "Measure" : "duration",
                  "b2mml:UnitOfMeasure": parameter.unit || "seconds",
                },
              },
            ],
          });
        });
      }

      const equipmentConnections = [];
      if (equipmentData.next_equipment) {
        equipmentConnections.push({
          "b2mml:ID": `EquipmentConnection${instance}To${equipmentData.next_equipment}`,
          "b2mml:ConnectionType": "MaterialMovement",
          "b2mml:FromEquipmentID": instance,
          "b2mml:ToEquipmentID": equipmentData.next_equipment,
          "b2mml:Description": `Material transfer from ${instance} to ${equipmentData.next_equipment}`,
        });
      }
      if (equipmentData.previous_equipment) {
        equipmentConnections.push({
          "b2mml:ID": `EquipmentConnection${equipmentData.previous_equipment}To${instance}`,
          "b2mml:ConnectionType": "MaterialMovement",
          "b2mml:FromEquipmentID": equipmentData.previous_equipment,
          "b2mml:ToEquipmentID": instance,
          "b2mml:Description": `Material transfer from ${equipmentData.previous_equipment} to ${instance}`,
        });
      }
      if (equipmentConnections.length === 0) {
        equipmentConnections.push({
          "b2mml:ID": `EquipmentConnection${instance}`,
          "b2mml:ConnectionType": "MaterialMovement",
          "b2mml:FromEquipmentID": instance,
          "b2mml:ToEquipmentID": "NextEquipment",
          "b2mml:Description": `Material transfer from ${instance}`,
        });
      }

      return {
        "b2mml:ID": instance,
        "b2mml:EquipmentElementType": "Other",
        "b2mml:EquipmentElementLevel": "EquipmentModule",
        "b2mml:Description": `${equipmentData.service_info?.name || "Equipment"} instance for ${
          equipmentData.procedure_info?.name || "procedure"
        }`,
        "b2mml:EquipmentProceduralElement": equipmentProceduralElements,
        "b2mml:EquipmentConnection": equipmentConnections,
      };
    }

    return {
      "b2mml:ID": instance,
      "b2mml:EquipmentElementType": "Other",
      "b2mml:EquipmentElementLevel": "EquipmentModule",
      "b2mml:Description": `Equipment instance ${instance}`,
      "b2mml:EquipmentProceduralElement": [],
      "b2mml:EquipmentConnection": [
        {
          "b2mml:ID": `EquipmentConnection${instance}`,
          "b2mml:ConnectionType": "MaterialMovement",
          "b2mml:FromEquipmentID": instance,
          "b2mml:ToEquipmentID": "NextEquipment",
          "b2mml:Description": `Material transfer from ${instance}`,
        },
      ],
    };
  });
}
