export const PARALLEL_BRANCH_MIN = 2;
export const PARALLEL_INDICATOR_WIDTH = 450;
export const PARALLEL_INDICATOR_HEIGHT = 48;
export const PARALLEL_INDICATOR_MARGIN = 38;

export const START_PARALLEL_INDICATOR = "Start Parallel Indicator";
export const END_PARALLEL_INDICATOR = "End Parallel Indicator";
export const START_OPTIONAL_PARALLEL_INDICATOR = "Start Optional Parallel Indicator";
export const END_OPTIONAL_PARALLEL_INDICATOR = "End Optional Parallel Indicator";

const PARALLEL_SPLIT_TYPES = new Set([
  START_PARALLEL_INDICATOR,
  START_OPTIONAL_PARALLEL_INDICATOR,
]);

const PARALLEL_JOIN_TYPES = new Set([
  END_PARALLEL_INDICATOR,
  END_OPTIONAL_PARALLEL_INDICATOR,
]);

export function isParallelIndicatorType(type) {
  return PARALLEL_SPLIT_TYPES.has(type) || PARALLEL_JOIN_TYPES.has(type);
}

export function isParallelSplitType(type) {
  return PARALLEL_SPLIT_TYPES.has(type);
}

export function isParallelJoinType(type) {
  return PARALLEL_JOIN_TYPES.has(type);
}

export function isParallelIndicatorItem(item) {
  return (
    item?.type === "chart_element" &&
    isParallelIndicatorType(item?.procedureChartElementType)
  );
}

export function normalizeParallelBranchCount(type, value) {
  if (!isParallelIndicatorType(type)) {
    return undefined;
  }

  const numericValue =
    typeof value === "number" ? value : Number.parseInt(value, 10);

  if (!Number.isFinite(numericValue)) {
    return PARALLEL_BRANCH_MIN;
  }

  return Math.max(PARALLEL_BRANCH_MIN, Math.trunc(numericValue));
}

export function getParallelBranchCount(item) {
  return normalizeParallelBranchCount(
    item?.procedureChartElementType,
    item?.parallelBranchCount
  );
}

export function ensureParallelIndicatorDefaults(item) {
  if (!item || typeof item !== "object" || !isParallelIndicatorItem(item)) {
    return item;
  }

  return {
    ...item,
    parallelBranchCount: getParallelBranchCount(item),
  };
}

export function getParallelBranchPortId(type, index) {
  if (!Number.isInteger(index) || index < 1) {
    return "";
  }

  if (isParallelSplitType(type)) {
    return `out-branch-${index}`;
  }

  if (isParallelJoinType(type)) {
    return `in-branch-${index}`;
  }

  return "";
}

export function getParallelFixedSourcePortId(type) {
  if (isParallelJoinType(type)) {
    return "out-center";
  }
  return "";
}

export function getParallelFixedTargetPortId(type) {
  if (isParallelSplitType(type)) {
    return "in-center";
  }
  return "";
}

export function isParallelBranchPortId(type, portId) {
  if (typeof portId !== "string" || portId.length === 0) {
    return false;
  }

  if (isParallelSplitType(type)) {
    return /^out-branch-\d+$/.test(portId);
  }

  if (isParallelJoinType(type)) {
    return /^in-branch-\d+$/.test(portId);
  }

  return false;
}

export function getParallelRelevantConnectionCount(item, connections) {
  if (!isParallelIndicatorItem(item)) {
    return 0;
  }

  const type = item.procedureChartElementType;
  const itemId = item.id;
  const relevantConnections = Array.isArray(connections) ? connections : [];

  if (isParallelSplitType(type)) {
    return relevantConnections.filter((connection) => {
      if (connection?.sourceId !== itemId) {
        return false;
      }
      return (
        !connection?.sourcePortId ||
        isParallelBranchPortId(type, connection.sourcePortId)
      );
    }).length;
  }

  return relevantConnections.filter((connection) => {
    if (connection?.targetId !== itemId) {
      return false;
    }
    return (
      !connection?.targetPortId ||
      isParallelBranchPortId(type, connection.targetPortId)
    );
  }).length;
}

export function getMinimumParallelBranchCount(item, connections) {
  if (!isParallelIndicatorItem(item)) {
    return PARALLEL_BRANCH_MIN;
  }

  return Math.max(
    PARALLEL_BRANCH_MIN,
    getParallelRelevantConnectionCount(item, connections)
  );
}
