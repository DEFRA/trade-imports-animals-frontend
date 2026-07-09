/**
 * E2E happy-path walks — drive `server.inject` from /start all the way
 * through to /task-list + /check-your-answers, POSTing valid data on
 * every page in the redirect chain.
 *
 * Purpose: catch flow-wiring regressions that page-in-isolation tests
 * miss. The 2026-07-07 breakage (adding new obligations without
 * updating the routing) would have failed here at the first divergent
 * redirect.
 *
 * Shape:
 *   - one test per real journey path (internal-market with 1 line,
 *     transit-through-EU, optional shapes as we add them)
 *   - each test asks GET /start for the next page, POSTs valid data,
 *     asserts the 302 target, and continues
 *   - terminal assertions: /task-list shows every subsection Completed;
 *     /check-your-answers renders every filled row and no "you still
 *     need to complete" banner
 *
 * NB. The `makeServer` + cookie-jar helpers duplicate the ones in
 * `routes.test.js`. If we keep this pattern, extract both to
 * `test-helpers.js` in a follow-up.
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

/**
 * Ask /start where the next unfulfilled page is, POST the payload
 * there, and assert we redirect on. Returns the URL that was posted
 * to so the caller can log a trail if a test fails.
 */
async function fill(jar, expectedPage, payload) {
  const startRes = await inject(jar, { method: 'GET', url: `${BASE}/start` })
  expect(startRes.statusCode, `GET /start before ${expectedPage}`).toBe(302)
  expect(
    startRes.headers.location,
    `GET /start expected to route to ${expectedPage}`
  ).toBe(`${BASE}/pages/${expectedPage}`)
  const postRes = await inject(jar, {
    method: 'POST',
    url: `${BASE}/pages/${expectedPage}`,
    payload
  })
  expect(
    postRes.statusCode,
    `POST /pages/${expectedPage} payload=${JSON.stringify(payload)}`
  ).toBe(302)
  return postRes.headers.location
}

describe('happy-path e2e walk — internal-market with 1 commodity line', () => {
  it('walks /start → every page → /task-list all Completed → CYA', async () => {
    const jar = makeCookieJar()

    // -- Section 1: origin + reason --------------------------------------
    await fill(jar, 'country-of-origin', { countryOfOrigin: 'FR' })
    await fill(jar, 'region-code-requirement', { regionCodeRequirement: 'no' })
    // regionCode is soft (in-scope-optional when requirement=no); the
    // flow still routes through the page in declared order.
    await fill(jar, 'region-code', { regionCode: 'FR-75' })
    await fill(jar, 'reason-for-import', { reasonForImport: 'internal-market' })
    await fill(jar, 'purpose-details', {
      purposeInInternalMarket: 'breeding'
    })

    // -- Section 2: transporter + transport ------------------------------
    await fill(jar, 'transporter-type', { transporterType: 'commercial' })
    await fill(jar, 'transporter-details', {
      commercialTransporter: 'ACME Transport, Farm Lane, EX1 1AA'
    })
    await fill(jar, 'means-of-transport', { meansOfTransport: 'road-vehicle' })
    await fill(jar, 'transport-identification', {
      transportIdentification: 'REG-123',
      transportDocumentReference: 'DOC-456'
    })
    // transitedCountries is soft, in-scope-optional on road-vehicle.
    await fill(jar, 'transited-countries', {
      transitedCountries: ['FR', 'BE']
    })

    // -- Section 3: arrival ---------------------------------------------
    await fill(jar, 'arrival-details', {
      arrivalDateAtPort: '12/12/2026',
      portOfEntry: 'DVR'
    })
    await fill(jar, 'contains-unweaned-animals', {
      containsUnweanedAnimals: 'no'
    })
    await fill(jar, 'animals-certified-for', {
      animalsCertifiedFor: 'bovine'
    })

    // -- Section 4: references ------------------------------------------
    await fill(jar, 'internal-reference', {
      internalReferenceNumber: 'MYREF-001'
    })

    // -- Section 5: commodity lines -------------------------------------
    // Minting a line is bespoke `/lines/add`, not a flow page. Once ≥1
    // line exists the presentsForEach pages come into scope and /start
    // routes to the first of them.
    const addRes = await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/add`,
      payload: {}
    })
    expect(addRes.statusCode).toBe(302)

    await fill(jar, 'commodity-details', { 'commodityCode-line1': '0102' })
    await fill(jar, 'species-details', { 'species-line1': ['cattle'] })
    await fill(jar, 'number-of-animals', { 'numberOfAnimals-line1': 25 })
    // 0102 is on the package-count whitelist, so number-of-packages
    // is in-scope-optional. Fill it so the subsection rolls up to F.
    await fill(jar, 'number-of-packages', { 'numberOfPackages-line1': 3 })

    // -- Terminal: task list shows every subsection Completed -----------
    const list = await inject(jar, {
      method: 'GET',
      url: `${BASE}/task-list`
    })
    expect(list.statusCode).toBe(200)
    // 10 subsections total (origin, reason, transporter-type, transport,
    // arrival-at-port, unweaned, certified-for, trader-reference,
    // commodity-lines-manage, commodity-lines-details) — each should
    // render a Completed status tag. A numeric assertion catches new
    // subsections being added without their fulfilment being wired.
    const completedCount = (list.payload.match(/Completed/g) ?? []).length
    expect(
      completedCount,
      `expected 10 Completed tags on the task list, got ${completedCount}`
    ).toBe(10)
    expect(list.payload).not.toContain('Not started')
    expect(list.payload).not.toContain('In progress')

    // -- Terminal: CYA renders every filled row, no prompts -------------
    const cya = await inject(jar, {
      method: 'GET',
      url: `${BASE}/check-your-answers`
    })
    expect(cya.statusCode).toBe(200)
    // Spot-check a few filled rows — one per section — plus the
    // per-line answer (proves line-scoped storage rendered).
    expect(cya.payload).toContain('France') // countryOfOrigin FR
    expect(cya.payload).toContain('Breeding') // purposeInInternalMarket
    expect(cya.payload).toContain('Road vehicle') // meansOfTransport
    expect(cya.payload).toContain('MYREF-001') // internalReferenceNumber
    expect(cya.payload).toContain('line1: Cattle') // commodityCode-line1
    // The "you still need to complete" banner should be absent.
    expect(cya.payload).not.toContain(
      'You still need to complete some sections'
    )
  })
})

describe('happy-path e2e walk — transit-through-EU with 1 commodity line', () => {
  it('walks /start → every page → /task-list all Completed → CYA, skipping purpose-details', async () => {
    const jar = makeCookieJar()

    // -- Section 1: origin + reason --------------------------------------
    await fill(jar, 'country-of-origin', { countryOfOrigin: 'FR' })
    await fill(jar, 'region-code-requirement', { regionCodeRequirement: 'no' })
    await fill(jar, 'region-code', { regionCode: 'FR-75' })
    await fill(jar, 'reason-for-import', {
      reasonForImport: 'transit-through-eu'
    })
    // NB. no purpose-details step — purposeInInternalMarket is
    // out-of-scope (NA) on the transit path, so /start skips it. This
    // is the load-bearing divergence from the internal-market walk.

    // -- Section 2: transporter + transport ------------------------------
    await fill(jar, 'transporter-type', { transporterType: 'commercial' })
    await fill(jar, 'transporter-details', {
      commercialTransporter: 'ACME Transport, Farm Lane, EX1 1AA'
    })
    await fill(jar, 'means-of-transport', { meansOfTransport: 'road-vehicle' })
    await fill(jar, 'transport-identification', {
      transportIdentification: 'REG-123',
      transportDocumentReference: 'DOC-456'
    })
    await fill(jar, 'transited-countries', {
      transitedCountries: ['FR', 'BE']
    })

    // -- Section 3: arrival ---------------------------------------------
    await fill(jar, 'arrival-details', {
      arrivalDateAtPort: '12/12/2026',
      portOfEntry: 'DVR'
    })
    await fill(jar, 'contains-unweaned-animals', {
      containsUnweanedAnimals: 'no'
    })
    await fill(jar, 'animals-certified-for', {
      animalsCertifiedFor: 'bovine'
    })

    // -- Section 4: references ------------------------------------------
    await fill(jar, 'internal-reference', {
      internalReferenceNumber: 'MYREF-002'
    })

    // -- Section 5: commodity lines -------------------------------------
    const addRes = await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/add`,
      payload: {}
    })
    expect(addRes.statusCode).toBe(302)

    await fill(jar, 'commodity-details', { 'commodityCode-line1': '0102' })
    await fill(jar, 'species-details', { 'species-line1': ['cattle'] })
    await fill(jar, 'number-of-animals', { 'numberOfAnimals-line1': 25 })
    await fill(jar, 'number-of-packages', { 'numberOfPackages-line1': 3 })

    // -- Terminal: task list shows every subsection Completed -----------
    const list = await inject(jar, {
      method: 'GET',
      url: `${BASE}/task-list`
    })
    expect(list.statusCode).toBe(200)
    // 10 subsections — same as internal-market. The `reason` subsection
    // rolls up to F once reason-for-import is filled because
    // purposeInInternalMarket goes NA and NA obligations don't hold
    // the subsection open.
    const completedCount = (list.payload.match(/Completed/g) ?? []).length
    expect(
      completedCount,
      `expected 10 Completed tags on the task list, got ${completedCount}`
    ).toBe(10)
    expect(list.payload).not.toContain('Not started')
    expect(list.payload).not.toContain('In progress')

    // -- Terminal: CYA renders every filled row, no prompts -------------
    const cya = await inject(jar, {
      method: 'GET',
      url: `${BASE}/check-your-answers`
    })
    expect(cya.statusCode).toBe(200)
    expect(cya.payload).toContain('France') // countryOfOrigin FR
    expect(cya.payload).toContain('Transit through the EU') // reasonForImport
    // Purpose is out-of-scope on transit — its row should NOT render.
    expect(cya.payload).not.toContain('Breeding')
    expect(cya.payload).not.toContain('Fattening')
    expect(cya.payload).toContain('Road vehicle') // meansOfTransport
    expect(cya.payload).toContain('MYREF-002') // internalReferenceNumber
    expect(cya.payload).toContain('line1: Cattle')
    expect(cya.payload).not.toContain(
      'You still need to complete some sections'
    )
  })
})
