/**
 * Master Recipe XML Export Module
 * 
 * This module handles the generation of B2MML (BatchML) XML for both general and master recipes.
 * It provides comprehensive XML generation with validation, topological sorting, and
 * advanced condition handling.
 * 
 * Key Features:
 * - B2MML-compliant XML generation
 * - Topological sorting for logical step ordering
 * - Advanced condition stringification with logical precedence
 * - Parameter validation and error handling
 * - Equipment integration (AAS, MTP)
 * - XSD schema validation
 * 
 * Dependencies:
 * - xml2js: XML building and parsing
 * - json-schema-library: JSON schema validation
 * - AllSchemas.json: B2MML schema definitions
 */

import { Builder } from "xml2js";
import { Draft04 } from "json-schema-library";
import allSchemas from "./schemas/AllSchemas.json";

/**
 * Creates a B2MML ValueType object from a value type definition
 * @param {Object} valueType - The value type object with valueString, dataType, unitOfMeasure, and key
 * @returns {Object} - B2MML-compliant ValueType structure
 */
function createValueType(valueType) {
  let newValueType = {
    "b2mml:ValueString": valueType.valueString,
    "b2mml:DataType": valueType.dataType,
    "b2mml:UnitOfMeasure": valueType.unitOfMeasure,
    "b2mml:Key": valueType.key,
  };
  return newValueType;
}

/**
 * Creates a B2MML Amount object from a value type definition
 * @param {Object} valueType - The value type object with valueString, dataType, unitOfMeasure, and key
 * @returns {Object} - B2MML-compliant Amount structure
 */
function createAmount(valueType) {
  let newAmount = {
    "b2mml:QuantityString": valueType.valueString,
    "b2mml:DataType": valueType.dataType,
    "b2mml:UnitOfMeasure": valueType.unitOfMeasure,
    "b2mml:Key": valueType.key,
  };
  return newAmount;
}

/**
 * Creates a B2MML Material object from a workspace item
 * @param {Object} item - The workspace material item
 * @returns {Object} - B2MML-compliant Material structure
 */
function create_material(item) {
  let materials = {
    "b2mml:ID": item.id,
    "b2mml:Description": [item.description],
    "b2mml:MaterialID": item.materialID,
    "b2mml:Order": item.order,
    "b2mml:Amount": createAmount(item.amount),
  };
  return materials;
}

/**
 * Creates a B2MML Materials collection from workspace items
 * @param {Array} workspace_items - Array of workspace items
 * @param {string} id - ID for the materials collection
 * @param {string} description - Description for the materials collection
 * @param {string} materials_type - Type of materials (Input, Output, Intermediate)
 * @returns {Object} - B2MML-compliant Materials structure
 */
function create_materials(workspace_items, id, description, materials_type) {
  let materials = {
    "b2mml:ID": id,
    "b2mml:Description": [description],
    "b2mml:MaterialsType": materials_type,
    "b2mml:Material": [],
  };
  
  // Filter and create material objects for the specified type
  for (let item of workspace_items) {
    if (item.type === "material") {
      if (item.materialType === materials_type) {
        materials["b2mml:Material"].push(create_material(item));
      }
    }
  }
  return materials;
}

/**
 * Creates a B2MML ProcedureChartElement from a workspace item
 * @param {Object} item - The workspace chart element item
 * @returns {Object} - B2MML-compliant ProcedureChartElement structure
 */
function createProcedureChartElement(item) {
  let chartElement = {
    "b2mml:ID": item.id,
    "b2mml:Description": [item.description],
  };
  return chartElement;
}

/**
 * Creates a B2MML Formula structure from workspace items
 * The formula defines the inputs, intermediates, and outputs of the procedure
 * @param {Array} workspace_items - Array of workspace items
 * @returns {Object} - B2MML-compliant Formula structure
 */
function create_formula(workspace_items) {
  let formula = {
    "b2mml:Description": [
      "The formula defines the Inputs, Intermediates and Outputs of the Procedure",
    ],
    "b2mml:ProcessInputs": create_materials(
      workspace_items,
      "inputid",
      "List of Process Inputs",
      "Input"
    ),
    "b2mml:ProcessOutputs": create_materials(
      workspace_items,
      "outputsid",
      "List of Process Outputs",
      "Output"
    ),
    "b2mml:ProcessIntermediates": create_materials(
      workspace_items,
      "intermediateid",
      "List of Process Intermediates",
      "Intermediate"
    ),
    "b2mml:ProcessElementParameter": [],
  };

  return formula;
}

/**
 * Creates a B2MML ProcessElementParameter from a parameter item
 * @param {Object} item - The parameter item with id, description, and value
 * @returns {Object} - B2MML-compliant ProcessElementParameter structure
 */
function create_process_element_parameter(item) {
  let parameter = {
    "b2mml:ID": item.id,
    "b2mml:Description": [item.description],
    "b2mml:Value": createValueType(item.value),
  };
  console.debug("processParameter:", parameter);
  return parameter;
}

/**
 * Creates a B2MML OtherInformation object from an item
 * @param {Object} item - The other information item
 * @returns {Object} - B2MML-compliant OtherInformation structure
 */
function createOtherInformation(item) {
  let otherInformation = {
    "b2mml:OtherInfoID": item.otherInfoID,
    "b2mml:Description": item.description,
    "b2mml:OtherValue": [createValueType(item.otherValue[0])],
  };
  return otherInformation;
}

function createResourceConstraint(item) {
  let resourceConstraint = {
    "b2mml:ConstraintID": item.id,
    "b2mml:Description": [item.description[0]], // put in array as array input is not implemented in editor yet
    //"b2mml:ConstraintType": [item.constraintType],
    "b2mml:LifeCycleState": {},
    "b2mml:Range": createValueType(item.range), //put in array as array input is not implemented in editor yet
    //"b2mml:ResourceConstraintProperty": [{}] //put it in array as array inputs are not implemented into editor yet. Object not implemented yet
  };
  return resourceConstraint;
}

export function create_process_element_type(
  item,
  workspace_items,
  connections
) {
  // removed yet unimplemented fields which caused invalid xml
  //     - lifeCycleState:{},
  //     - sequenceOrder: {},
  //     - sequencePath: {},
  let process_element = {
    "b2mml:ID": item.id,
    "b2mml:Description": [item.description],
    "b2mml:ProcessElementType": item.processElementType,
    "b2mml:Materials": [],
    "b2mml:DirectedLink": [],
    "b2mml:ProcedureChartElement": [],
    "b2mml:ProcessElement": [],
    "b2mml:ProcessElementParameter": [],
    "b2mml:ResourceConstraint": [],
    "b2mml:OtherInformation": [],
  };

  // Parameters
  if (item.processElementParameter) {
    item.processElementParameter.forEach(function (parameter) {
      process_element["b2mml:ProcessElementParameter"].push(
        create_process_element_parameter(parameter)
      );
    });
  }

  //add materials
  process_element["b2mml:Materials"].push(
    create_materials(
      workspace_items,
      item.id + "InputMaterials",
      "Input Materials of Process" + item.id,
      "Input"
    )
  );
  process_element["b2mml:Materials"].push(
    create_materials(
      workspace_items,
      item.id + "IntermediateMaterials",
      "Intermediate Materials of Process" + item.id,
      "Intermediate"
    )
  );
  process_element["b2mml:Materials"].push(
    create_materials(
      workspace_items,
      item.id + "OutputMaterials",
      "Output Materials of Process" + item.id,
      "Output"
    )
  );

  //add directed links
  for (let connectionId in connections) {
    let connection = connections[connectionId];
    process_element["b2mml:DirectedLink"].push({
      "b2mml:ID": connectionId,
      "b2mml:Description": [],
      "b2mml:FromID": connection.sourceId,
      "b2mml:ToID": connection.targetId,
    });
  }

  //add Process Elements
  workspace_items.forEach(function (child_item) {
    if (child_item.type == "process") {
      let child_workspace_items = [];
      if (child_item.materials) {
        child_workspace_items.push(...child_item.materials);
      }
      if (child_item.processElement) {
        child_workspace_items.push(...child_item.processElement);
      }
      if (child_item.procedureChartElement) {
        child_workspace_items.push(...child_item.procedureChartElement);
      }

      process_element["b2mml:ProcessElement"].push(
        //add child itemlist and connections here here to enable makro steps
        create_process_element_type(
          child_item,
          child_workspace_items,
          child_item.directedLink
        )
      );
    }
  });

  //add Other Information
  if (item.otherInformation !== undefined) {
    for (let otherInformation of item.otherInformation) {
      process_element["b2mml:OtherInformation"].push(
        createOtherInformation(otherInformation)
      );
    }
  }
  console.debug(item);

  console.debug(
    "otherInformation: ",
    process_element["b2mml:OtherInformation"]
  );

  //add resourceConstraints
  if (item.resourceConstraint !== undefined) {
    for (let resourceConstraint of item.resourceConstraint) {
      process_element["b2mml:ResourceConstraint"].push(
        createResourceConstraint(resourceConstraint)
      );
    }
  }
  console.debug(process_element["b2mml:ResourceConstraint"]);

  //add proccessChartElements
  workspace_items.forEach(function (child_item) {
    if (child_item.type == "chart_element") {
      process_element["b2mml:ProcedureChartElement"].push(
        //add child itemlist and connections here here to enable makro steps
        createProcedureChartElement(child_item)
      );
    }
  });

  //return the created Object
  return process_element;
}

export function generate_batchml(workspace_items, connections) {
  console.log("Generating BatchML XML");
  console.log("Workspace items:", workspace_items);
  console.log("Connections:", connections);

  // Create a JavaScript object representing the XML structure
  // removed not yet implemented fiels in "value" to make batchml valid
  //    - lifeCycleState:{},
  //    - header:{},
  let gRecipe = {
    "b2mml:GRecipe": {
      $: {
        "xmlns:b2mml": "http://www.mesa.org/xml/B2MML",
      },
      "b2mml:ID": "testID",
      "b2mml:Description": [""],
      "b2mml:GRecipeType": "General",
      "b2mml:Formula": create_formula(workspace_items),
      "b2mml:ProcessProcedure": create_process_element_type(
        {
          id: "Procedure1",
          description: "This is the top level ProcessElement",
          processElementType: "Process",
          processElementParameter: [],
          otherInformation: [],
          resourceConstraint: [],
        },
        workspace_items,
        connections
      ),
      "b2mml:ResourceConstraint": [],
      "b2mml:OtherInformation": [],
    },
  };

  //function to delete all ["", null, undefined, {}, []] values
  function cleanUp(obj) {
    for (var attrKey in obj) {
      var attrValue = obj[attrKey];
      if (attrValue === null || attrValue === "" || attrValue === undefined) {
        //delete "", null, undefined
        delete obj[attrKey];
      } else if (
        Object.prototype.toString.call(attrValue) === "[object Object]"
      ) {
        if (Object.keys(attrValue).length === 0) {
          //delete empty objects
          delete obj[attrKey];
        } else {
          cleanUp(attrValue); //if not empty recursivly check children
          if (Object.keys(attrValue).length === 0) {
            //check if all children were deleted and object is empty now
            delete obj[attrKey];
          }
        }
      } else if (Array.isArray(attrValue)) {
        if (attrValue.length === 0) {
          //delete empty arrays
          delete obj[attrKey];
        } else {
          attrValue.forEach(function (arrayValue) {
            //if not empty go through elements
            cleanUp(arrayValue);
          });
          if (attrValue.length === 0) {
            //check if every element was deleted and list is empty now
            delete obj[attrKey];
          }
        }
      }
    }
  }
  cleanUp(gRecipe);

  const jsonSchema = new Draft04(allSchemas);
  const errors = jsonSchema.validate(gRecipe);
  console.log("json schema validation errors: ", errors);

  // Convert JSON to XML
  const builder = new Builder();
  const xmlString = builder.buildObject(gRecipe);
  console.log("json to xml g-recipe: ", gRecipe);

  console.log("xml String", xmlString);

  console.debug("JSON G-Secipe: ", gRecipe);
  return xmlString;
}

export function start_download(filename, file_string) {
  //automatically start download
  let pom = document.createElement("a");
  let bb = new Blob([file_string], { type: "text/plain" });
  pom.setAttribute("href", window.URL.createObjectURL(bb));
  pom.setAttribute("download", filename);
  pom.dataset.downloadurl = ["text/plain", pom.download, pom.href].join(":");
  pom.draggable = true;
  pom.classList.add("dragout");
  pom.click();
  return;
}

export function create_validate_download_general_recipe_batchml(
  workspaceItems,
  connections,
  client,
  generalRecipeConfig = null
) {
  console.log("Creating general recipe with enhanced structure");

  // Validate workspace items for parameter constraints
  const validationErrors = [];

  workspaceItems.forEach((item) => {
    if (item.type === "process" && item.processElementParameter) {
      item.processElementParameter.forEach((parameter) => {
        // Check if parameter has equipment constraints
        if (
          item.equipmentInfo &&
          item.equipmentInfo.equipment_data &&
          item.equipmentInfo.equipment_data.recipe_parameters
        ) {
          const equipmentParam =
            item.equipmentInfo.equipment_data.recipe_parameters.find(
              (p) => p.id === parameter.id || p.name === parameter.id
            );
          if (equipmentParam) {
            // Validate parameter constraints
            if (equipmentParam.min && parameter.value < equipmentParam.min) {
              validationErrors.push(
                `Parameter ${parameter.id} value ${parameter.value} is below minimum ${equipmentParam.min}`
              );
            }
            if (equipmentParam.max && parameter.value > equipmentParam.max) {
              validationErrors.push(
                `Parameter ${parameter.id} value ${parameter.value} is above maximum ${equipmentParam.max}`
              );
            }
          }
        }
      });
    }
  });

  if (validationErrors.length > 0) {
    console.warn("Validation errors found:", validationErrors);
    
    // Show user-friendly validation warning
    const warningMessage = `⚠️ Parameter validation warnings found:\n\n${validationErrors.join('\n')}\n\nThe recipe will still be exported, but some parameters may be outside recommended ranges.`;
    alert(warningMessage);
    
    // You can choose to throw an error or continue with warnings
    // throw new Error("Parameter validation failed: " + validationErrors.join(", "));
  }

  // Use provided config or default values
  const config = generalRecipeConfig || {
    productId: undefined, // No default
    productName: undefined, // No default
    version: undefined, // No default
    description: undefined, // No default
    formulaParameters: [],
    equipmentRequirements: [],
  };

  let xml_string = generate_batchml(workspaceItems, connections);
  client
    .get("/grecipe/validate", {
      params: {
        xml_string: xml_string,
      },
    })
    .then((response) => {
      if (response.status == 200) {
        // handle success
        console.log("BatchML is valid!");
        alert("✅ General Recipe successfully validated against XSD schema!\n\nThe XML file will now download.");
        start_download("Verfahrensrezept.xml", xml_string);
      }
    })
    .catch((error) => {
      if (error.request.status == 400) {
        // handle success
        console.log("BatchML is not valid!");
        start_download("invalid_Verfahrensrezept.xml", xml_string);
        window.alert(
          "CAUTION: The generated Batchml is invalid, but is nevertheless downloaded."
        );
      } else if (error.request.status == 404) {
        console.log(
          "Unable to reach the server, are you maybe only running the client code?"
        );
        console.log(error);
        start_download("unchecked_Verfahrensrezept.xml", xml_string);
        window.alert(
          "Error 404: Unable to reach the server, when validating the Batchml. Are you maybe only running the client code? For complete error message look into the browser devtools console"
        );
      } else {
        // handle error
        console.log("error trying to validate the BatchML file:");
        console.log(error);
        window.alert(
          "Error: The Batchml could not be validated. For complete error message look into the browser devtools console."
        );
      }
    });
}

/**
 * Main generator function for Master Recipe BatchML
 * @param {Array} workspace_items - processes/materials in the workspace
 * @param {Object} jsplumb_connections - connections between elements
 * @param {Array} equipment_items - equipment details
 * @param {Object} batchMetadata - metadata for the batch (IDs, dates, description, etc.)
 * @returns {string} XML string of Master Recipe BatchML
 */
export function generate_master_recipe_batchml() {
  const batchInformation = {
    "b2mml:BatchInformation": {
      $: {
        "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "xmlns:b2mml": "http://www.mesa.org/xml/B2MML",
        "xsi:schemaLocation":
          "http://www.mesa.org/xml/B2MML Schema/AllSchemas.xsd",
      },
      "b2mml:ListHeader": {
        "b2mml:ID": "ListHeadID",
        "b2mml:CreateDate": "2025-01-21T10:27:00+01:00",
      },
      "b2mml:Description":
        ' This Batch Information includes the Master Recipe "MasterRecipeHC" to be executed on the modular plant at IAT using the HC10 stirring device ',
      "b2mml:MasterRecipe": {
        "b2mml:ID": "MasterRecipeHC",
        "b2mml:Version": "1.0.0",
        "b2mml:VersionDate": "2025-01-21T10:27:00+01:00",
        "b2mml:Description":
          "Example of a master recipe for the modular plant Honeycomb with HC10 stirring service",
        "b2mml:Header": {
          "b2mml:ProductID": "StirredWater1",
          "b2mml:ProductName": "Stirred Water",
        },
        "b2mml:EquipmentRequirement": [
          {
            "b2mml:ID": "Equipment Requirement for the HCs",
            "b2mml:Constraint": {
              "b2mml:ID": "Liquid constraint for the HC",
              "b2mml:Condition": "Material == H2O",
            },
            "b2mml:Description":
              "Only water is allowed to used for the stirring process",
          },
        ],
        "b2mml:Formula": {
          "b2mml:Parameter": [
            {
              "b2mml:ID": "001:c90a9289-6b7d-4409-91f4-3c7fda23549a",
              "b2mml:ParameterType": "ProcessParameter",
              "b2mml:ParameterSubType": "ST",
              "b2mml:Value": {
                "b2mml:ValueString": "3",
                "b2mml:DataInterpretation": "Constant",
                "b2mml:DataType": "duration",
                "b2mml:UnitOfMeasure": "Sekunde",
              },
            },
            {
              "b2mml:ID": "002:c90a9289-6b7d-4409-91f4-3c7fda23549a",
              "b2mml:ParameterType": "ProcessParameter",
              "b2mml:ParameterSubType": "ST",
              "b2mml:Value": {
                "b2mml:ValueString": "5",
                "b2mml:DataInterpretation": "Constant",
                "b2mml:DataType": "duration",
                "b2mml:UnitOfMeasure": "Sekunde",
              },
            },
            {
              "b2mml:ID": "003:c90a9289-6b7d-4409-91f4-3c7fda23549a",
              "b2mml:ParameterType": "ProcessParameter",
              "b2mml:ParameterSubType": "ST",
              "b2mml:Value": {
                "b2mml:ValueString": "10",
                "b2mml:DataInterpretation": "Constant",
                "b2mml:DataType": "duration",
                "b2mml:UnitOfMeasure": "Sekunde",
              },
            },
          ],
        },
        "b2mml:ProcedureLogic": {
          "b2mml:Link": [
            {
              "b2mml:ID": "L1",
              "b2mml:FromID": {
                "b2mml:FromIDValue": "S1",
                "b2mml:FromType": "Step",
                "b2mml:IDScope": "External",
              },
              "b2mml:ToID": {
                "b2mml:ToIDValue": "T1",
                "b2mml:ToType": "Transition",
                "b2mml:IDScope": "External",
              },
              "b2mml:LinkType": "ControlLink",
              "b2mml:Depiction": "LineAndArrow",
              "b2mml:EvaluationOrder": "1",
              "b2mml:Description": "string",
            },
            {
              "b2mml:ID": "L2",
              "b2mml:FromID": {
                "b2mml:FromIDValue": "T1",
                "b2mml:FromType": "Transition",
                "b2mml:IDScope": "External",
              },
              "b2mml:ToID": {
                "b2mml:ToIDValue": "S2",
                "b2mml:ToType": "Step",
                "b2mml:IDScope": "External",
              },
              "b2mml:LinkType": "ControlLink",
              "b2mml:Depiction": "LineAndArrow",
              "b2mml:EvaluationOrder": "1",
              "b2mml:Description": "string",
            },
            {
              "b2mml:ID": "L3",
              "b2mml:FromID": {
                "b2mml:FromIDValue": "S2",
                "b2mml:FromType": "Step",
                "b2mml:IDScope": "External",
              },
              "b2mml:ToID": {
                "b2mml:ToIDValue": "T2",
                "b2mml:ToType": "Transition",
                "b2mml:IDScope": "External",
              },
              "b2mml:LinkType": "ControlLink",
              "b2mml:Depiction": "LineAndArrow",
              "b2mml:EvaluationOrder": "1",
              "b2mml:Description": "string",
            },
            {
              "b2mml:ID": "L4",
              "b2mml:FromID": {
                "b2mml:FromIDValue": "T2",
                "b2mml:FromType": "Transition",
                "b2mml:IDScope": "External",
              },
              "b2mml:ToID": {
                "b2mml:ToIDValue": "S3",
                "b2mml:ToType": "Step",
                "b2mml:IDScope": "External",
              },
              "b2mml:LinkType": "ControlLink",
              "b2mml:Depiction": "LineAndArrow",
              "b2mml:EvaluationOrder": "1",
              "b2mml:Description": "string",
            },
            {
              "b2mml:ID": "L5",
              "b2mml:FromID": {
                "b2mml:FromIDValue": "S3",
                "b2mml:FromType": "Step",
                "b2mml:IDScope": "External",
              },
              "b2mml:ToID": {
                "b2mml:ToIDValue": "T3",
                "b2mml:ToType": "Transition",
                "b2mml:IDScope": "External",
              },
              "b2mml:LinkType": "ControlLink",
              "b2mml:Depiction": "LineAndArrow",
              "b2mml:EvaluationOrder": "1",
              "b2mml:Description": "string",
            },
            {
              "b2mml:ID": "L6",
              "b2mml:FromID": {
                "b2mml:FromIDValue": "T3",
                "b2mml:FromType": "Transition",
                "b2mml:IDScope": "External",
              },
              "b2mml:ToID": {
                "b2mml:ToIDValue": "S4",
                "b2mml:ToType": "Step",
                "b2mml:IDScope": "External",
              },
              "b2mml:LinkType": "ControlLink",
              "b2mml:Depiction": "LineAndArrow",
              "b2mml:EvaluationOrder": "1",
              "b2mml:Description": "string",
            },
            {
              "b2mml:ID": "L7",
              "b2mml:FromID": {
                "b2mml:FromIDValue": "S4",
                "b2mml:FromType": "Step",
                "b2mml:IDScope": "External",
              },
              "b2mml:ToID": {
                "b2mml:ToIDValue": "T4",
                "b2mml:ToType": "Transition",
                "b2mml:IDScope": "External",
              },
              "b2mml:LinkType": "ControlLink",
              "b2mml:Depiction": "LineAndArrow",
              "b2mml:EvaluationOrder": "1",
              "b2mml:Description": "string",
            },
            {
              "b2mml:ID": "L8",
              "b2mml:FromID": {
                "b2mml:FromIDValue": "T4",
                "b2mml:FromType": "Transition",
                "b2mml:IDScope": "External",
              },
              "b2mml:ToID": {
                "b2mml:ToIDValue": "S5",
                "b2mml:ToType": "Step",
                "b2mml:IDScope": "External",
              },
              "b2mml:LinkType": "ControlLink",
              "b2mml:Depiction": "LineAndArrow",
              "b2mml:EvaluationOrder": "1",
              "b2mml:Description": "string",
            },
          ],
          "b2mml:Step": [
            {
              "b2mml:ID": "S1",
              "b2mml:RecipeElementID": "Init",
              "b2mml:RecipeElementVersion": "",
              "b2mml:Description": "Init",
            },
            {
              "b2mml:ID": "S2",
              "b2mml:RecipeElementID":
                "001:dedc4be7-2550-44a2-9d85-c9fbc83dd0dc",
              "b2mml:RecipeElementVersion": "",
              "b2mml:Description": "001:Stirring:Duration_Stirring",
            },
            {
              "b2mml:ID": "S3",
              "b2mml:RecipeElementID":
                "002:dedc4be7-2550-44a2-9d85-c9fbc83dd0dc",
              "b2mml:RecipeElementVersion": "",
              "b2mml:Description": "002:Stirring:Duration_Stirring",
            },
            {
              "b2mml:ID": "S4",
              "b2mml:RecipeElementID":
                "003:dedc4be7-2550-44a2-9d85-c9fbc83dd0dc",
              "b2mml:RecipeElementVersion": "",
              "b2mml:Description": "003:Stirring:Duration_Stirring",
            },
            {
              "b2mml:ID": "S5",
              "b2mml:RecipeElementID": "End",
              "b2mml:RecipeElementVersion": "",
              "b2mml:Description": '"End of Procedure"',
            },
          ],
          "b2mml:Transition": [
            { "b2mml:ID": "T1", "b2mml:Condition": "True" },
            {
              "b2mml:ID": "T2",
              "b2mml:Condition":
                "Step 001:Stirring:Duration_Stirring is Completed",
            },
            {
              "b2mml:ID": "T3",
              "b2mml:Condition":
                "Step 002:Stirring:Duration_Stirring is Completed",
            },
            {
              "b2mml:ID": "T4",
              "b2mml:Condition":
                "Step 003:Stirring:Duration_Stirring is Completed",
            },
          ],
        },
        "b2mml:RecipeElement": [
          {
            "b2mml:ID": "End",
            "b2mml:RecipeElementType": "End",
          },
          {
            "b2mml:ID": "002:dedc4be7-2550-44a2-9d85-c9fbc83dd0dc",
            "b2mml:Description": "Continuous Stirring Procedure",
            "b2mml:RecipeElementType": "Operation",
            "b2mml:ActualEquipmentID": "HC10Instance",
            "b2mml:EquipmentRequirement": [
              { "b2mml:ID": "Equipment Requirement for the HCs" },
            ],
            "b2mml:Parameter": [
              {
                "b2mml:ID": "002:c90a9289-6b7d-4409-91f4-3c7fda23549a",
                "b2mml:ParameterType": "ProcessParameter",
              },
            ],
          },
          {
            "b2mml:ID": "003:dedc4be7-2550-44a2-9d85-c9fbc83dd0dc",
            "b2mml:Description": "Continuous Stirring Procedure",
            "b2mml:RecipeElementType": "Operation",
            "b2mml:ActualEquipmentID": "HC10Instance",
            "b2mml:EquipmentRequirement": [
              { "b2mml:ID": "Equipment Requirement for the HCs" },
            ],
            "b2mml:Parameter": [
              {
                "b2mml:ID": "003:c90a9289-6b7d-4409-91f4-3c7fda23549a",
                "b2mml:ParameterType": "ProcessParameter",
              },
            ],
          },
        ],
      },
      "b2mml:EquipmentElement": [
        {
          "b2mml:ID": "HC10Instance",
          "b2mml:EquipmentElementType": "Other",
          "b2mml:EquipmentElementLevel": "EquipmentModule",
          "b2mml:EquipmentProceduralElement": [
            {
              "b2mml:ID": "c4ed5907-63df-4f88-a3f1-29350af52e47",
              "b2mml:Description": "HC10:Heating:Duration_Heating",
              "b2mml:EquipmentProceduralElementType": "Procedure",
              "b2mml:Parameter": [
                {
                  "b2mml:ID": "2ed89d73-0ada-487a-90a3-5a5aca3fec1f",
                  "b2mml:Description": "Duration_Heating_Param",
                  "b2mml:ParameterType": "ProcessParameter",
                  "b2mml:ParameterSubType": "ST",
                  "b2mml:Value": {
                    "b2mml:ValueString": "30",
                    "b2mml:DataInterpretation": "Constant",
                    "b2mml:DataType": "duration",
                    "b2mml:UnitOfMeasure": "second",
                  },
                },
              ],
            },
            {
              "b2mml:ID": "b95c38b6-c17c-41c5-9847-1ad534793bf7",
              "b2mml:Description": "HC10:Heating:Temperatur_Heating",
              "b2mml:EquipmentProceduralElementType": "Procedure",
              "b2mml:Parameter": [
                {
                  "b2mml:ID": "a75fc547-b08b-43ec-b0bd-3bc7a0df04e9",
                  "b2mml:Description": "Temperatur_Heating_Param",
                  "b2mml:ParameterType": "ProcessParameter",
                  "b2mml:ParameterSubType": "ST",
                  "b2mml:Value": {
                    "b2mml:ValueString": "20",
                    "b2mml:DataInterpretation": "Constant",
                    "b2mml:DataType": "Measure",
                    "b2mml:UnitOfMeasure": "degree Celsius",
                  },
                },
              ],
            },
            {
              "b2mml:ID": "33706a6d-9198-47c4-b0e9-617111dfc76e",
              "b2mml:Description": "HC10:Transport:Duration_Transport",
              "b2mml:EquipmentProceduralElementType": "Procedure",
              "b2mml:Parameter": [
                {
                  "b2mml:ID": "f0907c42-05b4-46dd-8a84-e5de82e861c8",
                  "b2mml:Description": "Duration_Transport_Param",
                  "b2mml:ParameterType": "ProcessParameter",
                  "b2mml:ParameterSubType": "ST",
                  "b2mml:Value": {
                    "b2mml:ValueString": "30",
                    "b2mml:DataInterpretation": "Constant",
                    "b2mml:DataType": "duration",
                    "b2mml:UnitOfMeasure": "second",
                  },
                },
              ],
            },
            {
              "b2mml:ID": "c19d5a9b-8d69-4d52-b3d4-e19bee6a2c4f",
              "b2mml:Description": "HC10:Transport:Complete_Transport",
              "b2mml:EquipmentProceduralElementType": "Procedure",
            },
            {
              "b2mml:ID": "8489e2ed-2454-4d3c-a0e1-7b9bf0000f94",
              "b2mml:Description": "HC10:Emptying:Duration_Emptying",
              "b2mml:EquipmentProceduralElementType": "Procedure",
              "b2mml:Parameter": [
                {
                  "b2mml:ID": "15d6eadc-b197-4560-a22b-3742c9f254ca",
                  "b2mml:Description": "Duration_Emptying_Param",
                  "b2mml:ParameterType": "ProcessParameter",
                  "b2mml:ParameterSubType": "ST",
                  "b2mml:Value": {
                    "b2mml:ValueString": "30",
                    "b2mml:DataInterpretation": "Constant",
                    "b2mml:DataType": "duration",
                    "b2mml:UnitOfMeasure": "second",
                  },
                },
              ],
            },
            {
              "b2mml:ID": "5e16fee8-4984-4a06-ad57-86835ab67748",
              "b2mml:Description": "HC10:Emptying:Complete_Emptying",
              "b2mml:EquipmentProceduralElementType": "Procedure",
            },
            {
              "b2mml:ID": "caf439dc-90fe-41d4-96c2-0f28de6d0df6",
              "b2mml:Description": "HC10:Circulate:Duration_Circulation",
              "b2mml:EquipmentProceduralElementType": "Procedure",
              "b2mml:Parameter": [
                {
                  "b2mml:ID": "8b706a51-8e13-4d43-85e3-01e56060e85a",
                  "b2mml:Description": "Duration_Circulation_Param",
                  "b2mml:ParameterType": "ProcessParameter",
                  "b2mml:ParameterSubType": "ST",
                  "b2mml:Value": {
                    "b2mml:ValueString": "30",
                    "b2mml:DataInterpretation": "Constant",
                    "b2mml:DataType": "duration",
                    "b2mml:UnitOfMeasure": "second",
                  },
                },
              ],
            },
            {
              "b2mml:ID": "991dfdeb-1b96-4905-ad1a-c3faf24ae988",
              "b2mml:Description": "HC10:Circulate:Continous_Circulation",
              "b2mml:EquipmentProceduralElementType": "Procedure",
            },
            {
              "b2mml:ID": "948d5e71-76b1-4093-b11c-6d29a70e0e84",
              "b2mml:Description": "HC10:Stirring:Continuous_Stirring",
              "b2mml:EquipmentProceduralElementType": "Procedure",
            },
            {
              "b2mml:ID": "dedc4be7-2550-44a2-9d85-c9fbc83dd0dc",
              "b2mml:Description": "HC10:Stirring:Duration_Stirring",
              "b2mml:EquipmentProceduralElementType": "Procedure",
              "b2mml:Parameter": [
                {
                  "b2mml:ID": "c90a9289-6b7d-4409-91f4-3c7fda23549a",
                  "b2mml:Description": "Duration_Stirring_Param",
                  "b2mml:ParameterType": "ProcessParameter",
                  "b2mml:ParameterSubType": "ST",
                  "b2mml:Value": {
                    "b2mml:ValueString": "30",
                    "b2mml:DataInterpretation": "Constant",
                    "b2mml:DataType": "duration",
                    "b2mml:UnitOfMeasure": "second",
                  },
                },
              ],
            },
          ],
          "b2mml:EquipmentConnection": [
            {
              "b2mml:ID": "EquipmentConnectionHC10toHC20",
              "b2mml:ConnectionType": "MaterialMovement",
              "b2mml:FromEquipmentID": "HC10Instance",
              "b2mml:ToEquipmentID": "HC20Instance",
            },
          ],
        },
        {
          "b2mml:ID": "",
          "b2mml:EquipmentElementType": "Element",
          "b2mml:EquipmentElementLevel": "ProcessCell",
          "b2mml:EquipmentConnection": [
            {
              "b2mml:ID": "EquipmentConnectionHC30toHC10",
              "b2mml:ConnectionType": "MaterialMovement",
              "b2mml:FromEquipmentID": "HC30Instance",
              "b2mml:ToEquipmentID": "HC10Instance",
            },
          ],
        },
      ],
    },
  };

  const builder = new Builder({ headless: true, pretty: true });
  return builder.buildObject(batchInformation);
}

/**
 * Creates, validates, and downloads a master recipe in B2MML XML format
 * 
 * This function performs several key operations:
 * 1. Parameter validation against equipment constraints
 * 2. Equipment and material information extraction
 * 3. Topological sorting of recipe steps
 * 4. B2MML XML generation with enhanced structure
 * 5. Server-side XSD validation
 * 6. Automatic download of valid XML or error details
 * 
 * The function supports both MTP and AAS equipment sources and provides
 * comprehensive error handling with user-friendly feedback.
 * 
 * @param {Array} workspaceItems - Array of workspace items (processes, materials, etc.)
 * @param {Array} connections - Array of connections between workspace items
 * @param {Object} client - HTTP client for server communication
 * @param {Object} masterRecipeConfig - Master recipe configuration object
 */
export function create_validate_download_master_recipe_batchml(
  workspaceItems,
  connections,
  client,
  masterRecipeConfig = null
) {
  console.log("Creating master recipe with enhanced structure");

  // Validate workspace items for parameter constraints
  // This ensures that parameter values fall within equipment-defined ranges
  const validationErrors = [];

  workspaceItems.forEach((item) => {
    if (item.type === "process" && item.processElementParameter) {
      item.processElementParameter.forEach((parameter) => {
        // Check if parameter has equipment constraints defined
        if (
          item.equipmentInfo &&
          item.equipmentInfo.equipment_data &&
          item.equipmentInfo.equipment_data.recipe_parameters
        ) {
          // Find matching equipment parameter by ID or name
          const equipmentParam =
            item.equipmentInfo.equipment_data.recipe_parameters.find(
              (p) => p.id === parameter.id || p.name === parameter.id
            );
          
          if (equipmentParam) {
            // Validate parameter value against minimum constraint
            if (equipmentParam.min && parameter.value < equipmentParam.min) {
              validationErrors.push(
                `Parameter ${parameter.id} value ${parameter.value} is below minimum ${equipmentParam.min}`
              );
            }
            // Validate parameter value against maximum constraint
            if (equipmentParam.max && parameter.value > equipmentParam.max) {
              validationErrors.push(
                `Parameter ${parameter.id} value ${parameter.value} is above maximum ${equipmentParam.max}`
              );
            }
          }
        }
      });
    }
  });

  // Display validation warnings to user but continue with export
  if (validationErrors.length > 0) {
    console.warn("Validation errors found:", validationErrors);
    
    // Show user-friendly validation warning
    const warningMessage = `⚠️ Parameter validation warnings found:\n\n${validationErrors.join('\n')}\n\nThe recipe will still be exported, but some parameters may be outside recommended ranges.`;
    alert(warningMessage);
    
    // Note: We continue with warnings rather than failing the export
    // This allows users to see what needs attention while still getting their recipe
  }

  // Use provided configuration or fall back to default values
  // The config object contains essential recipe metadata like product ID, name, version
  const config = masterRecipeConfig || {
    productId: undefined, // No default - must be provided by user
    productName: undefined, // No default - must be provided by user
    version: undefined, // No default - must be provided by user
    description: undefined, // No default - can be empty
    formulaParameters: [], // Empty array for default
    equipmentRequirements: [], // Empty array for default
  };

  // Extract equipment info from workspace items
  // These sets collect unique equipment instances and requirements across all processes
  const equipmentInstances = new Set();
  const equipmentRequirements = new Set();
  const formulaParameters = [];
  const materialInputs = [];
  const materialOutputs = [];

  // Collect equipment and parameter information from all workspace items
  workspaceItems.forEach((item) => {
    if (item.type === "process" && item.equipmentInfo) {
      console.log(
        "Processing equipment info for item:",
        item.id,
        item.equipmentInfo
      );

      // Handle MTP (Manufacturing Technology Platform) equipment data structure
      if (
        item.equipmentInfo.source_type === "MTP" &&
        item.equipmentInfo.equipment_data
      ) {
        const equipmentData = item.equipmentInfo.equipment_data;

        // Add equipment instance from service info
        if (equipmentData.service_info && equipmentData.service_info.id) {
          equipmentInstances.add(equipmentData.service_info.id);
        }

        // Add equipment requirements from MTP data
        if (
          equipmentData.equipment_requirements &&
          equipmentData.equipment_requirements.length > 0
        ) {
          equipmentData.equipment_requirements.forEach((req) => {
            if (req.id) {
              equipmentRequirements.add(req.id);
            }
          });
        }

        // Add formula parameters from recipe parameters
        if (
          equipmentData.recipe_parameters &&
          equipmentData.recipe_parameters.length > 0
        ) {
          equipmentData.recipe_parameters.forEach((param) => {
            formulaParameters.push({
              "b2mml:ID": String(param.id),
              "b2mml:ParameterType": "ProcessParameter",
              "b2mml:ParameterSubType": param.paramElem?.Type || "ST",
              "b2mml:Value": {
                "b2mml:ValueString": param.default !== undefined && param.default !== null ? String(param.default) : "10",
                "b2mml:DataInterpretation": "Constant",
                "b2mml:DataType": param.unit ? "Measure" : "duration",
                "b2mml:UnitOfMeasure": param.unit || "seconds",
              },
            });
          });
        }
      }

      // Legacy support for old structure
      else {
        // Add equipment instance
        if (item.equipmentInfo.instance) {
          equipmentInstances.add(item.equipmentInfo.instance);
        }

        // Add equipment requirement
        if (item.equipmentInfo.requirement) {
          equipmentRequirements.add(item.equipmentInfo.requirement);
        }

        // Add formula parameters
        if (item.equipmentInfo.parameters) {
          item.equipmentInfo.parameters.forEach((param) => {
            formulaParameters.push({
              "b2mml:ID": String(param.id),
              "b2mml:ParameterType": "ProcessParameter",
              "b2mml:ParameterSubType": param.subType || "ST",
              "b2mml:Value": {
                "b2mml:ValueString": param.value !== undefined && param.value !== null ? String(param.value) : "10",
                "b2mml:DataInterpretation": "Constant",
                "b2mml:DataType": param.dataType || "duration",
                "b2mml:UnitOfMeasure": param.unit || "seconds",
              },
            });
          });
        }
      }
    }

    // Collect material information
    if (item.type === "material") {
      const materialInfo = {
        "b2mml:ID": item.id,
        "b2mml:Description": item.description || item.name,
        "b2mml:MaterialType": item.materialType || "Intermediate",
        "b2mml:Amount": {
          "b2mml:ValueString": item.amount?.valueString || "1",
          "b2mml:UnitOfMeasure": item.amount?.unitOfMeasure || "kg",
        },
      };

      if (item.materialType === "Input") {
        materialInputs.push(materialInfo);
      } else if (item.materialType === "Output") {
        materialOutputs.push(materialInfo);
      }
    }
  });

  // Add configured formula parameters
  if (config.formulaParameters && config.formulaParameters.length > 0) {
    config.formulaParameters.forEach((param) => {
      if (param.id && param.value) {
        formulaParameters.push({
          "b2mml:ID": String(param.id),
          "b2mml:ParameterType": "ProcessParameter",
          "b2mml:ParameterSubType": "ST",
          "b2mml:Value": {
            "b2mml:ValueString": String(param.value),
            "b2mml:DataInterpretation": "Constant",
            "b2mml:DataType": param.dataType || "duration",
            "b2mml:UnitOfMeasure": param.unit || "seconds",
          },
        });
      }
    });
  }

  // Add configured equipment requirements
  const allEquipmentRequirements = [];
  if (config.equipmentRequirements && config.equipmentRequirements.length > 0) {
    config.equipmentRequirements.forEach((req) => {
      if (req.id) {
        allEquipmentRequirements.push({
          "b2mml:ID": req.id,
          "b2mml:Constraint": {
            "b2mml:ID": "Material constraint",
            "b2mml:Condition": req.constraint || "Material == H2O",
          },
          "b2mml:Description": req.description || "Equipment requirement for the process",
        });
      }
    });
  }

  // Map custom recipe element types to BatchML standard types with enhanced hierarchy support
  const recipeElementTypeMap = {
    'Recipe Procedure Containing Lower Level PFC': 'Procedure',
    'Recipe Unit Procedure Containing Lower Level PFC': 'UnitProcedure',
    'Recipe Operation Containing Lower Level PFC': 'Operation',
    'Recipe Procedure Referencing Equipment Procedure': 'Procedure',
    'Recipe Unit Procedure Referencing Equipment Unit Procedure': 'UnitProcedure',
    'Recipe Operation Referencing Equipment Operation': 'Operation',
    'Recipe Phase Referencing Equipment Phase': 'Phase',
    'Condition': 'Other',
    'Begin': 'Begin',
    'End': 'End',
    'Allocation': 'Allocation',
    'Synchronization Point': 'Other',
    'Synchronization Line': 'Other',
    'Synchronization Line Indicating Material Transfer': 'Other',
    'Begin and end Sequence Selection': 'Other',
    'Begin and end Simultaneous Sequence': 'Other',
    // Enhanced support for hierarchical structures
    'Procedure': 'Procedure',
    'UnitProcedure': 'UnitProcedure',
    'Operation': 'Operation',
    'Phase': 'Phase',
    'Process': 'Operation',
    'Recipe Element': 'Other',
  };

  // build the enhanced JSON payload
  const payload = {
    listHeader: {
      id: "ListHeadID",
      createDate: new Date().toISOString(),
    },
    description: config.description || "",
    masterRecipe: {
      id: "MasterRecipeHC",
      version: config.version || "",
      versionDate: new Date().toISOString(),
      description: config.description || "",
      header: {
        productId: config.productId || "",
        productName: config.productName || "",
      },
      equipmentRequirement: allEquipmentRequirements, // No default
      formula: {
        parameter: formulaParameters, // Enhanced parameters with actual values
        material: [
          ...materialInputs.map(m => ({ 
            ...m, 
            "b2mml:MaterialType": "Input",
            "b2mml:Description": m["b2mml:Description"] || `Input material ${m["b2mml:ID"]}`,
          })),
          ...materialOutputs.map(m => ({ 
            ...m, 
            "b2mml:MaterialType": "Output",
            "b2mml:Description": m["b2mml:Description"] || `Output material ${m["b2mml:ID"]}`,
          }))
        ],
        // Enhanced formula description
        description: "Formula defines the Inputs, Intermediates, Outputs and Parameters of the Master Recipe",
      },
      procedureLogic: (() => {
        // --- Step 1: Generate unique, prefixed IDs for each RecipeElement use ---
        const elementUseCount = {};
        const recipeElements = workspaceItems.filter(i => i.type === "process" || i.type === "recipe_element");
        const stepIdMap = {}; // Define stepIdMap here
        
        // First, count occurrences of each ID
        recipeElements.forEach(i => {
          elementUseCount[i.id] = (elementUseCount[i.id] || 0) + 1;
        });
        
        const elementPrefixCount = {};
        const elementToPrefixedId = new Map(); // Map workspace item to prefixed ID
        
        recipeElements.forEach((i) => { // Remove unused index parameter
          elementPrefixCount[i.id] = (elementPrefixCount[i.id] || 0) + 1;
          // Only prefix if the ID is not unique
          const prefix = elementUseCount[i.id] > 1 ? String(elementPrefixCount[i.id]).padStart(3, '0') + ':' : '';
          const prefixedId = `${prefix}${i.id}`;
          const key = i.id + '_' + elementPrefixCount[i.id];
          elementToPrefixedId.set(i, prefixedId);
          stepIdMap[key] = prefixedId;
        });

        // --- Step 2: Topologically sort steps based on connections ---
        // This ensures that recipe steps are ordered logically based on their dependencies
        // rather than the order they were added to the workspace
        const logicalConnections = connections.filter(c => c.isTransition);
        
        // Build adjacency list and in-degree count for topological sort
        // The adjacency list represents the directed graph of step dependencies
        // The in-degree count tracks how many steps must complete before each step can start
        const adjacencyList = new Map();
        const inDegree = new Map();
        
        // Initialize all recipe elements with empty adjacency lists and zero in-degree
        recipeElements.forEach(item => {
          adjacencyList.set(item.id, []);
          inDegree.set(item.id, 0);
        });
        
        // Build the dependency graph from logical connections
        // Each connection represents a dependency: source step must complete before target step
        logicalConnections.forEach(conn => {
          const sourceId = conn.sourceId;
          const targetId = conn.targetId;
          
          // Only add edges between recipe elements (not to/from transitions)
          // This ensures we're building a graph of actual process steps, not control flow
          if (adjacencyList.has(sourceId) && adjacencyList.has(targetId)) {
            adjacencyList.get(sourceId).push(targetId);
            inDegree.set(targetId, inDegree.get(targetId) + 1);
          }
        });
        
        // Topological sort using Kahn's algorithm
        // This algorithm processes nodes in dependency order, ensuring that
        // all prerequisites are completed before a step is processed
        const sortedSteps = [];
        const queue = [];
        
        // Add all nodes with in-degree 0 to the initial queue
        // These are steps that have no dependencies and can start immediately
        inDegree.forEach((degree, itemId) => {
          if (degree === 0) {
            queue.push(itemId);
          }
        });
        
        // Process the queue until all nodes are processed
        while (queue.length > 0) {
          const currentId = queue.shift();
          sortedSteps.push(currentId);
          
          // Reduce in-degree for all neighbors (dependent steps)
          // When a step's in-degree reaches 0, it can be added to the queue
          adjacencyList.get(currentId).forEach(neighborId => {
            inDegree.set(neighborId, inDegree.get(neighborId) - 1);
            if (inDegree.get(neighborId) === 0) {
              queue.push(neighborId);
            }
          });
        }
        
        // Handle cycles by adding remaining items (they'll be added at the end)
        // In a valid recipe, cycles should be rare, but this ensures robustness
        inDegree.forEach((degree, itemId) => {
          if (degree > 0 && !sortedSteps.includes(itemId)) {
            sortedSteps.push(itemId);
          }
        });
        
        // Create steps array in topological order
        // This ensures that the B2MML XML has steps in logical execution order
        const steps = sortedSteps.map((itemId, index) => {
          const item = recipeElements.find(i => i.id === itemId);
          const prefixedId = elementToPrefixedId.get(item);
          
          return {
            "b2mml:ID": `S${index + 1}`, // Sequential step ID based on logical order
            "b2mml:RecipeElementID": prefixedId, // Reference to the actual recipe element
            "b2mml:RecipeElementVersion": "", // Version information (if applicable)
            "b2mml:Description": item.description || `${prefixedId}: ${item.equipmentInfo?.equipment_data?.service_info?.name || item.equipmentInfo?.service || item.recipeElementType || "Process"}`,
          };
        });
        
        // --- Step 3: Generate transitions with actual conditions ---
        // Map each logical connection to a transition and keep a stable mapping
        // Transitions represent the control flow between steps and include conditions
        const transitionIdMap = new Map();
        const transitions = logicalConnections.map((c, index) => {
          const transitionId = `T${index + 1}`;
          transitionIdMap.set(c, transitionId);
          const targetItem = workspaceItems.find(item => item.id === c.targetId);
          
          // Extract condition from the target item (the step that has the condition)
          let condition = "True";
          if (targetItem && targetItem.conditionGroup && targetItem.conditionGroup.children && targetItem.conditionGroup.children.length > 0) {
            // Use the new nested condition structure
            const cleanedGroup = cleanConditionGroup(targetItem.conditionGroup);
            console.log('Exporting cleanedGroup:', JSON.stringify(cleanedGroup, null, 2));
            if (cleanedGroup) {
              condition = stringifyConditionGroup(cleanedGroup);
              console.log('Exported condition string:', condition);
            } else {
              condition = 'True';
            }
          } else if (Array.isArray(targetItem.conditionList) && targetItem.conditionList.length > 0) {
            // Fallback for legacy condition format (flat array)
            condition = targetItem.conditionList.map((cond, idx) => {
              let condStr = `${cond.keyword} ${cond.operator} ${cond.value}`;
              if (cond.instance) condStr = `${cond.instance}: ${condStr}`;
              if (cond.binaryOperator && idx < targetItem.conditionList.length - 1) {
                condStr += ` ${cond.binaryOperator}`;
              }
              return condStr;
            }).join(' ');
          }
          return {
            "b2mml:ID": transitionId,
            "b2mml:Condition": condition,
          };
        });
        
        // --- Step 4: Generate links between steps and transitions ---
        // Map each connection to the correct S#/T# IDs
        const links = logicalConnections.map((c, index) => {
          // Find the step index for source and target using the sorted steps
          const sourceStepIndex = steps.findIndex(s => s["b2mml:RecipeElementID"] === elementToPrefixedId.get(workspaceItems.find(item => item.id === c.sourceId)));
          const targetStepIndex = steps.findIndex(s => s["b2mml:RecipeElementID"] === elementToPrefixedId.get(workspaceItems.find(item => item.id === c.targetId)));
          
          // If not found in steps, it may be a transition
          const sourceTransitionIndex = logicalConnections.findIndex(conn => conn === c);
          const targetTransitionIndex = logicalConnections.findIndex(conn => conn === c);
          
          // Determine FromType/ToType and IDs
          let fromType, fromIdValue;
          if (sourceStepIndex !== -1) {
            fromType = "Step";
            fromIdValue = `S${sourceStepIndex + 1}`;
          } else {
            fromType = "Transition";
            fromIdValue = `T${sourceTransitionIndex + 1}`;
          }
          
          let toType, toIdValue;
          if (targetStepIndex !== -1) {
            toType = "Step";
            toIdValue = `S${targetStepIndex + 1}`;
          } else {
            toType = "Transition";
            toIdValue = `T${targetTransitionIndex + 1}`;
          }
          
          return {
            "b2mml:ID": `L${index + 1}`,
            "b2mml:FromID": {
              "b2mml:FromIDValue": fromIdValue,
              "b2mml:FromType": fromType,
              "b2mml:IDScope": "External"
            },
            "b2mml:ToID": {
              "b2mml:ToIDValue": toIdValue,
              "b2mml:ToType": toType,
              "b2mml:IDScope": "External"
            },
            "b2mml:LinkType": "ControlLink",
            "b2mml:Depiction": "LineAndArrow",
            "b2mml:EvaluationOrder": "1",
            "b2mml:Description": `Link from ${fromIdValue} to ${toIdValue}`
          };
        });
        
        return { step: steps, transition: transitions, link: links };
      })(),
      recipeElement: workspaceItems
        .filter((i) => i.type === "process" || i.type === "recipe_element")
        .map((i) => {
          // Get the appropriate equipment ID and parameters
          let actualEquipmentID = `${i.id}Instance`;
          let equipmentRequirement = [];
          let parameters = [];
          let recipeElementID = i.id; // Default to workspace item ID
          let description = i.description || `${i.id}: ${i.equipmentInfo?.equipment_data?.service_info?.name || i.equipmentInfo?.service || i.recipeElementType || "Process"}`;

          if (
            i.equipmentInfo &&
            i.equipmentInfo.source_type === "MTP" &&
            i.equipmentInfo.equipment_data
          ) {
            const equipmentData = i.equipmentInfo.equipment_data;

            // Use procedure ID as RecipeElement ID (this should reference the MTP procedure)
            if (
              equipmentData.procedure_info &&
              equipmentData.procedure_info.id
            ) {
              recipeElementID = equipmentData.procedure_info.id;
              // Enhanced description with procedure details
              description = `${equipmentData.service_info?.name || "Service"}:${equipmentData.procedure_info?.name || "Procedure"}:${i.id}`;
            }

            // Use service ID as equipment ID
            if (equipmentData.service_info && equipmentData.service_info.id) {
              actualEquipmentID = equipmentData.service_info.id;
            }

            // Add equipment requirements with enhanced constraint handling
            if (
              equipmentData.equipment_requirements &&
              equipmentData.equipment_requirements.length > 0
            ) {
              equipmentRequirement = equipmentData.equipment_requirements.map(
                (req) => ({
                  "b2mml:ID": req.id || "Equipment Requirement",
                  "b2mml:Description": req.description || `Equipment requirement for ${equipmentData.service_info?.name || "service"}`,
                })
              );
            }

            // Add parameters with enhanced value extraction and metadata
            if (
              equipmentData.recipe_parameters &&
              equipmentData.recipe_parameters.length > 0
            ) {
              parameters = equipmentData.recipe_parameters.map((p) => {
                // Try to get actual parameter value from workspace item
                let actualValue = p.default;
                if (i.processElementParameter && Array.isArray(i.processElementParameter)) {
                  const workspaceParam = i.processElementParameter.find(wp => wp.id === p.id || wp.id === p.name);
                  if (workspaceParam && workspaceParam.value) {
                    // Handle different value structures
                    if (Array.isArray(workspaceParam.value) && workspaceParam.value.length > 0) {
                      actualValue = workspaceParam.value[0].valueString || workspaceParam.value[0];
                    } else if (typeof workspaceParam.value === 'object' && workspaceParam.value.valueString) {
                      actualValue = workspaceParam.value.valueString;
                    } else {
                      actualValue = workspaceParam.value;
                    }
                  }
                }
                
                return {
                  "b2mml:ID": p.id,
                  "b2mml:ParameterType": "ProcessParameter",
                  "b2mml:Description": p.name || p.id,
                  "b2mml:Value": {
                    "b2mml:ValueString": String(actualValue !== undefined && actualValue !== null ? actualValue : p.default || "10"),
                    "b2mml:DataInterpretation": "Constant",
                    "b2mml:DataType": p.unit ? "Measure" : "duration",
                    "b2mml:UnitOfMeasure": p.unit || "seconds",
                  },
                };
              });
            }
          } else if (
            i.equipmentInfo &&
            i.equipmentInfo.source_type === "AAS" &&
            i.equipmentInfo.equipment_data
          ) {
            const equipmentData = i.equipmentInfo.equipment_data;

            // Use AAS ID as equipment ID
            if (equipmentData.aas_id) {
              actualEquipmentID = equipmentData.aas_id;
            }

            // Add properties as parameters with enhanced handling
            if (
              equipmentData.properties &&
              equipmentData.properties.length > 0
            ) {
              parameters = equipmentData.properties.map((p) => {
                // Try to get actual value from workspace
                let actualValue = p.value;
                if (i.processElementParameter && Array.isArray(i.processElementParameter)) {
                  const workspaceParam = i.processElementParameter.find(wp => wp.id === p.id);
                  if (workspaceParam && workspaceParam.value) {
                    // Handle different value structures
                    if (Array.isArray(workspaceParam.value) && workspaceParam.value.length > 0) {
                      actualValue = workspaceParam.value[0].valueString || workspaceParam.value[0];
                    } else if (typeof workspaceParam.value === 'object' && workspaceParam.value.valueString) {
                      actualValue = workspaceParam.value.valueString;
                    } else {
                      actualValue = workspaceParam.value;
                    }
                  }
                }
                
                return {
                  "b2mml:ID": p.id,
                  "b2mml:ParameterType": "ProcessParameter",
                  "b2mml:Description": p.name || p.id,
                  "b2mml:Value": {
                    "b2mml:ValueString": String(actualValue !== undefined && actualValue !== null ? actualValue : p.value || "10"),
                    "b2mml:DataInterpretation": "Constant",
                    "b2mml:DataType": p.dataType || "duration",
                    "b2mml:UnitOfMeasure": p.unit || "seconds",
                  },
                };
              });
            }
          } else {
            // Legacy support with enhanced parameter handling
            if (i.equipmentInfo?.instance) {
              actualEquipmentID = i.equipmentInfo.instance;
            }
            if (i.equipmentInfo?.requirement) {
              equipmentRequirement = [
                {
                  "b2mml:ID": i.equipmentInfo.requirement.id || "Equipment Requirement",
                  "b2mml:Description": i.equipmentInfo.requirement.description || `Equipment requirement for ${i.id}`,
                },
              ];
            }
            if (i.equipmentInfo?.parameters) {
              parameters = i.equipmentInfo.parameters.map((p) => {
                // Try to get actual value from workspace
                let actualValue = p.value;
                if (i.processElementParameter && Array.isArray(i.processElementParameter)) {
                  const workspaceParam = i.processElementParameter.find(wp => wp.id === p.id);
                  if (workspaceParam && workspaceParam.value) {
                    // Handle different value structures
                    if (Array.isArray(workspaceParam.value) && workspaceParam.value.length > 0) {
                      actualValue = workspaceParam.value[0].valueString || workspaceParam.value[0];
                    } else if (typeof workspaceParam.value === 'object' && workspaceParam.value.valueString) {
                      actualValue = workspaceParam.value.valueString;
                    } else {
                      actualValue = workspaceParam.value;
                    }
                  }
                }
                
                return {
                  "b2mml:ID": p.id,
                  "b2mml:ParameterType": "ProcessParameter",
                  "b2mml:Description": p.description || p.id,
                  "b2mml:Value": {
                    "b2mml:ValueString": String(actualValue !== undefined && actualValue !== null ? actualValue : p.value || "10"),
                    "b2mml:DataInterpretation": "Constant",
                    "b2mml:DataType": p.dataType || "duration",
                    "b2mml:UnitOfMeasure": p.unit || "seconds",
                  },
                };
              });
            }
          }

          // Map recipe element type to BatchML standard with enhanced support
          const mappedRecipeElementType = recipeElementTypeMap[i.recipeElementType] || 
            (i.type === "process" ? "Operation" : "Other");

          return {
            "b2mml:ID": recipeElementID,
            "b2mml:Description": description,
            "b2mml:RecipeElementType": mappedRecipeElementType,
            "b2mml:ActualEquipmentID": actualEquipmentID,
            "b2mml:EquipmentRequirement": equipmentRequirement,
            "b2mml:Parameter": parameters,
          };
        }),
    },
    equipmentElement: Array.from(equipmentInstances).map((instance) => {
      // Find the workspace item that uses this equipment instance
      const workspaceItem = workspaceItems.find(
        (item) =>
          item.equipmentInfo &&
          item.equipmentInfo.source_type === "MTP" &&
          item.equipmentInfo.equipment_data &&
          item.equipmentInfo.equipment_data.service_info &&
          item.equipmentInfo.equipment_data.service_info.id === instance
      );

      if (workspaceItem && workspaceItem.equipmentInfo.equipment_data) {
        const equipmentData = workspaceItem.equipmentInfo.equipment_data;

        // Create EquipmentProceduralElement entries for each procedure with enhanced details
        const equipmentProceduralElements = [];

        if (
          equipmentData.recipe_parameters &&
          equipmentData.recipe_parameters.length > 0
        ) {
          equipmentData.recipe_parameters.forEach((param) => {
            // Try to get actual parameter value from workspace
            let actualValue = param.default;
            if (workspaceItem.processElementParameter && Array.isArray(workspaceItem.processElementParameter)) {
              const workspaceParam = workspaceItem.processElementParameter.find(wp => wp.id === param.id || wp.id === param.name);
              if (workspaceParam && workspaceParam.value) {
                // Handle different value structures
                if (Array.isArray(workspaceParam.value) && workspaceParam.value.length > 0) {
                  actualValue = workspaceParam.value[0].valueString || workspaceParam.value[0];
                } else if (typeof workspaceParam.value === 'object' && workspaceParam.value.valueString) {
                  actualValue = workspaceParam.value.valueString;
                } else {
                  actualValue = workspaceParam.value;
                }
              }
            }

            equipmentProceduralElements.push({
              "b2mml:ID": param.id,
              "b2mml:Description": `${equipmentData.service_info?.name || "Service"}:${equipmentData.procedure_info?.name || "Procedure"}:${param.name || param.id}`,
              "b2mml:EquipmentProceduralElementType": "Procedure",
              "b2mml:Parameter": [
                {
                  "b2mml:ID": param.id,
                  "b2mml:Description": `${param.name || param.id}_Param`,
                  "b2mml:ParameterType": "ProcessParameter",
                  "b2mml:ParameterSubType": param.paramElem?.Type || "ST",
                  "b2mml:Value": {
                    "b2mml:ValueString": String(actualValue !== undefined && actualValue !== null ? actualValue : param.default || "10"),
                    "b2mml:DataInterpretation": "Constant",
                    "b2mml:DataType": param.unit ? "Measure" : "duration",
                    "b2mml:UnitOfMeasure": param.unit || "seconds",
                  },
                },
              ],
            });
          });
        }

        // Enhanced equipment connections with better network support
        const equipmentConnections = [];
        
        // Add connection to next equipment if specified
        if (equipmentData.next_equipment) {
          equipmentConnections.push({
            "b2mml:ID": `EquipmentConnection${instance}To${equipmentData.next_equipment}`,
            "b2mml:ConnectionType": "MaterialMovement",
            "b2mml:FromEquipmentID": instance,
            "b2mml:ToEquipmentID": equipmentData.next_equipment,
            "b2mml:Description": `Material transfer from ${instance} to ${equipmentData.next_equipment}`,
          });
        }
        
        // Add connection from previous equipment if specified
        if (equipmentData.previous_equipment) {
          equipmentConnections.push({
            "b2mml:ID": `EquipmentConnection${equipmentData.previous_equipment}To${instance}`,
            "b2mml:ConnectionType": "MaterialMovement",
            "b2mml:FromEquipmentID": equipmentData.previous_equipment,
            "b2mml:ToEquipmentID": instance,
            "b2mml:Description": `Material transfer from ${equipmentData.previous_equipment} to ${instance}`,
          });
        }
        
        // Default connection if no specific connections defined
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
          "b2mml:Description": `${equipmentData.service_info?.name || "Equipment"} instance for ${equipmentData.procedure_info?.name || "procedure"}`,
          "b2mml:EquipmentProceduralElement": equipmentProceduralElements,
          "b2mml:EquipmentConnection": equipmentConnections,
        };
      }

      // Enhanced fallback for equipment without detailed data
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
    }),
  };

  console.log("Enhanced master recipe payload:", payload);

  // Send to server for conversion and download
  client
    .post("/api/recipe/master", payload)
    .then((response) => {
      console.log("Master recipe created successfully:", response.data);
      
      // Show validation success message
      if (response.status === 200) {
        alert("✅ Master Recipe successfully created and validated against XSD schema!\n\nThe XML file will now download.");
        start_download("master_recipe.xml", response.data);
      }
    })
    .catch((error) => {
      console.error("Error creating master recipe:", error);
      
      // Handle different types of errors with appropriate messages
      if (error.response) {
        if (error.response.status === 400) {
          // Validation error
          alert(`❌ Master Recipe validation failed!\n\nXSD Schema Error: ${error.response.data}\n\nThe XML file will still download, but it may not be valid.`);
          // Still download the file even if validation failed
          if (error.response.data && typeof error.response.data === 'string' && error.response.data.includes('<?xml')) {
            start_download("invalid_master_recipe.xml", error.response.data);
          }
        } else if (error.response.status === 500) {
          // Server error
          alert(`🚨 Server error occurred while creating master recipe:\n\n${error.response.data}\n\nPlease check the console for more details.`);
        } else {
          // Other HTTP errors
          alert(`⚠️ Error creating master recipe (HTTP ${error.response.status}):\n\n${error.response.data || error.message}`);
        }
      } else if (error.request) {
        // Network error
        alert("🌐 Network error: Unable to reach the server for validation.\n\nPlease check your connection and try again.");
      } else {
        // Other errors
        alert(`❌ Error creating master recipe:\n\n${error.message}`);
      }
    });
}

/**
 * Converts a condition group structure to a human-readable string representation
 * This function recursively processes nested condition groups and individual conditions
 * to create a readable expression with proper logical precedence and brackets.
 * 
 * The function handles three types of logical operators:
 * - AND: Joins conditions with "AND" (all must be true)
 * - OR: Joins conditions with "OR" (at least one must be true)  
 * - NOT: Prefixes a single condition with "NOT" (inverts the result)
 * 
 * @param {Object} group - The condition group object to stringify
 * @returns {string} - Human-readable condition string, or empty string if invalid
 */
function stringifyConditionGroup(group) {
  // Handle empty or invalid groups
  if (!group || !group.children || !group.children.length) return '';
  
  // NOT operator is unary - only one child allowed
  if (group.operator === 'NOT') {
    const childStr = stringifyConditionGroup(group.children[0]);
    if (!childStr) return '';
    return `NOT (${childStr})`;
  }
  
  // Process all children and build the condition string
  const childrenStrings = group.children.map(child => {
    if (child.type === 'group') {
      // Nested groups get wrapped in parentheses for logical precedence
      return '(' + stringifyConditionGroup(child) + ')';
    } else if (child.type === 'condition') {
      console.log('Stringifying condition:', JSON.stringify(child, null, 2));
      
      // Validate that the condition has all required fields
      if (!child.keyword || !child.operator || child.value === undefined || child.value === '') {
        return '';
      }
      
      // Special handling for Step-type conditions
      if (child.keyword === 'Step') {
        return `Step "${child.instance || ''}" is Complete`;
      } else {
        // For other condition types, format as: "Keyword Instance Operator Value"
        // Include instance if present (e.g., "Level 500 >= 300")
        const instancePart = child.instance ? `${child.instance} ` : '';
        return `${child.keyword} ${instancePart}${child.operator} ${child.value}`;
      }
    }
    return '';
  }).filter(Boolean); // Remove empty strings
  
  // Return empty string if no valid children
  if (!childrenStrings.length) return '';
  
  // Join all children with the group operator (AND/OR)
  return childrenStrings.join(` ${group.operator} `);
}

/**
 * Cleans a condition group by removing invalid or empty conditions
 * This function recursively processes the condition structure and removes:
 * - Conditions with missing keyword, operator, or value
 * - Empty groups with no valid children
 * - Invalid condition structures
 * 
 * This ensures that only valid, complete conditions are exported to XML.
 * 
 * @param {Object} group - The condition group object to clean
 * @returns {Object|null} - Cleaned condition group, or null if no valid children remain
 */
function cleanConditionGroup(group) {
  if (!group || !group.children) return null;
  
  // Recursively clean all children
  const cleanedChildren = group.children
    .map(child => {
      if (child.type === 'group') {
        // Recursively clean nested groups
        return cleanConditionGroup(child);
      } else if (child.type === 'condition') {
        // Only keep conditions that have all required fields filled
        if (!child.keyword || !child.operator || child.value === undefined || child.value === '') {
          return null;
        }
        return child;
      }
      return null;
    })
    .filter(Boolean); // Remove null/undefined children
  
  // Return null if no valid children remain
  if (!cleanedChildren.length) return null;
  
  // Return cleaned group with valid children
  return { ...group, children: cleanedChildren };
}