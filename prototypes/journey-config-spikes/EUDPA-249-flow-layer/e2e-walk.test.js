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

/**
 * Line-scoped counterpart to `fill()`: POST to
 * `/lines/{lineId}/{pageName}` and assert the redirect target. By
 * default we expect the next per-line page in declared order
 * (`commodity-details → species-details → number-of-animals`); on the
 * last page pass `{ expectedNext }` to assert the redirect back to
 * `/lines`.
 */
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

describe('happy-path e2e walk — internal-market with 1 commodity line', () => {
  it('walks /start → every page → /task-list all Completed → CYA', async () => {
    const jar = makeCookieJar()

    // -- Section 1: origin + reason --------------------------------------
    // NB. region-code is intentionally skipped — regionCode is
    // completion-optional so /start jumps past it under the
    // pageStatus rule. Same reasoning for transited-countries,
    // internal-reference and number-of-packages below. The pattern:
    // any obligation with `status: 'optional'` (or flow-level
    // `mandate: 'soft'` that resolves to optional at runtime) has
    // its page rolled up to F immediately once in scope.
    await fill(jar, 'country-of-origin', { countryOfOrigin: 'FR' })
    await fill(jar, 'region-code-requirement', { regionCodeRequirement: 'no' })
    await fill(jar, 'reason-for-import', { reasonForImport: 'internal-market' })
    await fill(jar, 'purpose-details', {
      purposeInInternalMarket: 'breeding'
    })

    // -- Section 2: transporter + transport ------------------------------
    await fill(jar, 'transporter-type', { transporterType: 'commercial' })
    await fill(jar, 'transporter-details', {
      commercialTransporter__name: 'ACME Transport Ltd',
      commercialTransporter__addressLine1: 'Farm Lane',
      commercialTransporter__town: 'Exeter',
      commercialTransporter__postcode: 'EX1 1AA'
    })
    await fill(jar, 'means-of-transport', { meansOfTransport: 'road-vehicle' })
    await fill(jar, 'transport-identification', {
      transportIdentification: 'REG-123',
      transportDocumentReference: 'DOC-456'
    })
    // transited-countries omitted — see soft/optional note above.

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

    // -- Section 4: trader details --------------------------------------
    // Five address blocks (place of origin, consignor, consignee,
    // importer, place of destination). Each renders 4 sub-fields.
    await fill(jar, 'place-of-origin', {
      placeOfOrigin__name: 'Origin Farm Ltd',
      placeOfOrigin__addressLine1: '1 Farm Lane',
      placeOfOrigin__town: 'Exeter',
      placeOfOrigin__postcode: 'EX1 1AA'
    })
    await fill(jar, 'consignor', {
      consignor__name: 'Sender Co',
      consignor__addressLine1: '2 Sender Street',
      consignor__town: 'Bristol',
      consignor__postcode: 'BS1 1BB'
    })
    await fill(jar, 'consignee', {
      consignee__name: 'Receiver Ltd',
      consignee__addressLine1: '3 Receiver Road',
      consignee__town: 'Leeds',
      consignee__postcode: 'LS1 1CC'
    })
    await fill(jar, 'importer', {
      importer__name: 'Importer Trading',
      importer__addressLine1: '4 Import Way',
      importer__town: 'Cardiff',
      importer__postcode: 'CF1 1DD'
    })
    await fill(jar, 'place-of-destination', {
      placeOfDestination__name: 'Destination Farm',
      placeOfDestination__addressLine1: '5 Destination Lane',
      placeOfDestination__town: 'Manchester',
      placeOfDestination__postcode: 'M1 1EE'
    })

    // -- Section 5: references ------------------------------------------
    // contact-address is required; internal-reference is optional.
    await fill(jar, 'contact-address', {
      contactAddress__name: 'Contact Person',
      contactAddress__addressLine1: '6 Contact Close',
      contactAddress__town: 'Glasgow',
      contactAddress__postcode: 'G1 1FF'
    })
    // internal-reference omitted — internalReferenceNumber is optional.
    // Accompanying-documents: this walk exercises the branchedGate
    // all-mandatory branch — filling one field flips all four to
    // mandatory and the domain checks the enum + string-max + date
    // predicates all fire cleanly. See the transit walk below for the
    // all-optional branch (subsection F without any submission).
    //
    // Posted directly (not via `fill()`) because the branchedGate
    // starts all four fields optional, so /start skips the page —
    // the user reaches it voluntarily via the task-list.
    const accompRes = await inject(jar, {
      method: 'POST',
      url: `${BASE}/pages/accompanying-documents`,
      payload: {
        accompanyingDocumentType: 'health-certificate',
        accompanyingDocumentAttachmentType: 'physical-original',
        accompanyingDocumentReference: 'HC-2026-00042',
        accompanyingDocumentDateOfIssue: '01/06/2026'
      }
    })
    expect(
      accompRes.statusCode,
      `POST /pages/accompanying-documents (all 4 fields filled) failed`
    ).toBe(302)

    // -- Section 5: commodity lines -------------------------------------
    // Minting a line is bespoke `/lines/add`; add-then-fill redirects
    // straight into the new line's first per-line page. Each per-line
    // page then walks to the next unfulfilled mandatory in the same
    // subsection, or to `/lines` when the line's mandatories are done.
    // NB. number-of-packages is intentionally NOT visited on the walk
    // — its completion-mandate is optional, so nextAfterForLine skips
    // it and redirects to /lines after number-of-animals.
    const addRes = await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/add`,
      payload: {}
    })
    expect(addRes.statusCode).toBe(302)
    expect(addRes.headers.location).toBe(
      `${BASE}/lines/line1/commodity-details`
    )

    await fillLinePage(jar, 'line1', 'commodity-details', {
      'commodityCode-line1': '0102'
    })
    await fillLinePage(jar, 'line1', 'commodity-type', {
      'commodityType-line1': 'meat-producing'
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

    // -- Terminal: task list shows every subsection Completed -----------
    const list = await inject(jar, {
      method: 'GET',
      url: `${BASE}/task-list`
    })
    expect(list.statusCode).toBe(200)
    // 14 subsections total (origin, reason, transporter-type, transport,
    // arrival-at-port, unweaned, certified-for, origin-details,
    // destination-details, contact, trader-reference,
    // accompanying-documents, commodity-lines-manage,
    // commodity-lines-details) — each should render a Completed status
    // tag. A numeric assertion catches new subsections being added
    // without their fulfilment being wired.
    const completedCount = (list.payload.match(/Completed/g) ?? []).length
    expect(
      completedCount,
      `expected 14 Completed tags on the task list, got ${completedCount}`
    ).toBe(14)
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
    // Line-scoped obligations render as per-line rows: one row per line
    // with key "Commodity code (commodity line 1)" and per-line Change
    // URL. Value is the resolved label alone (not a "line1: X" string).
    expect(cya.payload).toContain('Cattle (0102)') // commodityCode-line1 row
    expect(cya.payload).toMatch(/Commodity code[\s\S]{0,400}commodity line 1/)
    // Optional obligations we intentionally skipped should NOT render
    // as CYA rows (unfilled → cya-controller drops the row and no
    // "you still need to complete" prompt is raised for optionals).
    expect(cya.payload).not.toContain('MYREF-001')
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
    // region-code omitted — completion-optional; /start skips.
    await fill(jar, 'reason-for-import', {
      reasonForImport: 'transit-through-eu'
    })
    // NB. no purpose-details step — purposeInInternalMarket is
    // out-of-scope (NA) on the transit path, so /start skips it. This
    // is the load-bearing divergence from the internal-market walk.

    // -- Section 2: transporter + transport ------------------------------
    await fill(jar, 'transporter-type', { transporterType: 'commercial' })
    await fill(jar, 'transporter-details', {
      commercialTransporter__name: 'ACME Transport Ltd',
      commercialTransporter__addressLine1: 'Farm Lane',
      commercialTransporter__town: 'Exeter',
      commercialTransporter__postcode: 'EX1 1AA'
    })
    await fill(jar, 'means-of-transport', { meansOfTransport: 'road-vehicle' })
    await fill(jar, 'transport-identification', {
      transportIdentification: 'REG-123',
      transportDocumentReference: 'DOC-456'
    })
    // transited-countries omitted — completion-optional; /start skips.

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

    // -- Section 4: trader details --------------------------------------
    // Five address blocks (place of origin, consignor, consignee,
    // importer, place of destination). Each renders 4 sub-fields.
    await fill(jar, 'place-of-origin', {
      placeOfOrigin__name: 'Origin Farm Ltd',
      placeOfOrigin__addressLine1: '1 Farm Lane',
      placeOfOrigin__town: 'Exeter',
      placeOfOrigin__postcode: 'EX1 1AA'
    })
    await fill(jar, 'consignor', {
      consignor__name: 'Sender Co',
      consignor__addressLine1: '2 Sender Street',
      consignor__town: 'Bristol',
      consignor__postcode: 'BS1 1BB'
    })
    await fill(jar, 'consignee', {
      consignee__name: 'Receiver Ltd',
      consignee__addressLine1: '3 Receiver Road',
      consignee__town: 'Leeds',
      consignee__postcode: 'LS1 1CC'
    })
    await fill(jar, 'importer', {
      importer__name: 'Importer Trading',
      importer__addressLine1: '4 Import Way',
      importer__town: 'Cardiff',
      importer__postcode: 'CF1 1DD'
    })
    await fill(jar, 'place-of-destination', {
      placeOfDestination__name: 'Destination Farm',
      placeOfDestination__addressLine1: '5 Destination Lane',
      placeOfDestination__town: 'Manchester',
      placeOfDestination__postcode: 'M1 1EE'
    })

    // -- Section 5: references ------------------------------------------
    // contact-address is required; internal-reference is optional.
    await fill(jar, 'contact-address', {
      contactAddress__name: 'Contact Person',
      contactAddress__addressLine1: '6 Contact Close',
      contactAddress__town: 'Glasgow',
      contactAddress__postcode: 'G1 1FF'
    })
    // internal-reference omitted — internalReferenceNumber is optional.
    // Accompanying-documents intentionally NOT visited on this walk —
    // its branchedGate applyTo makes all four fields optional as long
    // as none is filled, so the subsection rolls up to F trivially
    // without any submission. Complements the internal-market walk
    // above which exercises the all-mandatory branch.

    // -- Section 5: commodity lines -------------------------------------
    // Same line-major add-then-fill shape as the internal-market walk.
    const addRes = await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/add`,
      payload: {}
    })
    expect(addRes.statusCode).toBe(302)
    expect(addRes.headers.location).toBe(
      `${BASE}/lines/line1/commodity-details`
    )

    await fillLinePage(jar, 'line1', 'commodity-details', {
      'commodityCode-line1': '0102'
    })
    await fillLinePage(jar, 'line1', 'commodity-type', {
      'commodityType-line1': 'meat-producing'
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

    // -- Terminal: task list shows every subsection Completed -----------
    const list = await inject(jar, {
      method: 'GET',
      url: `${BASE}/task-list`
    })
    expect(list.statusCode).toBe(200)
    // 14 subsections — same as internal-market. The `reason` subsection
    // rolls up to F once reason-for-import is filled because
    // purposeInInternalMarket goes NA and NA obligations don't hold
    // the subsection open. The new `accompanying-documents` subsection
    // is F because branchedGate keeps all four fields optional while
    // none has been filled (see the block comment on the fill step
    // above).
    const completedCount = (list.payload.match(/Completed/g) ?? []).length
    expect(
      completedCount,
      `expected 14 Completed tags on the task list, got ${completedCount}`
    ).toBe(14)
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
    // Line-scoped commodity code renders as per-line row (see internal-
    // market walk above for the shape).
    expect(cya.payload).toContain('Cattle (0102)')
    expect(cya.payload).toMatch(/Commodity code[\s\S]{0,400}commodity line 1/)
    expect(cya.payload).not.toContain('MYREF-002')
    expect(cya.payload).not.toContain(
      'You still need to complete some sections'
    )
  })
})
