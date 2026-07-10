/**
 * E2E tests for the line-major commodity-lines UX — dedicated to the
 * surface that changed most in the `line-major commodity-line pages`
 * refactor (`lib/line-page-controller.js`, `/lines/{id}/{page}`
 * routing, the enriched `/lines` list template with per-line summary
 * blocks + Delete forms).
 *
 * The two happy-path walks in `e2e-walk.test.js` already cover the
 * add-then-fill loop for one line as part of a full journey. This
 * file covers the missing surface: multi-line, delete, per-line
 * Change link URLs, the notFilled placeholder, conditional
 * scope-per-line (numberOfPackages only appears for whitelisted
 * commodity codes), and the packages-in-scope save-and-return path.
 *
 * NB. `makeServer` + cookie-jar boilerplate duplicated from
 * `routes.test.js` / `e2e-walk.test.js`. Extraction to a shared
 * helper is a follow-up — see the note on `e2e-walk.test.js`.
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
const BASE = '/prototype/eudpa-249'

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
  const env = nunjucks.configure(
    [path.join(rootDir, 'node_modules/govuk-frontend/dist/'), dirname],
    { autoescape: true, throwOnUndefined: false }
  )
  env.addGlobal('getAssetPath', (p) => `/public/${p}`)
  server.views({
    engines: {
      njk: {
        compile(src, options) {
          const template = nunjucks.compile(src, options.environment)
          return (ctx) => template.render(ctx)
        }
      }
    },
    compileOptions: { environment: env },
    relativeTo: dirname,
    path: '.',
    isCached: false
  })
  await server.register(journeyConfigFlow)
  await server.initialize()
  return server
}

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

let server
beforeAll(async () => {
  server = await makeServer()
})

async function inject(jar, options) {
  const res = await server.inject({
    ...options,
    headers: { ...jar.headers, ...(options.headers ?? {}) }
  })
  jar.absorb(res.headers['set-cookie'])
  return res
}

/** POST `/lines/add`, assert the add-then-fill redirect, and return
 *  the new line's id. */
async function addLine(jar) {
  const res = await inject(jar, {
    method: 'POST',
    url: `${BASE}/lines/add`,
    payload: {}
  })
  expect(res.statusCode).toBe(302)
  const match = /\/lines\/(line\d+)\/commodity-details$/.exec(
    res.headers.location
  )
  expect(match, `add response location: ${res.headers.location}`).toBeTruthy()
  return match[1]
}

/** POST to a per-line page and assert the redirect. `opts.expectedNext`
 *  pins the exact next URL (used for terminal steps that return to
 *  `/lines`); omit for intermediate steps. */
async function fillLinePage(jar, lineId, pageName, payload, opts = {}) {
  const url = `${BASE}/lines/${lineId}/${pageName}`
  const res = await inject(jar, { method: 'POST', url, payload })
  expect(res.statusCode, `POST ${url} payload=${JSON.stringify(payload)}`).toBe(
    302
  )
  if (opts.expectedNext) {
    expect(res.headers.location, `POST ${url} → next`).toBe(opts.expectedNext)
  }
  return res.headers.location
}

async function getLines(jar) {
  return inject(jar, { method: 'GET', url: `${BASE}/lines` })
}

// ---------------------------------------------------------------------------
// Multi-line
// ---------------------------------------------------------------------------

describe('commodity-lines — multi-line', () => {
  it('adds two lines and renders a summary block per line on /lines', async () => {
    const jar = makeCookieJar()
    const l1 = await addLine(jar)
    expect(l1).toBe('line1')
    await fillLinePage(jar, l1, 'commodity-details', {
      'commodityCode-line1': '0102'
    })

    const l2 = await addLine(jar)
    expect(l2).toBe('line2')
    await fillLinePage(jar, l2, 'commodity-details', {
      'commodityCode-line2': '0103'
    })

    const list = await getLines(jar)
    expect(list.statusCode).toBe(200)
    // Both line headings.
    expect(list.payload).toContain('Commodity line 1')
    expect(list.payload).toContain('Commodity line 2')
    // Both commodity code labels resolve.
    expect(list.payload).toContain('Cattle (0102)')
    expect(list.payload).toContain('Pig (0103)')
    // Per-line Change link for line2's commodity-code row exists.
    expect(list.payload).toContain(`${BASE}/lines/line2/commodity-details`)
  })
})

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

describe('commodity-lines — delete', () => {
  it('POST /lines/{id}/delete removes the line and redirects to /lines', async () => {
    const jar = makeCookieJar()
    await addLine(jar)
    const delRes = await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/line1/delete`,
      payload: {}
    })
    expect(delRes.statusCode).toBe(302)
    expect(delRes.headers.location).toBe(`${BASE}/lines`)

    const list = await getLines(jar)
    expect(list.payload).toContain('No commodity lines added yet.')
    expect(list.payload).not.toContain('Commodity line 1')
  })

  it('deleting one line preserves the other lines and their values', async () => {
    const jar = makeCookieJar()
    const l1 = await addLine(jar)
    await fillLinePage(jar, l1, 'commodity-details', {
      'commodityCode-line1': '0102'
    })
    const l2 = await addLine(jar)
    await fillLinePage(jar, l2, 'commodity-details', {
      'commodityCode-line2': '0103'
    })

    await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/line1/delete`,
      payload: {}
    })

    const list = await getLines(jar)
    // line1 gone → Cattle (0102) no longer in the summary.
    expect(list.payload).not.toContain('Cattle (0102)')
    // line2 unchanged.
    expect(list.payload).toContain('Pig (0103)')
    expect(list.payload).toContain('Commodity line 2')
  })
})

// ---------------------------------------------------------------------------
// Change flow (per-row Change links + edit-and-save round-trip)
// ---------------------------------------------------------------------------

describe('commodity-lines — Change flow', () => {
  it('the summary rows link Change to the per-line URL for each obligation', async () => {
    const jar = makeCookieJar()
    await addLine(jar)
    await fillLinePage(jar, 'line1', 'commodity-details', {
      'commodityCode-line1': '0102'
    })
    await fillLinePage(jar, 'line1', 'species-details', {
      'species-line1': ['cattle']
    })

    const list = await getLines(jar)
    expect(list.payload).toContain(`${BASE}/lines/line1/commodity-details`)
    expect(list.payload).toContain(`${BASE}/lines/line1/species-details`)
    expect(list.payload).toContain(`${BASE}/lines/line1/number-of-animals`)
    // 0102 is on the package-count whitelist so the packages row appears.
    expect(list.payload).toContain(`${BASE}/lines/line1/number-of-packages`)
  })

  it('saving after re-submitting a filled per-line page redirects to /lines when the line is complete', async () => {
    // Change flow: user re-visits a filled page from the summary, saves,
    // returns to /lines. nextAfterForLine returns lines-list when no
    // mandatories remain.
    const jar = makeCookieJar()
    await addLine(jar)
    await fillLinePage(jar, 'line1', 'commodity-details', {
      'commodityCode-line1': '0102'
    })
    await fillLinePage(jar, 'line1', 'species-details', {
      'species-line1': ['cattle']
    })
    await fillLinePage(
      jar,
      'line1',
      'number-of-animals',
      { 'numberOfAnimals-line1': 25 },
      { expectedNext: `${BASE}/lines` }
    )

    // Re-POST commodity-details with the same value — line already
    // has all mandatories, so nextAfterForLine returns lines-list.
    await fillLinePage(
      jar,
      'line1',
      'commodity-details',
      { 'commodityCode-line1': '0102' },
      { expectedNext: `${BASE}/lines` }
    )
  })
})

// ---------------------------------------------------------------------------
// Per-line packages flow (optional page, applyTo-scoped)
// ---------------------------------------------------------------------------

describe('commodity-lines — number-of-packages (optional + applyTo-scoped)', () => {
  it('POST to /lines/line1/number-of-packages with a value redirects to /lines', async () => {
    const jar = makeCookieJar()
    await addLine(jar)
    await fillLinePage(jar, 'line1', 'commodity-details', {
      'commodityCode-line1': '0102'
    })
    await fillLinePage(jar, 'line1', 'species-details', {
      'species-line1': ['cattle']
    })
    await fillLinePage(jar, 'line1', 'number-of-animals', {
      'numberOfAnimals-line1': 25
    })
    // Packages is optional but in scope for 0102. Filling it lands
    // back on /lines because no mandatories remain.
    await fillLinePage(
      jar,
      'line1',
      'number-of-packages',
      { 'numberOfPackages-line1': 3 },
      { expectedNext: `${BASE}/lines` }
    )
  })

  it('the packages row only appears for lines whose commodity code is on the whitelist', async () => {
    const jar = makeCookieJar()
    // Line 1: 0103 (Pig) — NOT on PACKAGE_COUNT_COMMODITIES.
    const l1 = await addLine(jar)
    await fillLinePage(jar, l1, 'commodity-details', {
      'commodityCode-line1': '0103'
    })
    // Line 2: 0102 (Cattle) — IS on the whitelist.
    const l2 = await addLine(jar)
    await fillLinePage(jar, l2, 'commodity-details', {
      'commodityCode-line2': '0102'
    })

    const list = await getLines(jar)
    // Line 2 has the packages Change link; line 1 does not.
    expect(list.payload).toContain(`${BASE}/lines/line2/number-of-packages`)
    expect(list.payload).not.toContain(`${BASE}/lines/line1/number-of-packages`)
  })
})

// ---------------------------------------------------------------------------
// Summary rendering — notFilled placeholder, line title, Delete button
// ---------------------------------------------------------------------------

describe('commodity-lines — /lines summary rendering', () => {
  it('shows the notFilled placeholder for unset values on an empty line', async () => {
    const jar = makeCookieJar()
    await addLine(jar)
    const list = await getLines(jar)
    expect(list.statusCode).toBe(200)
    expect(list.payload).toContain('Commodity line 1')
    // notFilled placeholder is "-" — appears as the cell value for
    // the commodity-code row when unset.
    expect(list.payload).toMatch(/Commodity code[\s\S]{0,400}-/)
  })

  it('renders the line title, per-line Delete form, and per-row Change link once a value is set', async () => {
    const jar = makeCookieJar()
    await addLine(jar)
    await fillLinePage(jar, 'line1', 'commodity-details', {
      'commodityCode-line1': '0102'
    })

    const list = await getLines(jar)
    // Line title.
    expect(list.payload).toContain('Commodity line 1')
    // Delete form target and button text.
    expect(list.payload).toContain(`action="${BASE}/lines/line1/delete"`)
    expect(list.payload).toContain('Delete this line')
    // Resolved commodity-code label appears in the summary value.
    expect(list.payload).toContain('Cattle (0102)')
    // Change link for the commodity-code row goes to that line's page.
    expect(list.payload).toContain(`${BASE}/lines/line1/commodity-details`)
  })
})
