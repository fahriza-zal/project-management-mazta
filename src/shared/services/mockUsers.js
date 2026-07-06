/**
 * Mock users. Replace with a GraphQL query (e.g. `users`) later —
 * the shape mirrors the expected API response.
 */
export const users = [
  { id: 'u1', name: 'Andi Wijaya', email: 'andi@maztafarma.co.id', role: 'Project Manager', avatar: '' },
  { id: 'u2', name: 'Bunga Lestari', email: 'bunga@maztafarma.co.id', role: 'Head Department', avatar: '' },
  { id: 'u3', name: 'Citra Dewi', email: 'citra@maztafarma.co.id', role: 'Member', avatar: '' },
  { id: 'u4', name: 'Dimas Pratama', email: 'dimas@maztafarma.co.id', role: 'Member', avatar: '' },
  { id: 'u5', name: 'Eka Saputra', email: 'eka@maztafarma.co.id', role: 'Member', avatar: '' },
  { id: 'u6', name: 'Farah Nadia', email: 'farah@maztafarma.co.id', role: 'Member', avatar: '' },
]

export function getUserById(id) {
  return users.find((u) => u.id === id) ?? null
}
