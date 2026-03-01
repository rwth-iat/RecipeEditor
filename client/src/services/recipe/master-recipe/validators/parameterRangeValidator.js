import { parseFiniteNumber } from "../../common/validation/numberUtils";
import { getFirstExportableValueString } from "../../common/value-type/valueTypeHelpers";

export function validateMasterParameterRanges(workspaceItems) {
  const validationWarnings = [];

  workspaceItems.forEach((item) => {
    if (
      (item.type !== "process" && item.type !== "procedure") ||
      !item.processElementParameter
    ) {
      return;
    }

    item.processElementParameter.forEach((parameter) => {
      if (
        !item.equipmentInfo ||
        !item.equipmentInfo.equipment_data ||
        !item.equipmentInfo.equipment_data.recipe_parameters
      ) {
        return;
      }

      const equipmentParam =
        item.equipmentInfo.equipment_data.recipe_parameters.find(
          (candidate) =>
            candidate.id === parameter.id || candidate.name === parameter.id
        );
      if (!equipmentParam) {
        return;
      }

      const parameterValueString = getFirstExportableValueString(parameter.value);
      const parameterNumericValue = parseFiniteNumber(parameterValueString);
      if (parameterNumericValue === null) {
        return;
      }

      const minValue = parseFiniteNumber(equipmentParam.min);
      const maxValue = parseFiniteNumber(equipmentParam.max);

      if (minValue !== null && parameterNumericValue < minValue) {
        validationWarnings.push(
          `Parameter ${parameter.id} value ${parameterValueString} is below minimum ${equipmentParam.min}`
        );
      }
      if (maxValue !== null && parameterNumericValue > maxValue) {
        validationWarnings.push(
          `Parameter ${parameter.id} value ${parameterValueString} is above maximum ${equipmentParam.max}`
        );
      }
    });
  });

  return validationWarnings;
}
