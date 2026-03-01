export function cleanUpObject(obj) {
  for (const attrKey in obj) {
    const attrValue = obj[attrKey];
    if (attrValue === null || attrValue === "" || attrValue === undefined) {
      delete obj[attrKey];
    } else if (Object.prototype.toString.call(attrValue) === "[object Object]") {
      if (Object.keys(attrValue).length === 0) {
        delete obj[attrKey];
      } else {
        cleanUpObject(attrValue);
        if (Object.keys(attrValue).length === 0) {
          delete obj[attrKey];
        }
      }
    } else if (Array.isArray(attrValue)) {
      if (attrValue.length === 0) {
        delete obj[attrKey];
      } else {
        attrValue.forEach((arrayValue) => {
          if (Object.prototype.toString.call(arrayValue) === "[object Object]") {
            cleanUpObject(arrayValue);
          }
        });
        if (attrValue.length === 0) {
          delete obj[attrKey];
        }
      }
    }
  }
}
