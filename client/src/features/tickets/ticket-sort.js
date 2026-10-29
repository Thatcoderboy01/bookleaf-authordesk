/**
 * Ticket sorting configurations and utilities for BookLeaf AuthorDesk.
 */

export const SORT_OPTIONS = [
  {
    value: "createdAt_desc",
    label: "Newest first",
    sortBy: "createdAt",
    sortOrder: "desc",
  },
  {
    value: "createdAt_asc",
    label: "Oldest first",
    sortBy: "createdAt",
    sortOrder: "asc",
  },
  {
    value: "updatedAt_desc",
    label: "Recently updated",
    sortBy: "updatedAt",
    sortOrder: "desc",
  },
  {
    value: "priority_desc",
    label: "Highest priority",
    sortBy: "priority",
    sortOrder: "desc",
  },
  {
    value: "priority_asc",
    label: "Lowest priority",
    sortBy: "priority",
    sortOrder: "asc",
  },
];

export function getSortOption(sortBy = "createdAt", sortOrder = "desc") {
  return (
    SORT_OPTIONS.find(
      (opt) => opt.sortBy === sortBy && opt.sortOrder === sortOrder
    ) || SORT_OPTIONS[0]
  );
}

export function parseSortValue(value) {
  return SORT_OPTIONS.find((opt) => opt.value === value) || SORT_OPTIONS[0];
}

