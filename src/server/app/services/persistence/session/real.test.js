import { describe, expect, it } from 'vitest'
import Hapi from '@hapi/hapi'
import yar from '@hapi/yar'
import { session } from './real.js'

const buildServer = async () => {
  const server = Hapi.server()
  await server.register({
    plugin: yar,
    options: {
      storeBlank: false,
      cookieOptions: {
        password: 'the-password-must-be-at-least-32-characters',
        isSecure: false
      }
    }
  })
  server.route([
    {
      method: 'POST',
      path: '/known',
      handler: async (request, h) => {
        await session.addKnownJourney(request, h, request.payload.id)
        return { ok: true }
      }
    },
    {
      method: 'GET',
      path: '/known',
      handler: async (request) => ({
        ids: await session.knownJourneyIds(request)
      })
    },
    {
      method: 'POST',
      path: '/run/{journeyId}',
      handler: async (request, h) => {
        await session.setOpeningRun(
          h,
          request.params.journeyId,
          request.payload.phase
        )
        return { ok: true }
      }
    },
    {
      method: 'GET',
      path: '/run/{journeyId}',
      handler: async (request) => ({
        phase:
          (await session.openingRun(request, request.params.journeyId)) ?? null
      })
    },
    {
      method: 'POST',
      path: '/flow/{journeyId}',
      handler: async (request, h) => {
        await session.setFlowOnlyAnswers(
          h,
          request.params.journeyId,
          request.payload
        )
        return { ok: true }
      }
    },
    {
      method: 'GET',
      path: '/flow/{journeyId}',
      handler: async (request) => ({
        values: await session.flowOnlyAnswers(request, request.params.journeyId)
      })
    },
    {
      method: 'POST',
      path: '/reviewed/{journeyId}',
      handler: async (request, h) => {
        await session.setReviewedToken(
          h,
          request.params.journeyId,
          request.payload.token ?? undefined
        )
        return { ok: true }
      }
    },
    {
      method: 'GET',
      path: '/reviewed/{journeyId}',
      handler: async (request) => ({
        token:
          (await session.reviewedToken(request, request.params.journeyId)) ??
          null
      })
    }
  ])
  return server
}

const cookieOf = (res) => res.headers['set-cookie']?.[0]?.split(';')[0]

describe('#session.knownJourneyIds (real, yar)', () => {
  it('Should accumulate known journeys server-side without duplicates', async () => {
    const server = await buildServer()
    const firstAdd = await server.inject({
      method: 'POST',
      url: '/known',
      payload: { id: 'J-1' }
    })
    const secondAdd = await server.inject({
      method: 'POST',
      url: '/known',
      payload: { id: 'J-2' },
      headers: { cookie: cookieOf(firstAdd) }
    })
    const duplicateAdd = await server.inject({
      method: 'POST',
      url: '/known',
      payload: { id: 'J-1' },
      headers: { cookie: cookieOf(secondAdd) }
    })

    const known = await server.inject({
      method: 'GET',
      url: '/known',
      headers: { cookie: cookieOf(duplicateAdd) ?? cookieOf(secondAdd) }
    })

    expect(known.result.ids).toEqual(['J-1', 'J-2'])
  })

  it('Should report no known journeys for a fresh session', async () => {
    const server = await buildServer()
    const known = await server.inject({ method: 'GET', url: '/known' })
    expect(known.result.ids).toEqual([])
  })
})

describe('#session.reviewedToken (real, yar)', () => {
  const REVIEWED_J1 = '/reviewed/J-1'

  it('Should hold one token per journey, and drop it when cleared', async () => {
    const server = await buildServer()
    const first = await server.inject({
      method: 'POST',
      url: REVIEWED_J1,
      payload: { token: 4 }
    })
    const second = await server.inject({
      method: 'POST',
      url: '/reviewed/J-2',
      payload: { token: 7 },
      headers: { cookie: cookieOf(first) }
    })
    const cleared = await server.inject({
      method: 'POST',
      url: REVIEWED_J1,
      payload: { token: null },
      headers: { cookie: cookieOf(second) }
    })
    const cookie = cookieOf(cleared) ?? cookieOf(second)

    const one = await server.inject({
      method: 'GET',
      url: REVIEWED_J1,
      headers: { cookie }
    })
    const two = await server.inject({
      method: 'GET',
      url: '/reviewed/J-2',
      headers: { cookie }
    })
    expect(one.result.token).toBeNull()
    expect(two.result.token).toBe(7)
  })
})

describe('#session.openingRun (real, yar)', () => {
  it('Should retain journey-keyed phases without leaking across journeys', async () => {
    const server = await buildServer()
    const first = await server.inject({
      method: 'POST',
      url: '/run/J-1',
      payload: { phase: 'active' }
    })
    const second = await server.inject({
      method: 'POST',
      url: '/run/J-2',
      payload: { phase: 'complete' },
      headers: { cookie: cookieOf(first) }
    })
    const getOne = await server.inject({
      method: 'GET',
      url: '/run/J-1',
      headers: { cookie: cookieOf(second) }
    })
    const getTwo = await server.inject({
      method: 'GET',
      url: '/run/J-2',
      headers: { cookie: cookieOf(second) }
    })
    expect(getOne.result.phase).toBe('active')
    expect(getTwo.result.phase).toBe('complete')
  })

  it('Should report no opening run for a fresh session', async () => {
    const server = await buildServer()
    const get = await server.inject({ method: 'GET', url: '/run/J-1' })
    expect(get.result.phase).toBeNull()
  })
})

describe('#session.flowOnlyAnswers (real, yar)', () => {
  it('Should retain journey-keyed values without leaking across journeys', async () => {
    const server = await buildServer()
    const first = await server.inject({
      method: 'POST',
      url: '/flow/J-1',
      payload: { declaration: '' }
    })
    const second = await server.inject({
      method: 'POST',
      url: '/flow/J-2',
      payload: { declaration: 'confirmed' },
      headers: { cookie: cookieOf(first) }
    })
    const cookie = cookieOf(second) ?? cookieOf(first)

    const journey1 = await server.inject({
      method: 'GET',
      url: '/flow/J-1',
      headers: { cookie }
    })
    const journey2 = await server.inject({
      method: 'GET',
      url: '/flow/J-2',
      headers: { cookie }
    })
    const unknown = await server.inject({
      method: 'GET',
      url: '/flow/J-3',
      headers: { cookie }
    })

    expect(journey1.result.values).toEqual({ declaration: '' })
    expect(journey2.result.values).toEqual({ declaration: 'confirmed' })
    expect(unknown.result.values).toEqual({})
  })
})
