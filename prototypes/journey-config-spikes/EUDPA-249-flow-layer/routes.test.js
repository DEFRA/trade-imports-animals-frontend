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

  it('GET /task-list renders the Add-commodity-lines subsection as a clickable /lines link (not NA)', async () => {
    // Regression guard: the subsection's only child is a read-only
    // intro page, so a naive containerStatus rollup returns NA and
    // the hub used to strip the href. The hub now special-cases it
    // to always show as clickable and derive status from line count.
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/task-list'
    })
    expect(res.statusCode).toBe(200)
    expect(res.payload).toContain('Add commodity lines')
    expect(res.payload).toContain('href="/prototype/eudpa-249/lines"')
    // With no lines added yet, status is Not started, not Not applicable.
    expect(res.payload).not.toMatch(
      /Add commodity lines[\s\S]{0,400}Not applicable/
    )
  })

  it('GET /task-list shows the Add-commodity-lines subsection as Completed once a line has been added', async () => {
    // Regression guard for the "add step is done as soon as ≥ 1 line
    // exists" rule. Per-line details still gate the sibling
    // commodity-lines-details subsection; this one only measures the
    // add step.
    const jar = makeCookieJar()
    const addRes = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/lines/add'
    })
    expect([200, 302, 303]).toContain(addRes.statusCode)

    const listRes = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/task-list'
    })
    expect(listRes.statusCode).toBe(200)
    // The status tag next to "Add commodity lines" should now be
    // "Completed", not "Not started" or "In progress".
    expect(listRes.payload).toMatch(/Add commodity lines[\s\S]{0,400}Completed/)
    expect(listRes.payload).not.toMatch(
      /Add commodity lines[\s\S]{0,400}Not started/
    )
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

  it('POST with invalid choice re-renders 400 with error summary and a labelled submit button', async () => {
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/country-of-origin',
      payload: { countryOfOrigin: 'ZZZ' }
    })
    expect(res.statusCode).toBe(400)
    expect(res.payload).toContain('There is a problem')
    expect(res.payload).toContain('Select a value from the list')
    // Regression guard: the POST-error re-render must include buttonText
    // (was dropped in the i18n phase-5 refactor; caught by code review).
    expect(res.payload).toContain('Save and continue')
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

  it('POST with a blank value returns 400 with the flow-supplied required message', async () => {
    // countryOfOrigin is the first (and today only) obligation flagged
    // `mandatoryToSaveAndContinue: true`. Its flow-entry `errors.required`
    // string wins over any code-keyed COPY entry.
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/country-of-origin',
      payload: {}
    })
    expect(res.statusCode).toBe(400)
    expect(res.payload).toContain('There is a problem')
    expect(res.payload).toContain('Enter a country of origin')
  })
})

describe('page-controller — mandatoryToSaveAndContinue default', () => {
  it('POST with a blank value to a page WITHOUT the flag still redirects on', async () => {
    // Baseline behaviour: without mandatoryToSaveAndContinue: true,
    // a blank POST validates (domain allows unset) and the controller
    // redirects to the next flow page. Proves the property defaults
    // to false and only opts in per-flow-entry.
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/region-code-requirement',
      payload: {}
    })
    expect(res.statusCode).toBe(302)
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
      payload: { reasonForImport: 'transit' }
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

describe('page-controller — address-block composite widget (commercialTransporter)', () => {
  async function setUpCommercial(jar) {
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/transporter-type',
      payload: { transporterType: 'commercial' }
    })
  }

  it('GET renders four sub-inputs inside a fieldset (name, addressLine1, town, postcode)', async () => {
    const jar = makeCookieJar()
    await setUpCommercial(jar)
    const res = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/pages/transporter-details'
    })
    expect(res.statusCode).toBe(200)
    // Each sub-field renders a named input at `commercialTransporter__<sub>`.
    expect(res.payload).toContain('name="commercialTransporter__name"')
    expect(res.payload).toContain('name="commercialTransporter__addressLine1"')
    expect(res.payload).toContain('name="commercialTransporter__town"')
    expect(res.payload).toContain('name="commercialTransporter__postcode"')
    // Sub-field labels come from `presentation.address.subField.*` via t().
    expect(res.payload).toContain('Business or organisation name')
    expect(res.payload).toContain('Address line 1')
    expect(res.payload).toContain('Town or city')
    expect(res.payload).toContain('Postcode')
  })

  it('POST with all sub-fields blank returns 400 with one error per required sub-field', async () => {
    const jar = makeCookieJar()
    await setUpCommercial(jar)
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/transporter-details',
      payload: {}
    })
    expect(res.statusCode).toBe(400)
    expect(res.payload).toContain('There is a problem')
    // One "Enter {subField}" per required sub-field.
    expect(res.payload).toContain('Enter Business or organisation name')
    expect(res.payload).toContain('Enter Address line 1')
    expect(res.payload).toContain('Enter Town or city')
    expect(res.payload).toContain('Enter Postcode')
    // Error-summary anchors target the sub-inputs specifically.
    expect(res.payload).toContain('#commercialTransporter__name')
    expect(res.payload).toContain('#commercialTransporter__postcode')
  })

  it('POST with only some sub-fields blank returns 400 with just those errors', async () => {
    const jar = makeCookieJar()
    await setUpCommercial(jar)
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/transporter-details',
      payload: {
        commercialTransporter__name: 'ACME',
        commercialTransporter__addressLine1: '',
        commercialTransporter__town: 'Exeter',
        commercialTransporter__postcode: ''
      }
    })
    expect(res.statusCode).toBe(400)
    expect(res.payload).toContain('Enter Address line 1')
    expect(res.payload).toContain('Enter Postcode')
    expect(res.payload).not.toContain('Enter Business or organisation name')
    expect(res.payload).not.toContain('Enter Town or city')
  })

  it('POST with all sub-fields filled redirects to the next page', async () => {
    const jar = makeCookieJar()
    await setUpCommercial(jar)
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/transporter-details',
      payload: {
        commercialTransporter__name: 'ACME',
        commercialTransporter__addressLine1: 'Farm Lane',
        commercialTransporter__town: 'Exeter',
        commercialTransporter__postcode: 'EX1 1AA'
      }
    })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe(
      '/prototype/eudpa-249/pages/means-of-transport'
    )
  })

  it('CYA renders the composite value as a comma-joined summary', async () => {
    const jar = makeCookieJar()
    await setUpCommercial(jar)
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/transporter-details',
      payload: {
        commercialTransporter__name: 'ACME',
        commercialTransporter__addressLine1: 'Farm Lane',
        commercialTransporter__town: 'Exeter',
        commercialTransporter__postcode: 'EX1 1AA'
      }
    })
    const cya = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/check-your-answers'
    })
    expect(cya.statusCode).toBe(200)
    expect(cya.payload).toContain('ACME, Farm Lane, Exeter, EX1 1AA')
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

  it('POST /lines/add mints a line and add-then-fill redirects into its first per-line page', async () => {
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/lines/add',
      payload: {}
    })
    expect(res.statusCode).toBe(302)
    // Line-major add-then-fill: mint + jump straight into the new
    // line's first per-line page rather than returning to the list.
    expect(res.headers.location).toBe(
      '/prototype/eudpa-249/lines/line1/commodity-details'
    )
    // Follow up: /lines now shows a summary block for line1.
    const listing = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/lines'
    })
    expect(listing.payload).toContain('Commodity line 1')
  })
})

describe('line-page-controller — species-details (line-scoped rendering)', () => {
  it('GET /lines/{id}/species-details 302s to /lines when the line does not exist', async () => {
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/lines/line1/species-details'
    })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/prototype/eudpa-249/lines')
  })

  it('GET after adding a cattle line renders one checkbox group with cattle-list options', async () => {
    const jar = makeCookieJar()
    // Add a commodity line (mints line1) — the add-then-fill redirect
    // lands us at commodity-details for line1.
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/lines/add',
      payload: {}
    })
    // Pick a cattle code on that line.
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/lines/line1/commodity-details',
      payload: { 'commodityCode-line1': '0102' }
    })
    const res = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/lines/line1/species-details'
    })
    expect(res.statusCode).toBe(200)
    // Line-scoped: one field for THIS line only.
    expect(res.payload).toMatch(/name="species-line1"/)
    expect(res.payload).toContain('Cattle')
    expect(res.payload).toContain('Buffalo')
    expect(res.payload).toContain('Bison')
    // Horse (in a different commodity-code list) should NOT be present.
    expect(res.payload).not.toContain('Horse')
  })
})

describe('animals-certified-for — statically stubbed options (V4: 16 purposes, step 5d)', () => {
  it('GET /pages/animals-certified-for renders V4 purpose labels', async () => {
    // Step 5d overhauled this from a 4-species stub (Cattle/Sheep/
    // Pigs/Horses) to the 16 V4 purposes. Real MDM lists come from
    // the certificate in production.
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/pages/animals-certified-for'
    })
    expect(res.statusCode).toBe(200)
    // Spot-check a few of the new labels.
    expect(res.payload).toContain('Slaughter')
    expect(res.payload).toContain('Further keeping')
    expect(res.payload).toContain('Registered equine animal')
    expect(res.payload).toContain('Travelling circus/animal act')
    // The old stubs are gone.
    expect(res.payload).not.toContain('>Cattle<')
    expect(res.payload).not.toContain('>Sheep<')
  })
})
