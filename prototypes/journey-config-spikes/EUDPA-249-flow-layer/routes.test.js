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

  it('POST with a blank value redirects on — countryOfOrigin is M-to-submit per V4', async () => {
    // Regression: countryOfOrigin was previously (incorrectly) marked
    // `mandatoryToProceed: true`. V4 spec (Confluence 6497338582)
    // says "Mandatory to submit" — the page saves blank; completion
    // is enforced at CYA time via a prompt, not at page save. Was
    // corrected in the mandate audit fix.
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/country-of-origin',
      payload: {}
    })
    expect(res.statusCode).toBe(302)
  })
})

describe('page-controller — mandatoryToProceed default', () => {
  it('POST with a blank value to a page WITHOUT the flag still redirects on', async () => {
    // Baseline behaviour: without mandatoryToProceed: true,
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

  it('POST with a blank value to a page WITH the flag returns 400 with the flow-supplied required message', async () => {
    // meansOfTransport is V4 "Mandatory to proceed" — the mandate
    // audit added `mandatoryToProceed: true` on its presents entry
    // with `errors.required: 'errors.meansOfTransport.required'`.
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/means-of-transport',
      payload: {}
    })
    expect(res.statusCode).toBe(400)
    expect(res.payload).toContain('There is a problem')
    expect(res.payload).toContain('Choose the means of transport')
  })

  it('regionCode: mandatoryToProceed does NOT fire when the obligation is effectively-optional (audit re-review NEW-1)', async () => {
    // V4 spec: regionCode is "Mandatory to proceed" but "Required
    // when region code requirement = Yes". The flow entry carries
    // `mandatoryToProceed: true` unconditionally; the `no` branch
    // is enforced by the obligation's applyTo returning
    // `{ inScope: true, status: 'optional' }` (branchedGate).
    //
    // Pre-fix: contract.js `isSufficientForProceed` didn't consult
    // effective status, so a direct visit to /pages/region-code
    // after answering `no` (e.g. via CYA Change link) + blank Save
    // fired the required error — contradicting the spec.
    //
    // Fix: `isSufficientForProceed` now short-circuits to true when
    // `effectiveStatus === 'optional'`, letting the blank submission
    // through and preserving the "Yes-branch page-save block, No-
    // branch allow" semantic.
    const jar = makeCookieJar()
    // Answer the requirement question with 'no' — flips regionCode
    // to inScope: true, status: 'optional'.
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/region-code-requirement',
      payload: { regionCodeRequirement: 'no' }
    })
    // Direct visit to the region-code page + blank Save → 302
    // (not 400), because the mandatoryToProceed gate is now
    // scoped to effective-mandatory.
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/region-code',
      payload: {}
    })
    expect(res.statusCode).toBe(302)
  })

  it('regionCode: mandatoryToProceed DOES fire when the obligation is effectively-mandatory (Yes branch)', async () => {
    // Positive coverage for the fix above — on the Yes branch the
    // gate still blocks blank saves.
    const jar = makeCookieJar()
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/region-code-requirement',
      payload: { regionCodeRequirement: 'yes' }
    })
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/region-code',
      payload: {}
    })
    expect(res.statusCode).toBe(400)
    expect(res.payload).toContain('Enter the region of origin code')
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

  it('GET renders the address fieldset with accessible hint (#3), M-sized legend (#11), and no error state on first render (#10)', async () => {
    // Deferred bucket from 2nd code review.
    const jar = makeCookieJar()
    await setUpCommercial(jar)
    const res = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/pages/transporter-details'
    })
    expect(res.statusCode).toBe(200)
    // #11: legend gets the M-size class.
    expect(res.payload).toMatch(
      /class="[^"]*govuk-fieldset__legend[^"]*govuk-fieldset__legend--m/
    )
    // #3: hint gets an id + fieldset gets aria-describedby pointing at it.
    expect(res.payload).toContain('id="commercialTransporter-hint"')
    expect(res.payload).toMatch(
      /aria-describedby="[^"]*commercialTransporter-hint/
    )
    // #10: no error state on first render.
    expect(res.payload).not.toContain('govuk-form-group--error')
  })

  it('POST with a sub-field error wraps the fieldset in govuk-form-group--error (#10)', async () => {
    // Compound behaviour: any sub-field error should light up the
    // whole composite widget as a group in error state, so the
    // widget matches the GOV.UK Design System error pattern.
    // NB: every required sub-field is filled here so the parent
    // mandatoryToProceed gate passes and we exercise the DOMAIN
    // predicate (bad email → addressSubFieldEmailFormat), not the
    // completeness gate.
    const jar = makeCookieJar()
    await setUpCommercial(jar)
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/transporter-details',
      payload: {
        commercialTransporter__name: 'ACME',
        commercialTransporter__transporterAuthorisationNumber:
          'UK/AUTH/2026/001',
        commercialTransporter__addressLine1: 'Farm Lane',
        commercialTransporter__town: 'Exeter',
        commercialTransporter__postcode: 'EX1 1AA',
        commercialTransporter__country: 'GB',
        commercialTransporter__telephone: '+44 1234 567890',
        // Bad email → fires addressSubFieldEmailFormat → sub-field error.
        commercialTransporter__email: 'not-an-email'
      }
    })
    expect(res.statusCode).toBe(400)
    expect(res.payload).toContain('govuk-form-group--error')
  })

  it('POST with all sub-fields blank returns 400 with the required message (Mandatory to proceed)', async () => {
    // V4: commercialTransporter is "Mandatory to proceed" (Confluence
    // page 6497338582 row 110). Flow entry carries
    // `mandatoryToProceed: true` + `errors.commercialTransporter.required`;
    // contract.js gate consults `domainEntry.isComplete(value)` and
    // rejects the blank submission.
    const jar = makeCookieJar()
    await setUpCommercial(jar)
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/transporter-details',
      payload: {}
    })
    expect(res.statusCode).toBe(400)
    expect(res.payload).toContain('Complete the commercial transporter address')
  })

  it('POST with only some sub-fields blank returns 400 with the required message (Mandatory to proceed treats partial as incomplete)', async () => {
    // V4: same "Mandatory to proceed" as the blank case above. The
    // domain predicate is still interpretation-A (only user-supplied
    // values are validated — a bad email in a partial submission
    // WOULD fire the email predicate) but the flow-level completeness
    // gate fires FIRST and short-circuits: contract.js checks
    // isComplete BEFORE running the domain predicate, so a partial
    // address surfaces one clean "Complete the …" error rather than
    // a mix of predicate errors and the required error.
    const jar = makeCookieJar()
    await setUpCommercial(jar)
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/transporter-details',
      payload: {
        commercialTransporter__name: 'ACME',
        commercialTransporter__transporterAuthorisationNumber:
          'UK/AUTH/2026/001',
        commercialTransporter__addressLine1: '',
        commercialTransporter__town: 'Exeter',
        commercialTransporter__postcode: ''
      }
    })
    expect(res.statusCode).toBe(400)
    expect(res.payload).toContain('Complete the commercial transporter address')
  })

  it('M-to-proceed sibling: contactAddress blank POST returns 400 with the required message', async () => {
    // Parallel coverage for contactAddress (Confluence page 6497338582
    // row 143, user variant). Shares the same contract.js
    // completeness gate as the two transporter obligations.
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/contact-address',
      payload: {}
    })
    expect(res.statusCode).toBe(400)
    expect(res.payload).toContain('Complete the contact address')
  })

  it('M-to-proceed sibling: contactAddress partial POST returns 400 with the required message', async () => {
    // Same completeness gate — partial submission (name only)
    // fails via `domainEntry.isComplete(value)` returning false.
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/contact-address',
      payload: { contactAddress__name: 'Contact Person' }
    })
    expect(res.statusCode).toBe(400)
    expect(res.payload).toContain('Complete the contact address')
  })

  it('POST with a bad sub-field re-renders 400 preserving every typed sub-field (composite input preserved)', async () => {
    // Regression against the 2nd-code-review finding #8: pre-fix,
    // any POST error re-render read the STORED state and wiped every
    // sub-field the user had just typed. Fix in build-field-descriptors
    // pulls the value from result.values (submittedValues) instead.
    // See lib/build-field-descriptors.js.
    const jar = makeCookieJar()
    await setUpCommercial(jar)
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/transporter-details',
      payload: {
        commercialTransporter__name: 'ACME',
        commercialTransporter__transporterAuthorisationNumber:
          'UK/AUTH/2026/001',
        commercialTransporter__addressLine1: 'Farm Lane',
        commercialTransporter__town: 'Exeter',
        commercialTransporter__postcode: 'EX1 1AA',
        commercialTransporter__country: 'GB',
        commercialTransporter__telephone: '+44 1234 567890',
        // Bad email — no `@` — will fire addressSubFieldEmailFormat.
        commercialTransporter__email: 'not-an-email'
      }
    })
    expect(res.statusCode).toBe(400)
    // Each govukInput renders `value="..."` — verify every typed
    // sub-field is preserved verbatim.
    expect(res.payload).toContain('value="ACME"')
    expect(res.payload).toContain('value="UK/AUTH/2026/001"')
    expect(res.payload).toContain('value="Farm Lane"')
    expect(res.payload).toContain('value="Exeter"')
    expect(res.payload).toContain('value="EX1 1AA"')
    expect(res.payload).toContain('value="+44 1234 567890"')
    expect(res.payload).toContain('value="not-an-email"')
    // Country is a govukSelect — GB shows as `selected`.
    expect(res.payload).toMatch(/value="GB"[^>]*selected/)
  })

  it('POST with all sub-fields filled redirects to the next page', async () => {
    const jar = makeCookieJar()
    await setUpCommercial(jar)
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/transporter-details',
      payload: {
        commercialTransporter__name: 'ACME',
        commercialTransporter__transporterAuthorisationNumber:
          'UK/AUTH/2026/001',
        commercialTransporter__addressLine1: 'Farm Lane',
        commercialTransporter__town: 'Exeter',
        commercialTransporter__postcode: 'EX1 1AA',
        commercialTransporter__country: 'GB',
        commercialTransporter__telephone: '+44 1234 567890',
        commercialTransporter__email: 'contact@example.com'
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
        commercialTransporter__transporterAuthorisationNumber:
          'UK/AUTH/2026/001',
        commercialTransporter__addressLine1: 'Farm Lane',
        commercialTransporter__town: 'Exeter',
        commercialTransporter__postcode: 'EX1 1AA',
        commercialTransporter__country: 'GB',
        commercialTransporter__telephone: '+44 1234 567890',
        commercialTransporter__email: 'contact@example.com'
      }
    })
    const cya = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/check-your-answers'
    })
    expect(cya.statusCode).toBe(200)
    // Post step 5e, CYA renders every non-blank V4 sub-field in
    // subFields order — including the transporter authorisation
    // number and the resolved country label ("United Kingdom" not
    // "GB"). Optional blank sub-fields (addressLine2 / county) are
    // skipped.
    expect(cya.payload).toContain(
      'ACME, UK/AUTH/2026/001, Farm Lane, Exeter, EX1 1AA, United Kingdom, +44 1234 567890, contact@example.com'
    )
  })

  it('M-to-submit address (placeOfOrigin): blank POST redirects on; partial fill surfaces a CYA completeness prompt', async () => {
    // V4 spec: placeOfOrigin is "Mandatory to submit" — the page
    // saves blank (no page-level block), and completeness comes
    // from CYA. This differs from commercialTransporter /
    // privateTransporter / contactAddress, which are "Mandatory to
    // proceed" (contract.js gate rejects both blank AND partial
    // submissions with the required message).
    const jar = makeCookieJar()
    // Blank POST → 302 (M-to-submit, no page block).
    const blank = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/place-of-origin',
      payload: {}
    })
    expect(blank.statusCode).toBe(302)
    // Now fill only the name — a partial address.
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/place-of-origin',
      payload: {
        placeOfOrigin__name: 'Farm 42'
      }
    })
    // CYA surfaces the completeness prompt with a Change link back.
    const cya = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/check-your-answers'
    })
    expect(cya.payload).toContain('Complete the Place of origin address')
    expect(cya.payload).toContain(
      'href="/prototype/eudpa-249/pages/place-of-origin"'
    )
  })

  it('partial address keeps the containing subsection In progress on the task list', async () => {
    // Two regressions:
    // 1. Previously a partial address (name only) was treated as
    //    fulfilled because `isBlankValue` was false. That marked the
    //    subsection as Completed and /start skipped past the address
    //    page. Fixed by `hasFulfilment` consulting
    //    `domainEntry.isComplete(value)` for addresses — a partial
    //    address is unfulfilled.
    // 2. User-reported: after (1), a partial address then made the
    //    subsection read "Not started" because the classifier's
    //    NS-vs-IP check also went via `hasFulfilment` (partial ⇒
    //    unfulfilled ⇒ counted as "nothing filled" ⇒ NS). The user
    //    HAD typed something, so it should read In progress.
    //    Fixed by introducing `hasAnyInput` in engine/index.js that
    //    the classifier uses for the NS-vs-IP branch, while
    //    `hasFulfilment` still drives the F check.
    const jar = makeCookieJar()
    // Fill only one field on the address.
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/place-of-origin',
      payload: { placeOfOrigin__addressLine1: '1 Farm Lane' }
    })
    // Task list: the subsection must be In progress — not Not started
    // (user did type something) and not Completed (address incomplete).
    const tasks = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/task-list'
    })
    expect(tasks.payload).toContain('Place of origin and consignor')
    expect(tasks.payload).toMatch(
      /Place of origin and consignor[\s\S]{0,400}In progress/
    )
    expect(tasks.payload).not.toMatch(
      /Place of origin and consignor[\s\S]{0,400}Not started/
    )
    expect(tasks.payload).not.toMatch(
      /Place of origin and consignor[\s\S]{0,400}Completed/
    )
    // Filling it fully flips the subsection to Completed.
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/place-of-origin',
      payload: {
        placeOfOrigin__name: 'Farm 42',
        placeOfOrigin__addressLine1: '1 Farm Lane',
        placeOfOrigin__town: 'Exeter',
        placeOfOrigin__postcode: 'EX1 1AA',
        placeOfOrigin__country: 'GB',
        placeOfOrigin__telephone: '+44 1234 567890',
        placeOfOrigin__email: 'ops@farm.example'
      }
    })
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/pages/consignor',
      payload: {
        consignor__name: 'Sender',
        consignor__addressLine1: '2 Sender St',
        consignor__town: 'Bristol',
        consignor__postcode: 'BS1 1BB',
        consignor__country: 'GB',
        consignor__telephone: '+44 1234 567890',
        consignor__email: 'ops@sender.example'
      }
    })
    const tasks2 = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/task-list'
    })
    expect(tasks2.payload).toMatch(
      /Place of origin and consignor[\s\S]{0,400}Completed/
    )
  })
})

describe('page-controller — accompanying-documents 0..10 records group', () => {
  // WS4 rework (2026-07-20): `accompanyingDocument` is a records-
  // shape user-driven group. Traders add / delete / fill documents
  // via a summary index (`/accompanying-documents`) with per-doc
  // pages (`/accompanying-documents/{docId}/{page}`). Each of the
  // four per-doc pages is mandatoryToProceed:true so a half-filled
  // document 400s on save. The summary index disables the Add
  // button at the maxEntries cap (10); the invariant is
  // authoritative for after-the-fact defence.
  it('GET /accompanying-documents shows the empty state', async () => {
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/accompanying-documents'
    })
    expect(res.statusCode).toBe(200)
    expect(res.payload).toContain('No accompanying documents added yet.')
    expect(res.payload).toContain('Add an accompanying document')
  })

  it('POST /accompanying-documents/add mints a doc and redirects to the type page', async () => {
    const jar = makeCookieJar()
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/accompanying-documents/add',
      payload: {}
    })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe(
      '/prototype/eudpa-249/accompanying-documents/doc1/accompanying-document-type'
    )
  })

  it('per-doc page-save 400s on blank required input (mandatoryToProceed)', async () => {
    const jar = makeCookieJar()
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/accompanying-documents/add',
      payload: {}
    })
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/accompanying-documents/doc1/accompanying-document-type',
      payload: {}
    })
    expect(res.statusCode).toBe(400)
    expect(res.payload).toContain('Choose the document type')
  })

  it('per-doc page-save 302s with a filled value + redirects to the next per-doc page', async () => {
    const jar = makeCookieJar()
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/accompanying-documents/add',
      payload: {}
    })
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/accompanying-documents/doc1/accompanying-document-type',
      payload: { 'accompanyingDocumentType-doc1': 'health-certificate' }
    })
    expect(res.statusCode).toBe(302)
    // nextAfterForDoc walks unfilled per-doc pages in declared order
    // — the next mandatory-unfilled page in the subsection is
    // accompanying-document-attachment.
    expect(res.headers.location).toBe(
      '/prototype/eudpa-249/accompanying-documents/doc1/accompanying-document-attachment'
    )
  })

  it('POST /accompanying-documents/{id}/delete drops the doc and returns to the summary', async () => {
    const jar = makeCookieJar()
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/accompanying-documents/add',
      payload: {}
    })
    // Fill one field.
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/accompanying-documents/doc1/accompanying-document-type',
      payload: { 'accompanyingDocumentType-doc1': 'health-certificate' }
    })
    // Delete.
    const del = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/accompanying-documents/doc1/delete',
      payload: {}
    })
    expect(del.statusCode).toBe(302)
    expect(del.headers.location).toBe(
      '/prototype/eudpa-249/accompanying-documents'
    )
    // Empty state re-appears.
    const summary = await inject(jar, {
      method: 'GET',
      url: '/prototype/eudpa-249/accompanying-documents'
    })
    expect(summary.payload).toContain('No accompanying documents added yet.')
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

  it('POST with an invalid animal count re-renders 400 preserving the typed number (line-page controller)', async () => {
    // Regression: same as the /pages/ finding but via the line-page
    // controller path — proves the fix applies to /lines/{id}/{page}
    // too. numberOfAnimals enforces integerMin (>=1); a negative
    // fires a domain predicate error → 400 → the input should re-
    // render with the typed value.
    const jar = makeCookieJar()
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/lines/add',
      payload: {}
    })
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/lines/line1/commodity-details',
      payload: { 'commodityCode-line1': '0102' }
    })
    await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/lines/line1/species-details',
      payload: { 'species-line1': ['cattle'] }
    })
    // Negative integer → integerMin fires.
    const res = await inject(jar, {
      method: 'POST',
      url: '/prototype/eudpa-249/lines/line1/number-of-animals',
      payload: { 'numberOfAnimals-line1': '-5' }
    })
    expect(res.statusCode).toBe(400)
    // The govukInput's value attribute carries the typed number.
    expect(res.payload).toContain('value="-5"')
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
