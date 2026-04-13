export const ONTOLOGY_TREE_SORT_MODE_DEFAULT = 'ontology';
export const ONTOLOGY_TREE_SORT_MODE_ALPHABETICAL = 'alphabetical';

export function getOntologyTreeItemDisplayName(item) {
  if (typeof item?.displayName === 'string' && item.displayName.trim()) {
    return item.displayName.trim();
  }
  if (typeof item?.label === 'string' && item.label.trim()) {
    return item.label.trim();
  }
  if (typeof item?.name === 'string' && item.name.trim()) {
    return item.name.trim();
  }
  return 'Unnamed';
}

export function sortOntologyTreeItems(items, sortMode = ONTOLOGY_TREE_SORT_MODE_DEFAULT) {
  if (!Array.isArray(items)) {
    return [];
  }

  if (sortMode !== ONTOLOGY_TREE_SORT_MODE_ALPHABETICAL) {
    return items;
  }

  return [...items].sort((leftItem, rightItem) => (
    getOntologyTreeItemDisplayName(leftItem).localeCompare(
      getOntologyTreeItemDisplayName(rightItem),
      undefined,
      { numeric: true, sensitivity: 'base' }
    )
  ));
}
