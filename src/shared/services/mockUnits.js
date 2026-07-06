/**
 * Mock units (master organisasi/divisi yang mengerjakan project).
 * Shape mirrors the GraphQL `listUnit` results ({ id, name }) so the
 * `searchUnits` fetcher can be swapped for an Apollo query without touching
 * the components that consume it.
 */
export const units = [
  { id: 'un1', name: 'Produksi' },
  { id: 'un2', name: 'Quality Assurance' },
  { id: 'un3', name: 'Quality Control' },
  { id: 'un4', name: 'Research & Development' },
  { id: 'un5', name: 'Finance' },
  { id: 'un6', name: 'Human Resource' },
  { id: 'un7', name: 'Information Technology' },
  { id: 'un8', name: 'Marketing' },
  { id: 'un9', name: 'Warehouse' },
  { id: 'un10', name: 'Procurement' },
]

export function getUnitById(id) {
  return units.find((u) => u.id === id) ?? null
}

/**
 * Search units by name. Returns `[{ id, name }]`.
 * Replace the body with a GraphQL `listUnit` query later — the signature
 * (`term => Promise<[{ id, name }]>`) matches what `BaseMultiSelect` expects.
 */
export async function searchUnits(term = '') {
  const q = term.trim().toLowerCase()
  return q ? units.filter((u) => u.name.toLowerCase().includes(q)) : units
}
