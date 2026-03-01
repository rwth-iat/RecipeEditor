export function normalizeConnection(connection) {
  return {
    sourceId: connection?.sourceId ?? "",
    targetId: connection?.targetId ?? "",
  };
}

export function dedupeConnections(connections) {
  const seen = new Set();
  const deduped = [];
  (Array.isArray(connections) ? connections : []).forEach((connection) => {
    const normalized = normalizeConnection(connection);
    if (!normalized.sourceId || !normalized.targetId) {
      return;
    }
    const key = `${normalized.sourceId}|${normalized.targetId}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    deduped.push(normalized);
  });
  return deduped;
}
