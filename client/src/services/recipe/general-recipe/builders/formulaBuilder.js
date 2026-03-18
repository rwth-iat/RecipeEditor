import { createMaterialsCollectionFromMaterials } from "./materialBuilder";

const FORMULA_SECTIONS = [
  {
    type: "Input",
    key: "b2mml:ProcessInputs",
    id: "inputid",
    description: "List of Process Inputs",
  },
  {
    type: "Output",
    key: "b2mml:ProcessOutputs",
    id: "outputsid",
    description: "List of Process Outputs",
  },
  {
    type: "Intermediate",
    key: "b2mml:ProcessIntermediates",
    id: "intermediateid",
    description: "List of Process Intermediates",
  },
];

export function createFormula(exportState) {
  const formula = {
    "b2mml:Description": [
      "The formula defines the Inputs, Intermediates and Outputs of the Procedure",
    ],
    "b2mml:ProcessElementParameter": [],
  };

  const allContainers = exportState.getMaterialContainers(null).concat(
    exportState.allItems.filter(
      (item) => item?.type === "material_container" && item?.parentId !== null
    )
  );

  FORMULA_SECTIONS.forEach(({ type, key, id, description }) => {
    const materials = allContainers
      .filter((container) => container.materialType === type)
      .flatMap((container) => container.materials || []);

    formula[key] = createMaterialsCollectionFromMaterials(materials, id, description, type);
  });

  return formula;
}
