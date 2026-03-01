import { Builder } from "xml2js";

export function buildXmlFromObject(object, options = {}) {
  const builder = new Builder(options);
  return builder.buildObject(object);
}
