export const DEFAULT_ALLOWED_PROCESS_ELEMENT_TYPES = Object.freeze([
  'Process Stage',
  'Process Operation',
  'Process Action',
]);

const PROCESS_SIDEBAR_PACKAGES = Object.freeze([
  { type: 'process', name: 'Process', processElementType: 'Process' },
  { type: 'process', name: 'Process Stage', processElementType: 'Process Stage' },
  { type: 'process', name: 'Process Operation', processElementType: 'Process Operation' },
  { type: 'process', name: 'Process Action', processElementType: 'Process Action' },
]);

function normalizeProcessElementType(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function getProcessSidebarPackages(allowedProcessElementTypes) {
  const allowedTypes = Array.isArray(allowedProcessElementTypes)
    ? allowedProcessElementTypes
    : DEFAULT_ALLOWED_PROCESS_ELEMENT_TYPES;
  const allowedTypeSet = new Set(allowedTypes.map((value) => normalizeProcessElementType(value)));

  return PROCESS_SIDEBAR_PACKAGES.filter((item) =>
    allowedTypeSet.has(item.processElementType)
  );
}

export function getSecondaryAllowedProcessElementTypes(parentProcessElementType) {
  switch (normalizeProcessElementType(parentProcessElementType)) {
    case 'Process Stage':
      return ['Process Operation', 'Process Action'];
    case 'Process Operation':
      return ['Process Action'];
    case 'Process Action':
      return [];
    default:
      return [...DEFAULT_ALLOWED_PROCESS_ELEMENT_TYPES];
  }
}

export function resolveAllowedProcessElementTypes(context = {}) {
  if (!context?.visible) {
    return [...DEFAULT_ALLOWED_PROCESS_ELEMENT_TYPES];
  }

  return getSecondaryAllowedProcessElementTypes(context.parentProcessElementType);
}
