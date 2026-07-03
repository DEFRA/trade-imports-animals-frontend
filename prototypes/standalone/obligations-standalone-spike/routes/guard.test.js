import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  BASE,
  FLOW_ID,
  JOURNEY_COOKIE,
  registerJourneyCookie
} from '../journey/index.js'
import { journeyRepository } from '../store/index.js'
import { withGuard } from './guard.js'

/**
 * The graft-11 pre-handler, exercised over stub routes so the guard's
 * routing decisions are pinned independently of rendering. These are the
 * shared-spec sentinels for Step 11.6: the same browser-visible moves
 * the post-submit-freeze spec asserts live, runnable in CI on every
 * push once withGuard is wired into routes.js.
 */

const CYA = `${BASE}/check-your-answers`

const stub = (surface, pageId = null) => ({
  auth: false,
  app: { surface, pageId }
})
const ok = (name) => (_request, responseToolkit) =>
  responseToolkit.response(`ok:${name}`)

let server
beforeAll(async () => {
  server = Hapi.server()
  registerJourneyCookie(server)
  server.route(
    [
      {
        method: 'GET',
        path: BASE,
        options: stub('start'),
        handler: ok('start')
      },
      {
        method: 'GET',
        path: `${BASE}/hub`,
        options: stub('hub'),
        handler: ok('hub')
      },
      {
        method: 'GET',
        path: `${BASE}/about-you`,
        options: stub('page', 'about-you'),
        handler: ok('page')
      },
      {
        method: 'POST',
        path: `${BASE}/about-you`,
        options: stub('page', 'about-you'),
        handler: ok('page-post')
      },
      {
        method: 'GET',
        path: `${BASE}/claims`,
        options: stub('page', 'claims'),
        handler: ok('claims')
      },
      {
        method: 'GET',
        path: CYA,
        options: stub('check-your-answers'),
        handler: ok('cya')
      },
      {
        method: 'POST',
        path: CYA,
        options: stub('check-your-answers'),
        handler: ok('cya-post')
      },
      {
        method: 'GET',
        path: `${BASE}/confirmation`,
        options: stub('confirmation'),
        handler: ok('confirmation')
      }
    ].map(withGuard)
  )
  await server.initialize()
})
afterAll(() => server.stop())

const asJourney = (journeyId) => ({
  headers: { cookie: `${JOURNEY_COOKIE}=${journeyId}` }
})

const inProgressJourney = () => journeyRepository.create(FLOW_ID)

const submittedJourney = () => {
  const journey = journeyRepository.create(FLOW_ID)
  journeyRepository.submit(journey.journeyId)
  return journey
}

describe('routes/guard — pre-submit, everything open (Rulings item 2)', () => {
  it.each([
    ['GET', BASE],
    ['GET', `${BASE}/hub`],
    ['GET', `${BASE}/about-you`],
    ['GET', CYA]
  ])('%s %s passes through', async (method, url) => {
    const { journeyId } = inProgressJourney()
    const response = await server.inject({
      method,
      url,
      ...asJourney(journeyId)
    })
    expect(response.statusCode).toBe(200)
    expect(response.payload).toMatch(/^ok:/)
  })

  it('gates confirmation back to the start page', async () => {
    const { journeyId } = inProgressJourney()
    const response = await server.inject({
      method: 'GET',
      url: `${BASE}/confirmation`,
      ...asJourney(journeyId)
    })
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(BASE)
  })

  it('redirects a Not Applicable deep link to its section entry', async () => {
    const { journeyId } = inProgressJourney()
    const response = await server.inject({
      method: 'GET',
      url: `${BASE}/claims`,
      ...asJourney(journeyId)
    })
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(`${BASE}/driving-history`)
  })
})

describe('routes/guard — the post-submit freeze (Rulings item 1)', () => {
  it.each([
    ['GET', `${BASE}/hub`],
    ['GET', `${BASE}/about-you`],
    ['POST', `${BASE}/about-you`],
    ['POST', CYA]
  ])('%s %s resolves to read-only CYA', async (method, url) => {
    const { journeyId } = submittedJourney()
    const response = await server.inject({
      method,
      url,
      ...asJourney(journeyId)
    })
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(CYA)
  })

  it.each([
    [`the read-only CYA GET`, CYA, 'ok:cya'],
    [`the confirmation GET`, `${BASE}/confirmation`, 'ok:confirmation']
  ])('%s survives', async (_name, url, body) => {
    const { journeyId } = submittedJourney()
    const response = await server.inject({
      method: 'GET',
      url,
      ...asJourney(journeyId)
    })
    expect(response.statusCode).toBe(200)
    expect(response.payload).toBe(body)
  })

  it('keeps the start page open so a new journey can begin', async () => {
    const { journeyId } = submittedJourney()
    const response = await server.inject({
      method: 'GET',
      url: BASE,
      ...asJourney(journeyId)
    })
    expect(response.payload).toBe('ok:start')
  })
})

describe('routes/guard — withGuard mechanics', () => {
  it('passes surface-less routes (the model endpoints) through untouched', () => {
    const route = {
      method: 'GET',
      path: `${BASE}/model/flow.json`,
      options: { auth: false },
      handler: ok('model')
    }
    expect(withGuard(route)).toBe(route)
  })

  it('prepends the guard pre-handler, preserving existing pres', () => {
    const existing = { method: () => 'kept' }
    const guarded = withGuard({
      method: 'GET',
      path: `${BASE}/hub`,
      options: { auth: false, app: { surface: 'hub' }, pre: [existing] },
      handler: ok('hub')
    })
    expect(guarded.options.pre).toHaveLength(2)
    expect(guarded.options.pre[1]).toBe(existing)
  })
})
