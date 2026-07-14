import { describe, expect, it } from 'vitest'
import Hapi from '@hapi/hapi'
import yar from '@hapi/yar'
import { session } from './real.js'
import { STUB_USER } from '../../../engine/persistence/session.js'

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
      path: '/active',
      handler: async (request, h) => {
        await session.setActiveJourney(h, request.payload.id)
        return { ok: true }
      }
    },
    {
      method: 'GET',
      path: '/active',
      handler: async (request) => ({
        id: (await session.activeJourneyId(request)) ?? null
      })
    },
    {
      method: 'GET',
      path: '/clear',
      handler: async (request, h) => {
        await session.clearActive(h)
        return { id: (await session.activeJourneyId(request)) ?? null }
      }
    },
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
    }
  ])
  return server
}

const cookieOf = (res) => res.headers['set-cookie']?.[0]?.split(';')[0]

describe('real session adapter over yar/Catbox-memory', () => {
  it('Should round-trip the active-journey pointer through server-side yar', async () => {
    const server = await buildServer()
    const set = await server.inject({
      method: 'POST',
      url: '/active',
      payload: { id: 'J-1' }
    })
    const cookie = cookieOf(set)
    const get = await server.inject({
      method: 'GET',
      url: '/active',
      headers: { cookie }
    })
    expect(get.result.id).toBe('J-1')
  })

  it('Should return undefined for a fresh session with no active journey', async () => {
    const server = await buildServer()
    const get = await server.inject({ method: 'GET', url: '/active' })
    expect(get.result.id).toBe(null)
  })

  it('Should keep two parallel session contexts isolated by session id', async () => {
    const server = await buildServer()
    const cookieA = cookieOf(
      await server.inject({
        method: 'POST',
        url: '/active',
        payload: { id: 'J-A' }
      })
    )
    const cookieB = cookieOf(
      await server.inject({
        method: 'POST',
        url: '/active',
        payload: { id: 'J-B' }
      })
    )
    const getA = await server.inject({
      method: 'GET',
      url: '/active',
      headers: { cookie: cookieA }
    })
    const getB = await server.inject({
      method: 'GET',
      url: '/active',
      headers: { cookie: cookieB }
    })
    expect(getA.result.id).toBe('J-A')
    expect(getB.result.id).toBe('J-B')
  })

  it('Should clear the active-journey pointer', async () => {
    const server = await buildServer()
    const cookie = cookieOf(
      await server.inject({
        method: 'POST',
        url: '/active',
        payload: { id: 'J-1' }
      })
    )
    const cleared = await server.inject({
      method: 'GET',
      url: '/clear',
      headers: { cookie }
    })
    expect(cleared.result.id).toBe(null)
  })
})

describe('real session adapter known journeys over yar', () => {
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

describe('real session adapter userId', () => {
  it('Should read the authenticated OIDC sub when present', async () => {
    expect(
      await session.userId({ auth: { credentials: { sub: 'user-99' } } })
    ).toBe('user-99')
  })

  it('Should fall back to the stub user until real auth is wired', async () => {
    expect(await session.userId({})).toBe(STUB_USER)
  })
})
