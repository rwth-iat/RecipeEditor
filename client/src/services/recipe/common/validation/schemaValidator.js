import { Draft04 } from "json-schema-library";
import allSchemas from "./schemas/AllSchemas.json";

const schemaValidator = new Draft04(allSchemas);

function stripXmlAttributes(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => stripXmlAttributes(entry));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "$")
      .map(([key, entryValue]) => [key, stripXmlAttributes(entryValue)])
  );
}

export function validateAgainstAllSchemas(jsonValue) {
  return schemaValidator.validate(stripXmlAttributes(jsonValue)) || [];
}
