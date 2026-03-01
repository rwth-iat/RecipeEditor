export function applyTopologicalLayout({
  items,
  connections,
  options = {},
}) {
  const horizontalSpacing = options.horizontalSpacing ?? 300;
  const verticalSpacing = options.verticalSpacing ?? 120;
  const margin = options.margin ?? 50;

  const adjacency = {};
  const inDegree = {};
  const layer = {};
  const queue = [];

  (items || []).forEach((item) => {
    adjacency[item.id] = [];
    inDegree[item.id] = 0;
  });

  (connections || []).forEach((connection) => {
    if (adjacency[connection.sourceId]) {
      adjacency[connection.sourceId].push(connection.targetId);
      inDegree[connection.targetId] = (inDegree[connection.targetId] || 0) + 1;
    }
  });

  (items || []).forEach((item) => {
    if (!inDegree[item.id]) {
      queue.push(item.id);
      layer[item.id] = 0;
    }
  });

  while (queue.length > 0) {
    const current = queue.shift();
    (adjacency[current] || []).forEach((neighbor) => {
      inDegree[neighbor]--;
      layer[neighbor] = Math.max(layer[neighbor] || 0, (layer[current] || 0) + 1);
      if (!inDegree[neighbor]) {
        queue.push(neighbor);
      }
    });
  }

  const grouped = [];
  (items || []).forEach((item) => {
    const groupIndex = layer[item.id] || 0;
    if (!grouped[groupIndex]) {
      grouped[groupIndex] = [];
    }
    grouped[groupIndex].push(item);
  });

  grouped.forEach((column = [], columnIndex) => {
    column.forEach((item, rowIndex) => {
      item.x = margin + columnIndex * horizontalSpacing;
      item.y = margin + rowIndex * verticalSpacing;
    });
  });

  return { items };
}
