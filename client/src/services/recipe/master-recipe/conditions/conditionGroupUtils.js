const LOGICAL_OPERATORS = new Set(["AND", "OR", "NOT"]);
const COMPARISON_OPERATORS = new Set(["==", "<", "<=", ">", ">=", "is"]);

export function createEmptyConditionGroup() {
  return {
    type: "group",
    operator: "AND",
    children: [],
  };
}

function normalizeStepLabel(rawLabel, resolveStepLabel) {
  if (typeof resolveStepLabel !== "function") {
    return rawLabel || "";
  }
  return resolveStepLabel(rawLabel) || rawLabel || "";
}

export function stringifyConditionGroup(group, options = {}) {
  const {
    quoteStepInstance = true,
    resolveStepLabel,
  } = options;

  if (!group) {
    return "";
  }

  if (group.type === "condition") {
    if (
      !group.keyword ||
      !group.operator ||
      group.value === undefined ||
      group.value === ""
    ) {
      return "";
    }

    if (group.keyword === "Step") {
      const stepLabel = normalizeStepLabel(group.instance || "", resolveStepLabel);
      const renderedLabel = quoteStepInstance ? `"${stepLabel}"` : stepLabel;
      return `Step ${renderedLabel} is Completed`;
    }

    const instancePart = group.instance ? `${group.instance} ` : "";
    return `${group.keyword} ${instancePart}${group.operator} ${group.value}`.trim();
  }

  if (!group.children || !group.children.length) {
    return "";
  }

  if (group.operator === "NOT") {
    const childStr = stringifyConditionGroup(group.children[0], options);
    if (!childStr) {
      return "";
    }
    return `NOT (${childStr})`;
  }

  const childrenStrings = group.children
    .map((child) => {
      const childText = stringifyConditionGroup(child, options);
      if (!childText) {
        return "";
      }
      if (child.type === "group") {
        return `(${childText})`;
      }
      return childText;
    })
    .filter(Boolean);

  if (!childrenStrings.length) {
    return "";
  }

  return childrenStrings.join(` ${group.operator} `);
}

export function cleanConditionGroup(group) {
  if (!group || group.type === "condition") {
    return group || null;
  }

  const cleanedChildren = (group.children || [])
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
        if (child.keyword === "Step") {
          return {
            ...child,
            operator: "is",
            value: "Completed",
          };
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

function tokenizeConditionExpression(expression) {
  return (expression.match(/"[^"]*"|>=|<=|==|\(|\)|\bAND\b|\bOR\b|\bNOT\b|\bis\b|[^\s()]+/gi) || [])
    .map((token) => token.trim())
    .filter(Boolean);
}

function parseAtomicCondition(tokens, resolveStepId) {
  if (!tokens.length) {
    return null;
  }

  if (tokens.length === 1 && /^true$/i.test(tokens[0])) {
    return null;
  }

  const rawText = tokens.join(" ").trim();
  const stepMatch = rawText.match(
    /^Step\s+(?:"([^"]+)"|(.+?))\s+is\s+(?:Complete|Completed)$/i
  );
  if (stepMatch) {
    const rawStepLabel = (stepMatch[1] || stepMatch[2] || "").trim();
    const resolvedStepId =
      typeof resolveStepId === "function"
        ? resolveStepId(rawStepLabel) || rawStepLabel
        : rawStepLabel;
    return {
      type: "condition",
      keyword: "Step",
      instance: resolvedStepId,
      operator: "is",
      value: "Completed",
    };
  }

  const operatorIndex = tokens.findIndex((token, index) => {
    if (index === 0) {
      return false;
    }
    return COMPARISON_OPERATORS.has(token);
  });

  if (operatorIndex === -1 || operatorIndex === tokens.length - 1) {
    return null;
  }

  const keyword = tokens[0];
  const operator = tokens[operatorIndex];
  const instance = tokens.slice(1, operatorIndex).join(" ");
  const value = tokens.slice(operatorIndex + 1).join(" ");

  if (!keyword || !operator || !value) {
    return null;
  }

  return {
    type: "condition",
    keyword,
    instance,
    operator,
    value,
  };
}

function createExpressionParser(tokens, warnings, resolveStepId) {
  let index = 0;

  function peek() {
    return tokens[index];
  }

  function consume() {
    const token = tokens[index];
    index += 1;
    return token;
  }

  function parsePrimary() {
    if (peek() === "(") {
      consume();
      const expression = parseOrExpression();
      if (peek() === ")") {
        consume();
      } else {
        warnings.push("Missing closing parenthesis in condition expression.");
      }
      return expression;
    }

    const atomTokens = [];
    while (
      index < tokens.length &&
      peek() !== ")" &&
      !LOGICAL_OPERATORS.has((peek() || "").toUpperCase())
    ) {
      atomTokens.push(consume());
    }

    const parsedCondition = parseAtomicCondition(atomTokens, resolveStepId);
    if (!parsedCondition && atomTokens.length > 0) {
      warnings.push(`Unable to parse condition fragment "${atomTokens.join(" ")}".`);
    }
    return parsedCondition;
  }

  function parseNotExpression() {
    if ((peek() || "").toUpperCase() === "NOT") {
      consume();
      const child = parseNotExpression();
      if (!child) {
        warnings.push('Operator "NOT" requires a child expression.');
        return null;
      }
      return {
        type: "group",
        operator: "NOT",
        children: [child],
      };
    }
    return parsePrimary();
  }

  function parseAndExpression() {
    const children = [];
    const firstChild = parseNotExpression();
    if (firstChild) {
      children.push(firstChild);
    }

    while ((peek() || "").toUpperCase() === "AND") {
      consume();
      const nextChild = parseNotExpression();
      if (nextChild) {
        children.push(nextChild);
      }
    }

    if (!children.length) {
      return null;
    }

    if (children.length === 1) {
      return children[0];
    }

    return {
      type: "group",
      operator: "AND",
      children,
    };
  }

  function parseOrExpression() {
    const children = [];
    const firstChild = parseAndExpression();
    if (firstChild) {
      children.push(firstChild);
    }

    while ((peek() || "").toUpperCase() === "OR") {
      consume();
      const nextChild = parseAndExpression();
      if (nextChild) {
        children.push(nextChild);
      }
    }

    if (!children.length) {
      return null;
    }

    if (children.length === 1) {
      return children[0];
    }

    return {
      type: "group",
      operator: "OR",
      children,
    };
  }

  return {
    parse: parseOrExpression,
    hasRemainingTokens: () => index < tokens.length,
    getRemainingTokens: () => tokens.slice(index),
  };
}

export function parseConditionExpression(expression, options = {}) {
  const warnings = [];
  const trimmedExpression = typeof expression === "string" ? expression.trim() : "";

  if (!trimmedExpression || /^true$/i.test(trimmedExpression)) {
    return {
      group: createEmptyConditionGroup(),
      warnings,
    };
  }

  const tokens = tokenizeConditionExpression(trimmedExpression);
  const parser = createExpressionParser(tokens, warnings, options.resolveStepId);
  const parsedExpression = parser.parse();

  if (parser.hasRemainingTokens()) {
    warnings.push(
      `Unparsed trailing tokens in condition expression: ${parser
        .getRemainingTokens()
        .join(" ")}.`
    );
  }

  if (!parsedExpression) {
    warnings.push(`Unable to parse condition expression "${trimmedExpression}".`);
    return {
      group: createEmptyConditionGroup(),
      warnings,
    };
  }

  if (parsedExpression.type === "group") {
    return {
      group: parsedExpression,
      warnings,
    };
  }

  return {
    group: {
      type: "group",
      operator: "AND",
      children: [parsedExpression],
    },
    warnings,
  };
}
