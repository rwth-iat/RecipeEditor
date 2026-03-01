function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseFiniteNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (!isNonEmptyString(value)) {
    return null;
  }

  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}
