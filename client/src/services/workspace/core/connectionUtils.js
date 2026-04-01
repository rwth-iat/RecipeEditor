export function normalizeConnection(connection) {
  const normalized = {
    sourceId: connection?.sourceId ?? "",
    targetId: connection?.targetId ?? "",
  };

  if (typeof connection?.sourcePortId === "string" && connection.sourcePortId.length > 0) {
    normalized.sourcePortId = connection.sourcePortId;
  }
  if (typeof connection?.targetPortId === "string" && connection.targetPortId.length > 0) {
    normalized.targetPortId = connection.targetPortId;
  }

  return normalized;
}

export function dedupeConnections(connections) {
  const seen = new Set();
  const deduped = [];
  (Array.isArray(connections) ? connections : []).forEach((connection) => {
    const normalized = normalizeConnection(connection);
    if (!normalized.sourceId || !normalized.targetId) {
      return;
    }
    const key = `${normalized.sourceId}|${normalized.sourcePortId || ""}|${normalized.targetId}|${normalized.targetPortId || ""}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    deduped.push(normalized);
  });
  return deduped;
}
