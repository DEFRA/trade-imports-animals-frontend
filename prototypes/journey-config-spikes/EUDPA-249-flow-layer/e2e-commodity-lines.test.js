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
    // line2's DATA is unchanged.
    expect(list.payload).toContain('Pig (0103)')
    // …but its display LABEL renumbers to "Commodity line 1" because
    // the display uses the 1-based ordinal in the current list, not
    // the internal line id (which is still `line2`). Same fix pattern
    // as commit 55e5124 for units. URLs stay on the internal id.
    expect(list.payload).toContain('Commodity line 1')
    expect(list.payload).not.toContain('Commodity line 2')
    expect(list.payload).toContain(`${BASE}/lines/line2/commodity-details`)
  })

  it('deletes ALL line-scoped leaves — a fully-filled line disappears cleanly after Delete', async () => {
    // Regression: LINE_LEAF_OBLIGATIONS used to be a hand-maintained
    // list; iteration 6 (commodityType) forgot to add itself, so Delete
    // left commodityType.line1 behind. The evaluator then still saw a
    // record for line1 via that leaf, so the line stubbornly reappeared
    // in the summary and the commodity-lines subsections stayed
    // Completed. Fix: derive the list from `within === commodityLine`.
    const jar = makeCookieJar()
    await addLine(jar)
    // Fill every line-scoped mandatory in the current flow.
    await fillLinePage(jar, 'line1', 'commodity-details', {
      'commodityCode-line1': '0102'
    })
    await fillLinePage(jar, 'line1', 'commodity-type', {
      'commodityType-line1': 'meat-producing'
    })
    await fillLinePage(jar, 'line1', 'species-details', {
      'species-line1': ['cattle']
    })
    await fillLinePage(jar, 'line1', 'number-of-animals', {
      'numberOfAnimals-line1': 25
    })

    // Delete the line.
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/line1/delete`,
      payload: {}
    })

    // /lines shows the empty state — no lingering summary block.
    const list = await getLines(jar)
    expect(list.payload).toContain('No commodity lines added yet.')
    expect(list.payload).not.toContain('Commodity line 1')
    expect(list.payload).not.toContain('Cattle (0102)')

    // Task list: commodity-lines subsections roll back — no longer Completed.
    // (Add commodity lines returns to Not started; Commodity line details
    // returns to Not applicable because no lines exist.)
    const taskList = await inject(jar, {
      method: 'GET',
      url: `${BASE}/task-list`
    })
    expect(taskList.payload).toMatch(
      /Add commodity lines[\s\S]{0,400}Not started/
    )
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
    await fillLinePage(jar, 'line1', 'commodity-type', {
      'commodityType-line1': 'meat-producing'
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

  it('renders a blank cell as the notFilled placeholder for a multi-select that was saved empty', async () => {
    // Regression: labelFor previously returned '' for an empty array,
    // and `label ?? t('commodityLines.notFilled')` (nullish coalesce)
    // treated '' as non-nullish → the cell rendered blank instead of
    // the '-' placeholder. Fix: labelFor returns null for empty arrays.
    const jar = makeCookieJar()
    await addLine(jar)
    await fillLinePage(jar, 'line1', 'commodity-details', {
      'commodityCode-line1': '0102'
    })
    // POST species-details with no checkboxes ticked → species stored
    // as [] (coerceValue for checkboxes turns '' into []).
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/line1/species-details`,
      payload: {}
    })

    const list = await getLines(jar)
    // Species row's value is the notFilled placeholder, not an empty
    // cell. Look for it in the row's neighbourhood.
    expect(list.payload).toMatch(/Species[\s\S]{0,400}-/)
  })

  it('per-row Change link uses human-friendly aria-label ("Commodity code for commodity line 1")', async () => {
    // Regression: the visuallyHiddenText used to be a hardcoded English
    // template literal with the raw internal lineId. Fixed to use
    // `commodityLines.changeLinkHidden` via t() with {label, n} params.
    const jar = makeCookieJar()
    await addLine(jar)
    await fillLinePage(jar, 'line1', 'commodity-details', {
      'commodityCode-line1': '0102'
    })

    const list = await getLines(jar)
    expect(list.payload).toContain('Commodity code for commodity line 1')
    // Raw internal id must not leak into the aria-label.
    expect(list.payload).not.toContain('Commodity code for line1')
  })

  it('Delete button aria-label uses the human line number ("Delete commodity line 1")', async () => {
    // Regression: previously interpolated raw {lineId} = 'line1'.
    // Now interpolates lineNumber(lineId) = 1 via {n}.
    const jar = makeCookieJar()
    await addLine(jar)

    const list = await getLines(jar)
    expect(list.payload).toContain('Delete commodity line 1')
    expect(list.payload).not.toContain('Delete line1')
  })

  it('line labels use the ordinal position, not the internal line id (renumbers after Delete)', async () => {
    // Regression: display used to interpolate the internal line id
    // (line1 → "Commodity line 1", line2 → "Commodity line 2"). Line
    // ids are session-monotonic (no recycling — see lib/state.js
    // NEXT_LINE_ID_KEY), so after deleting the first line the
    // surviving line kept id line2 and rendered as "Commodity line 2"
    // even when it was the only line. Fixed to use the 1-based
    // ordinal position in the current /lines list; URLs still key on
    // the internal id so per-line routes stay stable. Same fix pattern
    // as commit 55e5124 applied to units.
    const jar = makeCookieJar()
    const l1 = await addLine(jar)
    await fillLinePage(jar, l1, 'commodity-details', {
      'commodityCode-line1': '0102'
    })
    const l2 = await addLine(jar)
    await fillLinePage(jar, l2, 'commodity-details', {
      'commodityCode-line2': '0103'
    })
    const l3 = await addLine(jar)
    await fillLinePage(jar, l3, 'commodity-details', {
      'commodityCode-line3': '010410'
    })

    // Sanity: three lines, all shown as ordinals 1..3.
    let list = await getLines(jar)
    expect(list.payload).toContain('Commodity line 1')
    expect(list.payload).toContain('Commodity line 2')
    expect(list.payload).toContain('Commodity line 3')

    // Delete the FIRST line (internal id line1).
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/line1/delete`,
      payload: {}
    })
    list = await getLines(jar)
    // Two lines remain (internal ids line2 + line3) but they display
    // as Commodity line 1 + Commodity line 2 — display tracks the
    // ordinal, not the internal id.
    expect(list.payload).toContain('Commodity line 1')
    expect(list.payload).toContain('Commodity line 2')
    expect(list.payload).not.toContain('Commodity line 3')
    // URLs still use the internal ids — routes stay stable.
    expect(list.payload).toContain(`${BASE}/lines/line2/commodity-details`)
    expect(list.payload).toContain(`${BASE}/lines/line3/commodity-details`)
    // Change-link visuallyHiddenText also renumbers.
    expect(list.payload).toContain('Commodity code for commodity line 1')
    expect(list.payload).toContain('Commodity code for commodity line 2')
    // Delete-button aria-label uses ordinals too.
    expect(list.payload).toContain('Delete commodity line 1')
    expect(list.payload).toContain('Delete commodity line 2')
    expect(list.payload).not.toContain('Delete commodity line 3')
  })

  it('units page inherits the parent line ordinal (renumbers with the line list)', async () => {
    // The units index page interpolates `{lineN}` in its heading /
    // breadcrumb / summary blocks. Before the fix this used the
    // internal id parsed from the URL segment, so navigating to
    // /lines/line2/units after a delete would render "Animals on
    // commodity line 2" even when line2 was the only remaining
    // commodity line. Fixed to derive the parent line's ordinal
    // from state at request time via lineDisplayIndex.
    const jar = makeCookieJar()
    const l1 = await addLine(jar)
    await fillLinePage(jar, l1, 'commodity-details', {
      'commodityCode-line1': '0102'
    })
    const l2 = await addLine(jar)
    await fillLinePage(jar, l2, 'commodity-details', {
      'commodityCode-line2': '01061900'
    })
    // Delete line1 so l2 becomes the sole survivor.
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/line1/delete`,
      payload: {}
    })
    // Manage animals on line2 (which is now the 1st line for the
    // user).
    const units = await inject(jar, {
      method: 'GET',
      url: `${BASE}/lines/line2/units`
    })
    expect(units.statusCode).toBe(200)
    // Heading uses the ordinal position (1), not the internal id (2).
    expect(units.payload).toContain('Animals on commodity line 1')
    expect(units.payload).not.toContain('Animals on commodity line 2')
  })

  it('per-line summary includes a Commodity type row after the user picks a type', async () => {
    // Regression: LINE_PAGES used to be a hand-maintained list and
    // iteration 6 (commodityType) forgot to extend it, so /lines
    // silently omitted the Commodity type row even after the user set
    // a value. LINE_PAGES is now derived from the flow's
    // commodity-lines-details subsection.
    const jar = makeCookieJar()
    await addLine(jar)
    await fillLinePage(jar, 'line1', 'commodity-details', {
      'commodityCode-line1': '0102'
    })
    await fillLinePage(jar, 'line1', 'commodity-type', {
      'commodityType-line1': 'meat-producing'
    })

    const list = await getLines(jar)
    // Row title (the presentation.commodityType.pageTitle key) appears.
    expect(list.payload).toContain('Commodity type')
    // Value resolves via the domain labels map through t().
    expect(list.payload).toContain('Meat-producing')
    // Change link for the row goes to the per-line commodity-type page.
    expect(list.payload).toContain(`${BASE}/lines/line1/commodity-type`)
  })
})

describe('commodity-lines — line-scoped controller guards', () => {
  it('GET /lines/{id}/number-of-packages redirects to /lines when the line has a non-whitelisted commodity code', async () => {
    // Regression: previously rendered an empty form (no fields, just a
    // Save button). Fixed to redirect to /lines when the target
    // obligation is out of scope for that line.
    const jar = makeCookieJar()
    await addLine(jar)
    await fillLinePage(jar, 'line1', 'commodity-details', {
      'commodityCode-line1': '0103' // Pig — NOT on PACKAGE_COUNT_COMMODITIES
    })
    const res = await inject(jar, {
      method: 'GET',
      url: `${BASE}/lines/line1/number-of-packages`
    })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe(`${BASE}/lines`)
  })

  it('POST /lines/{id}/number-of-packages redirects to /lines when the line is out of scope', async () => {
    const jar = makeCookieJar()
    await addLine(jar)
    await fillLinePage(jar, 'line1', 'commodity-details', {
      'commodityCode-line1': '0103'
    })
    const res = await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/line1/number-of-packages`,
      payload: { 'numberOfPackages-line1': 5 }
    })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe(`${BASE}/lines`)
  })
})

describe('commodity-lines — id stability under delete/add', () => {
  it('newLineId is monotonic — a second Add after Delete does not recycle line1', async () => {
    // Regression: previous newLineId picked the lowest free slot; a
    // Delete-then-Add cycle would reuse 'line1', silently rehydrating
    // any per-line state whose obligation was missing from
    // LINE_LEAF_OBLIGATIONS. Fixed to always pick highest-seen + 1.
    const jar = makeCookieJar()
    const l1 = await addLine(jar)
    expect(l1).toBe('line1')
    await fillLinePage(jar, l1, 'commodity-details', {
      'commodityCode-line1': '0102'
    })
    // Delete line1.
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/line1/delete`,
      payload: {}
    })
    // Add another line — should NOT be 'line1' again.
    const l2 = await addLine(jar)
    expect(l2).not.toBe('line1')
    expect(l2).toBe('line2')
  })
})

describe('commodity-lines — CYA change link + prompt', () => {
  it('CYA Change link for a line-scoped obligation resolves to /lines/{id}/{page} (not /pages/{page})', async () => {
    // Regression: CYA previously built href as /pages/{page} unconditionally.
    // For presentsForEach pages the flow-major URLs no longer exist; the
    // Change link would 404. Fixed: hrefForChange picks
    // /lines/{lineId}/{page} when the change page has presentsForEach.
    const jar = makeCookieJar()
    await addLine(jar)
    await fillLinePage(jar, 'line1', 'commodity-details', {
      'commodityCode-line1': '0102'
    })
    const cya = await inject(jar, {
      method: 'GET',
      url: `${BASE}/check-your-answers`
    })
    expect(cya.statusCode).toBe(200)
    // The row's Change link points at the per-line URL.
    expect(cya.payload).toContain(`${BASE}/lines/line1/commodity-details`)
    // And the flow-major URL is NOT emitted for that obligation.
    expect(cya.payload).not.toContain(`${BASE}/pages/commodity-details`)
  })

  it('CYA renders one row per line for a line-scoped obligation (multi-line case)', async () => {
    const jar = makeCookieJar()
    // Two lines.
    const l1 = await addLine(jar)
    await fillLinePage(jar, l1, 'commodity-details', {
      'commodityCode-line1': '0102'
    })
    const l2 = await addLine(jar)
    await fillLinePage(jar, l2, 'commodity-details', {
      'commodityCode-line2': '0103'
    })
    const cya = await inject(jar, {
      method: 'GET',
      url: `${BASE}/check-your-answers`
    })
    // One row per line, each with its own value and its own Change URL.
    expect(cya.payload).toContain('Cattle (0102)')
    expect(cya.payload).toContain('Pig (0103)')
    expect(cya.payload).toContain(`${BASE}/lines/line1/commodity-details`)
    expect(cya.payload).toContain(`${BASE}/lines/line2/commodity-details`)
    // Line numbers appear in the row keys.
    expect(cya.payload).toMatch(/Commodity code[\s\S]{0,400}commodity line 1/)
    expect(cya.payload).toMatch(/Commodity code[\s\S]{0,400}commodity line 2/)
  })

  it('does NOT emit a spurious row for a line-scoped mandatory that has only the addCommodityLine seed placeholder', async () => {
    // Regression: previously, `POST /lines/add` seeded
    // commodityCode.line1 = ''. CYA's emptiness check treated the
    // wrapping object `{line1: ''}` as non-empty and rendered
    // 'line1: ' as a Change-link row (and suppressed the still-needed
    // prompt because stored was truthy). Fix: unpack per-record, check
    // each leaf independently.
    const jar = makeCookieJar()
    await addLine(jar) // mints line1, seeds commodityCode.line1 = ''
    const cya = await inject(jar, {
      method: 'GET',
      url: `${BASE}/check-your-answers`
    })
    expect(cya.statusCode).toBe(200)
    // No 'line1: ' row for commodityCode (the row would appear only if
    // the leaf were filled).
    expect(cya.payload).not.toMatch(/Commodity code[\s\S]{0,60}line1:/)
    // The still-needed prompt SHOULD fire for line1's commodityCode
    // (it's mandatory + blank + has a Change URL).
    expect(cya.payload).toContain('You still need to complete some sections')
    expect(cya.payload).toContain('Commodity code')
  })

  it('CYA resolves labels correctly for a per-line multi-select (e.g. species with two selections)', async () => {
    // Regression: previously, formatValue's typeof===object branch
    // called label(v) where v was an array; `labels?.[[a,b]]` coerced
    // the array to a comma string and never matched. The row rendered
    // as raw codes ('cattle,buffalo') instead of 'Cattle, Buffalo'.
    // Fix: unpack per-record; formatSingle handles arrays correctly.
    const jar = makeCookieJar()
    await addLine(jar)
    await fillLinePage(jar, 'line1', 'commodity-details', {
      'commodityCode-line1': '0102'
    })
    // Pick two species — cattle + buffalo (both in the 0102 list).
    await fillLinePage(jar, 'line1', 'species-details', {
      'species-line1': ['cattle', 'buffalo']
    })
    const cya = await inject(jar, {
      method: 'GET',
      url: `${BASE}/check-your-answers`
    })
    expect(cya.payload).toContain('Cattle, Buffalo')
    // Raw codes must NOT leak.
    expect(cya.payload).not.toContain('cattle,buffalo')
  })
})

describe('commodity-lines — /start integration', () => {
  it('GET /start redirects to /lines (not /pages/{name}) when the first unfulfilled page is presentsForEach', async () => {
    // Regression: /start unconditionally redirected to /pages/{first.page}.
    // For presentsForEach pages there's no /pages/{name} route → 404.
    // Fixed: if first.page has presentsForEach, redirect to /lines.
    const jar = makeCookieJar()
    // Fill all static sections so /start would land on the first
    // commodity-line page.
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/pages/country-of-origin`,
      payload: { countryOfOrigin: 'FR' }
    })
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/pages/region-code-requirement`,
      payload: { regionCodeRequirement: 'no' }
    })
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/pages/reason-for-import`,
      payload: { reasonForImport: 'transit-through-eu' }
    })
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/pages/transporter-type`,
      payload: { transporterType: 'commercial' }
    })
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/pages/transporter-details`,
      payload: {
        commercialTransporter__name: 'ACME',
        commercialTransporter__addressLine1: 'Farm Lane',
        commercialTransporter__town: 'Exeter',
        commercialTransporter__postcode: 'EX1 1AA'
      }
    })
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/pages/means-of-transport`,
      payload: { meansOfTransport: 'road-vehicle' }
    })
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/pages/transport-identification`,
      payload: {
        transportIdentification: 'REG-1',
        transportDocumentReference: 'DOC-1'
      }
    })
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/pages/arrival-details`,
      payload: {
        arrivalDateAtPort: '12/12/2026',
        portOfEntry: 'DVR'
      }
    })
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/pages/contains-unweaned-animals`,
      payload: { containsUnweanedAnimals: 'no' }
    })
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/pages/animals-certified-for`,
      payload: { animalsCertifiedFor: 'bovine' }
    })
    // Trader details section — 5 address blocks + contact address.
    // All mandatory, all need to be filled for /start to skip forward
    // to the commodity-lines section.
    const address = (prefix) => ({
      [`${prefix}__name`]: 'X',
      [`${prefix}__addressLine1`]: 'X',
      [`${prefix}__town`]: 'X',
      [`${prefix}__postcode`]: 'X'
    })
    for (const [page, prefix] of [
      ['place-of-origin', 'placeOfOrigin'],
      ['consignor', 'consignor'],
      ['consignee', 'consignee'],
      ['importer', 'importer'],
      ['place-of-destination', 'placeOfDestination'],
      ['contact-address', 'contactAddress']
    ]) {
      await inject(jar, {
        method: 'POST',
        url: `${BASE}/pages/${page}`,
        payload: address(prefix)
      })
    }
    // Add a commodity line — its commodity-details page is now the
    // next unfulfilled thing.
    await addLine(jar)
    // /start should route to /lines (not /pages/commodity-details).
    const res = await inject(jar, {
      method: 'GET',
      url: `${BASE}/start`
    })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe(`${BASE}/lines`)
  })
})
