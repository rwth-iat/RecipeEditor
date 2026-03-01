export function stringifyConditionGroup(group) {
  if (!group || !group.children || !group.children.length) {
    return "";
  }

  if (group.operator === "NOT") {
    const childStr = stringifyConditionGroup(group.children[0]);
    if (!childStr) {
      return "";
    }
    return `NOT (${childStr})`;
  }

  const childrenStrings = group.children
    .map((child) => {
      if (child.type === "group") {
        return `(${stringifyConditionGroup(child)})`;
      }
      if (child.type === "condition") {
        if (
          !child.keyword ||
          !child.operator ||
          child.value === undefined ||
          child.value === ""
        ) {
          return "";
        }
        if (child.keyword === "Step") {
          return `Step "${child.instance || ""}" is Complete`;
        }
        const instancePart = child.instance ? `${child.instance} ` : "";
        return `${child.keyword} ${instancePart}${child.operator} ${child.value}`;
      }
      return "";
    })
    .filter(Boolean);

  if (!childrenStrings.length) {
    return "";
  }

  return childrenStrings.join(` ${group.operator} `);
}

export function cleanConditionGroup(group) {
  if (!group || !group.children) {
    return null;
  }

  const cleanedChildren = group.children
    .map((child) => {
      if (child.type === "group") {
        return cleanConditionGroup(child);
      }
      if (child.type === "condition") {
        if (
          !child.keyword ||
          !child.operator ||
          child.value === undefined ||
          child.value === ""
        ) {
          return null;
        }
        return child;
      }
      return null;
    })
    .filter(Boolean);

  if (!cleanedChildren.length) {
    return null;
  }

  return { ...group, children: cleanedChildren };
}
