/**
 * Plugin integration tests — spin up a minimal Hapi server that
 * registers only the pieces the browser layer depends on:
 *   - hapi/vision (nunjucks)
 *   - hapi/yar (server-side session)
 *   - the journeyConfigFlow plugin under test
 *
 * We drive the routes via `server.inject()` and a per-test cookie jar
 * so session state carries across requests.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import Hapi from '@hapi/hapi'
import Vision from '@hapi/vision'
import Yar from '@hapi/yar'
import nunjucks from 'nunjucks'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { journeyConfigFlow } from './routes.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(dirname, '../../../')

async function makeServer() {
  const server = Hapi.server({ port: 0 })
  await server.register([
    {
      plugin: Yar,
      options: {
        storeBlank: true,
        cookieOptions: {
          password: 'the-quick-brown-fox-jumps-over-the-lazy-brown-dog',
          isSecure: false
        }
      }
    },
    Vision
  ])
  const nunjucksEnvironment = nunjucks.configure(
    [path.join(rootDir, 'node_modules/govuk-frontend/dist/'), dirname],
    { autoescape: true, throwOnUndefined: false }
  )
  // Register an asset-path filter stub so shared/layout.njk's `getAssetPath`
  // filter call doesn't blow up during rendering.
  nunjucksEnvironment.addGlobal('getAssetPath', (p) => `/public/${p}`)
  server.views({
    engines: {
      njk: {
        compile(src, options) {
          const template = nunjucks.compile(src, options.environment)
          return (ctx) => template.render(ctx)
        }
      }
    },
    compileOptions: { environment: nunjucksEnvironment },
    relativeTo: dirname,
    path: '.',
    isCached: false
  })
  await server.register(journeyConfigFlow)
  await server.initialize()
  return server
}

let server
beforeAll(async () => {
  server = await makeServer()
})

// A tiny cookie-jar so subsequent requests carry the yar session.
function makeCookieJar() {
  const cookies = new Map()
  return {
    get headers() {
      const entries = [...cookies.entries()].map(([k, v]) => `${k}=${v}`)
      return entries.length ? { cookie: entries.join('; ') } : {}
    },
    absorb(setCookieHeader) {
      const values = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : setCookieHeader
          ? [setCookieHeader]
          : []
      for (const line of values) {
        const [pair] = line.split(';')
        const [name, value] = pair.split('=')
        if (name && value !== undefined) cookies.set(name.trim(), value.trim())
      }
    }
  }
}

async function inject(jar, options) {
  const res = await server.inject({
    ...options,
    headers: { ...jar.headers, ...(options.headers ?? {}) }
  })
  jar.absorb(res.headers['set-cookie'])
  return res
}

describe('start / task-list / reset', () => {
  it('GET /start redirects to the first unfulfilled page', async () => {
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/start'
    })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe(
      '/prototype/eudpa-249/pages/country-of-origin'
    )
  })

  it('GET /task-list renders section headings and status tags', async () => {
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/task-list'
    })
    expect(res.statusCode).toBe(200)
    expect(res.payload).toContain('Country of origin and reason')
    expect(res.payload).toContain('Transporter and transport')
    expect(res.payload).toContain('Not started')
  })

  it('POST /reset clears state and redirects back to /task-list', async () => {
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/reset',
      payload: {}
    })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/prototype/eudpa-249/task-list')
  })
})

describe('page-controller — country-of-origin', () => {
  it('GET renders the country-of-origin page as a select', async () => {
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/pages/country-of-origin'
    })
    expect(res.statusCode).toBe(200)
    expect(res.payload).toContain('Country of origin')
    expect(res.payload).toContain('France') // label for FR
  })

  it('POST with invalid choice re-renders 400 with error summary', async () => {
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/country-of-origin',
      payload: { countryOfOrigin: 'ZZZ' }
    })
    expect(res.statusCode).toBe(400)
    expect(res.payload).toContain('There is a problem')
    expect(res.payload).toContain('Select a value from the list')
  })

  it('POST with a valid choice redirects to next page (region-code-requirement)', async () => {
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/country-of-origin',
      payload: { countryOfOrigin: 'FR' }
    })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe(
      '/prototype/eudpa-249/pages/region-code-requirement'
    )
  })
})

describe('page-controller — option filtering', () => {
  it('purpose-details shows options only after reason-for-import = internal-market', async () => {
    const jar = makeCookieJar()
    // Set reason to internal-market via POST.
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/reason-for-import',
      payload: { reasonForImport: 'internal-market' }
    })
    const res = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/pages/purpose-details'
    })
    expect(res.statusCode).toBe(200)
    // Radio label options come from the domain labels map.
    expect(res.payload).toContain('Breeding')
    expect(res.payload).toContain('Fattening')
  })

  it('purpose-details is skipped (redirect via nextAfter) when reason = transit-through-eu', async () => {
    const jar = makeCookieJar()
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/reason-for-import',
      payload: { reasonForImport: 'transit-through-eu' }
    })
    // /start now redirects to the next unfulfilled — which is NOT purpose,
    // since purpose is NA on transit.
    const res = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/start'
    })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).not.toBe(
      '/prototype/eudpa-249/pages/purpose-details'
    )
  })
})

describe('page-controller — question visibility (transporter)', () => {
  it('shows commercial-transporter when transporterType is commercial', async () => {
    const jar = makeCookieJar()
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/transporter-type',
      payload: { transporterType: 'commercial' }
    })
    const res = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/pages/transporter-details'
    })
    expect(res.statusCode).toBe(200)
    expect(res.payload).toContain('Commercial transporter details')
    expect(res.payload).not.toContain('Private transporter details')
  })
})

describe('page-controller — real V4 predicates', () => {
  it('arrival-details rejects a badly-formatted date', async () => {
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/arrival-details',
      payload: { arrivalDateAtPort: '2026-12-12', portOfEntry: 'DVR' }
    })
    expect(res.statusCode).toBe(400)
    expect(res.payload).toContain('DD/MM/YYYY')
  })

  it('arrival-details accepts DD/MM/YYYY', async () => {
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/arrival-details',
      payload: { arrivalDateAtPort: '12/12/2026', portOfEntry: 'DVR' }
    })
    expect(res.statusCode).toBe(302)
  })
})

describe('lines-index + add', () => {
  it('GET /lines shows "No commodity lines" when none exist', async () => {
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/lines'
    })
    expect(res.statusCode).toBe(200)
    expect(res.payload).toContain('No commodity lines added yet.')
  })

  it('POST /lines/add mints a line and redirects back to /lines', async () => {
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/lines/add',
      payload: {}
    })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/prototype/eudpa-249/lines')
    // Follow up: after add, /lines shows a line1 row.
    const listing = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/lines'
    })
    expect(listing.payload).toContain('line1')
  })
})

describe('lookup — seeded animals-certified-for', () => {
  it('GET /pages/animals-certified-for/resolve seeds and redirects', async () => {
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/pages/animals-certified-for/resolve'
    })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe(
      '/prototype/eudpa-249/pages/animals-certified-for'
    )
    // Now the page renders with populated checkbox labels.
    const page = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/pages/animals-certified-for'
    })
    expect(page.statusCode).toBe(200)
    expect(page.payload).toContain('bovine')
  })
})
