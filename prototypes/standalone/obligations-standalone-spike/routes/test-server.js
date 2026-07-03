import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Hapi from '@hapi/hapi'
import vision from '@hapi/vision'
import nunjucks from 'nunjucks'
import { BASE, startPath } from '../journey/index.js'
import { obligationsSpike } from '../routes.js'

/**
 * Test support — a REAL Hapi server with vision/nunjucks mirroring
 * src/config/nunjucks/nunjucks.js (govuk-frontend dist + the prototypes
 * tree), so route specs exercise full request -> contract -> template
 * round trips (TOOL-19). The wrapper keeps a cookie jar per instance so
 * a spec drives one journey the way a browser would.
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(dirname, '..', '..', '..', '..')

const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([
    path.join(repoRoot, 'node_modules', 'govuk-frontend', 'dist'),
    path.join(repoRoot, 'prototypes')
  ]),
  { autoescape: true, trimBlocks: true, lstripBlocks: true }
)
environment.addGlobal('getAssetPath', (asset) => `/public/${asset}`)

const visionConfig = {
  plugin: vision,
  options: {
    engines: {
      njk: {
        compile: (src, options) => {
          const template = nunjucks.compile(src, options.environment)
          return (context) => template.render(context)
        }
      }
    },
    compileOptions: { environment },
    relativeTo: repoRoot,
    path: ['prototypes']
  }
}

/** Encode a form object as a browser would (arrays repeat the key). */
const encodeForm = (form) =>
  new URLSearchParams(
    Object.entries(form).flatMap(([name, value]) =>
      [].concat(value).map((item) => [name, String(item)])
    )
  ).toString()

/** The standard all-tasks-answered drive; override per-page payloads
 * (e.g. `{ 'driving-history': { hadClaims: 'yes' } }`). */
export const HAPPY_ANSWERS = [
  ['email', { email: 'sam@example.com' }],
  ['about-you', { fullName: 'Alex Driver' }],
  ['your-vehicle', { registration: 'AB12CDE' }],
  ['driving-history', { hadClaims: 'no' }],
  ['cover-type', { coverType: 'comprehensive', voluntaryExcess: 'no' }],
  ['optional-extras', {}],
  ['addons', {}]
]

export async function createTestServer() {
  const server = Hapi.server()
  await server.register(visionConfig)
  await server.register(obligationsSpike)
  await server.initialize()

  let cookie = null
  const inject = async (options) => {
    const response = await server.inject({
      ...options,
      headers: { ...(cookie && { cookie }), ...options.headers }
    })
    const set = response.headers['set-cookie']
    if (set) {
      cookie = []
        .concat(set)
        .map((entry) => entry.split(';')[0])
        .join('; ')
    }
    return response
  }

  const client = {
    server,
    base: BASE,
    get: (url) => inject({ method: 'GET', url }),
    post: (url, form = {}) =>
      inject({
        method: 'POST',
        url,
        payload: encodeForm(form),
        headers: { 'content-type': 'application/x-www-form-urlencoded' }
      }),
    /** POST Start now — mints the journey and points the cookie at it. */
    startJourney: () => client.post(startPath()),
    /** Answer every task page in hub order (spike-a's happy path). */
    answerAllTasks: async (overrides = {}) => {
      for (const [slug, payload] of HAPPY_ANSWERS) {
        await client.post(`${BASE}/${slug}`, { ...payload, ...overrides[slug] })
      }
    },
    stop: () => server.stop()
  }
  return client
}
