import { buildXmlFromObject } from "../../common/xml/xmlBuilder";
import { cleanUpObject } from "../../common/xml/xmlCleanup";
import { validateAgainstAllSchemas } from "../../common/validation/schemaValidator";
import { createFormula } from "./formulaBuilder";
import { createProcessElementType } from "./processElementBuilder";

export function buildGeneralRecipeXmlDocument(workspaceItems, connections) {
  const gRecipe = {
    "b2mml:GRecipe": {
      $: {
        "xmlns:b2mml": "http://www.mesa.org/xml/B2MML",
      },
      "b2mml:ID": "testID",
      "b2mml:Description": [""],
      "b2mml:GRecipeType": "General",
      "b2mml:Formula": createFormula(workspaceItems),
      "b2mml:ProcessProcedure": createProcessElementType(
        {
          id: "Procedure1",
          description: "This is the top level ProcessElement",
          processElementType: "Process",
          processElementParameter: [],
          otherInformation: [],
          resourceConstraint: [],
        },
        workspaceItems,
        connections
      ),
      "b2mml:ResourceConstraint": [],
      "b2mml:OtherInformation": [],
    },
  };

  cleanUpObject(gRecipe);
  const schemaWarnings = validateAgainstAllSchemas(gRecipe);
  const xml = buildXmlFromObject(gRecipe);

  return {
    xml,
    schemaWarnings,
    buildWarnings: [],
    document: gRecipe,
  };
}
