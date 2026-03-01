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

const recipeElementTypeMap = {
  "Recipe Procedure Containing Lower Level PFC": "Procedure",
  "Recipe Unit Procedure Containing Lower Level PFC": "UnitProcedure",
  "Recipe Operation Containing Lower Level PFC": "Operation",
  "Recipe Procedure Referencing Equipment Procedure": "Procedure",
  "Recipe Unit Procedure Referencing Equipment Unit Procedure": "UnitProcedure",
  "Recipe Operation Referencing Equipment Operation": "Operation",
  "Recipe Phase Referencing Equipment Phase": "Phase",
  Condition: "Other",
  Begin: "Begin",
  End: "End",
  Allocation: "Allocation",
  "Synchronization Point": "Other",
  "Synchronization Line": "Other",
  "Synchronization Line Indicating Material Transfer": "Other",
  "Begin and end Sequence Selection": "Other",
  "Begin and end Simultaneous Sequence": "Other",
  Procedure: "Procedure",
  UnitProcedure: "UnitProcedure",
  Operation: "Operation",
  Phase: "Phase",
  Process: "Operation",
  "Recipe Element": "Other",
};

export function buildRecipeElements(workspaceItems) {
  return workspaceItems
    .filter(
      (item) =>
        item.type === "process" ||
        item.type === "procedure" ||
        item.type === "recipe_element"
    )
    .map((item) => {
      let actualEquipmentID = `${item.id}Instance`;
      let equipmentRequirement = [];
      let parameters = [];
      let recipeElementID = item.id;
      let description =
        item.description ||
        `${item.id}: ${
          item.equipmentInfo?.equipment_data?.service_info?.name ||
          item.equipmentInfo?.service ||
          item.recipeElementType ||
          "Process"
        }`;

      if (
        item.equipmentInfo &&
        item.equipmentInfo.source_type === "MTP" &&
        item.equipmentInfo.equipment_data
      ) {
        const equipmentData = item.equipmentInfo.equipment_data;
        if (equipmentData.procedure_info?.id) {
          recipeElementID = equipmentData.procedure_info.id;
          description = `${equipmentData.service_info?.name || "Service"}:${
            equipmentData.procedure_info?.name || "Procedure"
          }:${item.id}`;
        }

        if (equipmentData.service_info?.id) {
          actualEquipmentID = equipmentData.service_info.id;
        }

        if (Array.isArray(equipmentData.equipment_requirements)) {
          equipmentRequirement = equipmentData.equipment_requirements.map((req) => ({
            "b2mml:ID": req.id || "Equipment Requirement",
            "b2mml:Description":
              req.description ||
              `Equipment requirement for ${equipmentData.service_info?.name || "service"}`,
          }));
        }

        if (Array.isArray(equipmentData.recipe_parameters)) {
          parameters = equipmentData.recipe_parameters.map((parameter) => {
            const actualValue = resolveWorkspaceParameterValue(
              item.processElementParameter,
              [parameter.id, parameter.name],
              parameter.default
            );
            return {
              "b2mml:ID": parameter.id,
              "b2mml:ParameterType": "ProcessParameter",
              "b2mml:Description": parameter.name || parameter.id,
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
            };
          });
        }
      } else if (
        item.equipmentInfo &&
        item.equipmentInfo.source_type === "AAS" &&
        item.equipmentInfo.equipment_data
      ) {
        const equipmentData = item.equipmentInfo.equipment_data;
        if (equipmentData.aas_id) {
          actualEquipmentID = equipmentData.aas_id;
        }

        if (Array.isArray(equipmentData.properties)) {
          parameters = equipmentData.properties.map((parameter) => {
            const actualValue = resolveWorkspaceParameterValue(
              item.processElementParameter,
              [parameter.id],
              parameter.value
            );
            return {
              "b2mml:ID": parameter.id,
              "b2mml:ParameterType": "ProcessParameter",
              "b2mml:Description": parameter.name || parameter.id,
              "b2mml:Value": {
                "b2mml:ValueString": String(
                  actualValue !== undefined && actualValue !== null
                    ? actualValue
                    : parameter.value || "10"
                ),
                "b2mml:DataInterpretation": "Constant",
                "b2mml:DataType": parameter.dataType || "duration",
                "b2mml:UnitOfMeasure": parameter.unit || "seconds",
              },
            };
          });
        }
      } else if (item.equipmentInfo) {
        if (item.equipmentInfo.instance) {
          actualEquipmentID = item.equipmentInfo.instance;
        }
        if (item.equipmentInfo.requirement) {
          equipmentRequirement = [
            {
              "b2mml:ID":
                item.equipmentInfo.requirement.id || "Equipment Requirement",
              "b2mml:Description":
                item.equipmentInfo.requirement.description ||
                `Equipment requirement for ${item.id}`,
            },
          ];
        }
        if (Array.isArray(item.equipmentInfo.parameters)) {
          parameters = item.equipmentInfo.parameters.map((parameter) => {
            const actualValue = resolveWorkspaceParameterValue(
              item.processElementParameter,
              [parameter.id],
              parameter.value
            );
            return {
              "b2mml:ID": parameter.id,
              "b2mml:ParameterType": "ProcessParameter",
              "b2mml:Description": parameter.description || parameter.id,
              "b2mml:Value": {
                "b2mml:ValueString": String(
                  actualValue !== undefined && actualValue !== null
                    ? actualValue
                    : parameter.value || "10"
                ),
                "b2mml:DataInterpretation": "Constant",
                "b2mml:DataType": parameter.dataType || "duration",
                "b2mml:UnitOfMeasure": parameter.unit || "seconds",
              },
            };
          });
        }
      }

      return {
        "b2mml:ID": recipeElementID,
        "b2mml:Description": description,
        "b2mml:RecipeElementType":
          recipeElementTypeMap[item.recipeElementType] ||
          ((item.type === "process" || item.type === "procedure")
            ? "Operation"
            : "Other"),
        "b2mml:ActualEquipmentID": actualEquipmentID,
        "b2mml:EquipmentRequirement": equipmentRequirement,
        "b2mml:Parameter": parameters,
      };
    });
}
