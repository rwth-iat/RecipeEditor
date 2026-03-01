export function parseXmlNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue.trim();
    return text || undefined;
  }

  const parsedObject = {};
  if (node.attributes) {
    for (const attr of node.attributes) {
      parsedObject[`@${attr.name}`] = attr.value;
    }
  }

  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.nodeValue.trim();
      if (!text) {
        continue;
      }

      if (Object.keys(parsedObject).length === 0) {
        return text;
      }
      parsedObject["#text"] = text;
      continue;
    }

    if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = child.localName;
      const parsedChild = parseXmlNode(child);
      if (parsedChild === undefined) {
        continue;
      }
      if (parsedObject[tag]) {
        if (!Array.isArray(parsedObject[tag])) {
          parsedObject[tag] = [parsedObject[tag]];
        }
        parsedObject[tag].push(parsedChild);
      } else {
        parsedObject[tag] = parsedChild;
      }
    }
  }

  return parsedObject;
}

export function parseRecipeXmlToTree(xmlText) {
  const parser = new DOMParser();
  const documentRoot = parser.parseFromString(xmlText, "application/xml");
  const namespace = "http://www.mesa.org/xml/B2MML";

  let root = documentRoot.documentElement;
  if (root.localName === "BatchInformation") {
    const gRecipe = root.getElementsByTagNameNS(namespace, "GRecipe")[0];
    if (gRecipe) {
      root = gRecipe;
    }
  }

  return parseXmlNode(root);
}
