import { Draft04 } from "json-schema-library";
import allSchemas from "./schemas/AllSchemas.json";

const schemaValidator = new Draft04(allSchemas);

export function validateAgainstAllSchemas(jsonValue) {
  return schemaValidator.validate(jsonValue) || [];
}
