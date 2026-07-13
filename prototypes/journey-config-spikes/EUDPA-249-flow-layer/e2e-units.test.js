/**
 * E2E tests for the depth-2 per-unit UX — dedicated to the surface
 * introduced by iteration 9 (`lib/unit-page-controller.js`,
 * `/lines/{lineId}/units/{unitId}/{page}` routing, `features/units/`
 * list template with per-unit summary blocks + Delete forms, and the
 * "Manage animals" link that appears on line summaries when the
 * line's commodity code opens a wired unit-scoped obligation).
 *
 * Positioned as a sibling of `e2e-commodity-lines.test.js`. The two
 * happy-path walks in `e2e-walk.test.js` cover the flow-level
 * navigation; this file covers the units surface specifically: add,
 * fill, list, delete, per-line conditional visibility.
 *
 * `makeServer` + cookie-jar boilerplate duplicated from
 * `e2e-commodity-lines.test.js`. Extraction to a shared helper is a
 * follow-up.
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

/** Add a commodity line with the given code and species — the minimum
 *  needed to open a per-unit obligation. Returns the new lineId. */
async function addLineWithCode(jar, code, species) {
  const addRes = await inject(jar, {
    method: 'POST',
    url: `${BASE}/lines/add`,
    payload: {}
  })
  expect(addRes.statusCode).toBe(302)
  const match = /\/lines\/(line\d+)\/commodity-details$/.exec(
    addRes.headers.location
  )
  expect(match).toBeTruthy()
  const lineId = match[1]
  await inject(jar, {
    method: 'POST',
    url: `${BASE}/lines/${lineId}/commodity-details`,
    payload: { [`commodityCode-${lineId}`]: code }
  })
  if (species) {
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/${lineId}/species-details`,
      payload: { [`species-${lineId}`]: species }
    })
  }
  return lineId
}

describe('units — line-with-unit-obligations shows Manage animals link', () => {
  it('adds a line with commodity code 01061900 and shows a Manage animals link on /lines', async () => {
    const jar = makeCookieJar()
    const lineId = await addLineWithCode(jar, '01061900')
    const list = await inject(jar, { method: 'GET', url: `${BASE}/lines` })
    expect(list.statusCode).toBe(200)
    expect(list.payload).toContain('Manage animals on this line')
    expect(list.payload).toContain(`${BASE}/lines/${lineId}/units`)
  })

  it('shows the link on a cattle line (allowListed passport/tattoo/earTag)', async () => {
    // Iteration 10 wired passport, tattoo, earTag — cattle (0102) is
    // on all three whitelists. The link now appears on every line
    // whose commodity code opens ANY wired unit obligation.
    const jar = makeCookieJar()
    const lineId = await addLineWithCode(jar, '0102')
    const list = await inject(jar, { method: 'GET', url: `${BASE}/lines` })
    expect(list.payload).toContain('Manage animals on this line')
    expect(list.payload).toContain(`${BASE}/lines/${lineId}/units`)
  })

  it('shows the link on a birds-of-prey line (allowListedByPredicate identificationDetails)', async () => {
    // Iteration 10 also wired identificationDetails + description via
    // the inverse-gate predicate — they apply to codes NOT on any
    // specific-identifier whitelist. Birds of prey (01063100) is
    // such a code, so the link appears via the predicate branch.
    const jar = makeCookieJar()
    const lineId = await addLineWithCode(jar, '01063100')
    const list = await inject(jar, { method: 'GET', url: `${BASE}/lines` })
    expect(list.payload).toContain('Manage animals on this line')
    expect(list.payload).toContain(`${BASE}/lines/${lineId}/units`)
  })

  it('does NOT show the link on a line with no commodity code set yet', async () => {
    // Before commodityCode is chosen, no unit obligation can be
    // resolved for the line — the metadata check short-circuits on
    // `if (!lineCode) return false`. Every line has some unit
    // obligation in scope AFTER a code is picked (identificationDetails
    // + description is a catch-all via the inverse gate), so this is
    // the only path that hides the link in practice after iter 10.
    const jar = makeCookieJar()
    const addRes = await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/add`,
      payload: {}
    })
    const match = /\/lines\/(line\d+)\/commodity-details$/.exec(
      addRes.headers.location
    )
    const lineId = match[1]
    const list = await inject(jar, { method: 'GET', url: `${BASE}/lines` })
    expect(list.payload).not.toContain(`${BASE}/lines/${lineId}/units`)
    expect(list.payload).not.toContain('Manage animals on this line')
  })
})

describe('units — add / fill / list / delete', () => {
  it('walks the add-then-fill loop end-to-end for one unit', async () => {
    const jar = makeCookieJar()
    const lineId = await addLineWithCode(jar, '01061900')

    // Empty units list first.
    let list = await inject(jar, {
      method: 'GET',
      url: `${BASE}/lines/${lineId}/units`
    })
    expect(list.statusCode).toBe(200)
    expect(list.payload).toContain(
      'No animals added yet for this commodity line.'
    )

    // Add a unit → redirect straight into permanent-address.
    const addRes = await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/${lineId}/units/add`,
      payload: {}
    })
    expect(addRes.statusCode).toBe(302)
    expect(addRes.headers.location).toBe(
      `${BASE}/lines/${lineId}/units/unit1/permanent-address`
    )

    // Fill the address. Field id format: `permanentAddress-line1/unit1__addressLine1`.
    const compositeKey = `${lineId}/unit1`
    const fieldPrefix = `permanentAddress-${compositeKey}`
    const fillRes = await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/${lineId}/units/unit1/permanent-address`,
      payload: {
        [`${fieldPrefix}__name`]: 'Muffin the Ferret',
        [`${fieldPrefix}__addressLine1`]: '12 Cage Lane',
        [`${fieldPrefix}__town`]: 'Reading',
        [`${fieldPrefix}__postcode`]: 'RG1 1AA'
      }
    })
    expect(fillRes.statusCode).toBe(302)
    expect(fillRes.headers.location).toBe(`${BASE}/lines/${lineId}/units`)

    // Units list now shows a summary block for unit1 with the values.
    list = await inject(jar, {
      method: 'GET',
      url: `${BASE}/lines/${lineId}/units`
    })
    expect(list.payload).toContain('Animal 1 on commodity line 1')
    expect(list.payload).toContain('Muffin the Ferret')
    expect(list.payload).toContain('12 Cage Lane')
    // Change link for the row points at the specific per-unit page.
    expect(list.payload).toContain(
      `${BASE}/lines/${lineId}/units/unit1/permanent-address`
    )
    // Delete form for the unit.
    expect(list.payload).toContain(`${BASE}/lines/${lineId}/units/unit1/delete`)
  })

  it('increments per-line unit ids and keeps two units on the same line', async () => {
    const jar = makeCookieJar()
    const lineId = await addLineWithCode(jar, '01061900')
    const add1 = await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/${lineId}/units/add`,
      payload: {}
    })
    expect(add1.headers.location).toContain('/units/unit1/permanent-address')
    const add2 = await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/${lineId}/units/add`,
      payload: {}
    })
    expect(add2.headers.location).toContain('/units/unit2/permanent-address')
    const list = await inject(jar, {
      method: 'GET',
      url: `${BASE}/lines/${lineId}/units`
    })
    expect(list.payload).toContain('Animal 1 on commodity line 1')
    expect(list.payload).toContain('Animal 2 on commodity line 1')
  })

  it('unit labels use the ordinal position, not the internal unit id (renumbers after Delete)', async () => {
    // Regression: display used to interpolate the internal unit id
    // (unit1, unit2, ...). Because ids are session-monotonic (no
    // recycling by design), after deleting the first unit the
    // surviving units keep ids unit2 + unit3 and rendered as "Animal
    // 2" + "Animal 3" — jarring when the user's mental model is
    // "1st and 2nd animal". Fixed: the label uses the 1-based
    // ordinal position in the current list. The URLs stay keyed by
    // the internal id so per-unit routes remain stable.
    const jar = makeCookieJar()
    const lineId = await addLineWithCode(jar, '01061900')
    // Add three units.
    for (let i = 0; i < 3; i++) {
      await inject(jar, {
        method: 'POST',
        url: `${BASE}/lines/${lineId}/units/add`,
        payload: {}
      })
    }
    let list = await inject(jar, {
      method: 'GET',
      url: `${BASE}/lines/${lineId}/units`
    })
    // Sanity: three units, all shown.
    expect(list.payload).toContain('Animal 1 on commodity line 1')
    expect(list.payload).toContain('Animal 2 on commodity line 1')
    expect(list.payload).toContain('Animal 3 on commodity line 1')

    // Delete the FIRST unit (internal id unit1).
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/${lineId}/units/unit1/delete`,
      payload: {}
    })
    list = await inject(jar, {
      method: 'GET',
      url: `${BASE}/lines/${lineId}/units`
    })
    // Two units remain (internal ids unit2 + unit3) but they display
    // as Animal 1 + Animal 2 — the display tracks the ordinal
    // position, not the internal id.
    expect(list.payload).toContain('Animal 1 on commodity line 1')
    expect(list.payload).toContain('Animal 2 on commodity line 1')
    expect(list.payload).not.toContain('Animal 3 on commodity line 1')
    // URLs still use the internal ids — routes stay stable.
    expect(list.payload).toContain(
      `${BASE}/lines/${lineId}/units/unit2/permanent-address`
    )
    expect(list.payload).toContain(
      `${BASE}/lines/${lineId}/units/unit3/permanent-address`
    )
  })

  it('deleting a unit removes its summary block and its fulfilments', async () => {
    const jar = makeCookieJar()
    const lineId = await addLineWithCode(jar, '01061900')
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/${lineId}/units/add`,
      payload: {}
    })
    const fieldPrefix = `permanentAddress-${lineId}/unit1`
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/${lineId}/units/unit1/permanent-address`,
      payload: {
        [`${fieldPrefix}__name`]: 'Rover',
        [`${fieldPrefix}__addressLine1`]: '5 Bark Road',
        [`${fieldPrefix}__town`]: 'Slough',
        [`${fieldPrefix}__postcode`]: 'SL1 1BB'
      }
    })

    // Delete
    const delRes = await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/${lineId}/units/unit1/delete`,
      payload: {}
    })
    expect(delRes.statusCode).toBe(302)
    expect(delRes.headers.location).toBe(`${BASE}/lines/${lineId}/units`)

    // Empty state again.
    const list = await inject(jar, {
      method: 'GET',
      url: `${BASE}/lines/${lineId}/units`
    })
    expect(list.payload).toContain(
      'No animals added yet for this commodity line.'
    )
    expect(list.payload).not.toContain('Rover')
  })

  it('deleting a commodity line cascades and purges its unit fulfilments', async () => {
    // Regression for the deleteCommodityLine cascade introduced in
    // Phase A. A prior version of the state helper only purged the
    // line's own leaves; unit fulfilments hanging off the line would
    // survive and quietly rehydrate if the same lineId got reused.
    const jar = makeCookieJar()
    const lineId = await addLineWithCode(jar, '01061900')
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/${lineId}/units/add`,
      payload: {}
    })
    const fieldPrefix = `permanentAddress-${lineId}/unit1`
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/${lineId}/units/unit1/permanent-address`,
      payload: {
        [`${fieldPrefix}__name`]: 'Bin',
        [`${fieldPrefix}__addressLine1`]: '1 Delete Way',
        [`${fieldPrefix}__town`]: 'Nowhere',
        [`${fieldPrefix}__postcode`]: 'ZZ1 1ZZ'
      }
    })
    // Delete the parent commodity line.
    await inject(jar, {
      method: 'POST',
      url: `${BASE}/lines/${lineId}/delete`,
      payload: {}
    })
    // /lines shows empty state.
    const lines = await inject(jar, {
      method: 'GET',
      url: `${BASE}/lines`
    })
    expect(lines.payload).toContain('No commodity lines added yet.')
    expect(lines.payload).not.toContain('Bin')
    expect(lines.payload).not.toContain('1 Delete Way')
  })
})
