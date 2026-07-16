/**
 * GraphQL file uploads via the multipart request spec
 * (https://github.com/jaydenseric/graphql-multipart-request-spec).
 *
 * Apollo's `httpLink` JSON-serializes variables, so it can't send `File` objects.
 * Rather than add `apollo-upload-client`, we hand-roll the multipart form here.
 * Endpoint + token mirror `apolloClient` (dev proxies `/api-gateway` to the gateway;
 * prod hits the gateway directly; bearer token is read per-request from storage).
 */

const uri = import.meta.env.DEV ? '/api-gateway' : import.meta.env.API_GATEWAY || '/graphql'

/**
 * Run a mutation whose input carries file uploads.
 *
 * @param {object} args
 * @param {string} args.query GraphQL document as a string.
 * @param {object} args.variables Variables with the file slots left `null`.
 * @param {File[]} args.files Files to attach, in order.
 * @param {string} args.filesPath Dot-path to the file field in `variables`
 *   (e.g. `variables.input.files`).
 * @param {boolean} [args.list=false] When true, `filesPath` is a list and each
 *   file maps to `${filesPath}.${index}`; when false (default) it's a single
 *   `Upload` scalar and the (one) file maps straight to `filesPath`.
 * @returns {Promise<object>} `data` from the GraphQL response.
 * @throws {Error} with the first GraphQL/HTTP error message.
 */
export async function graphqlUpload({ query, variables, files, filesPath, list = false }) {
  const form = new FormData()
  form.append('operations', JSON.stringify({ query, variables }))

  // map: form-field name → path(s) in `operations` the file should populate.
  const map = {}
  files.forEach((_, i) => {
    map[String(i)] = [list ? `${filesPath}.${i}` : filesPath]
  })
  form.append('map', JSON.stringify(map))
  files.forEach((file, i) => form.append(String(i), file))

  const token = localStorage.getItem('pm_token')
  let res
  try {
    res = await fetch(uri, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // De-facto header for multipart GraphQL; satisfies servers with CSRF
        // protection and is harmless otherwise. Don't set Content-Type — the
        // browser adds the multipart boundary itself.
        'apollo-require-preflight': 'true',
      },
      body: form,
    })
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Coba lagi.')
  }

  let json
  try {
    json = await res.json()
  } catch {
    throw new Error('Respons server tidak valid saat mengunggah file.')
  }

  if (json?.errors?.length) throw new Error(json.errors[0].message || 'Gagal mengunggah file.')
  if (!res.ok) throw new Error('Gagal mengunggah file.')
  return json.data
}
