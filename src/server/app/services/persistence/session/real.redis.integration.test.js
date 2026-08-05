import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import Hapi from '@hapi/hapi'
import yar from '@hapi/yar'
import { Engine as CatboxRedis } from '@hapi/catbox-redis'
import { Redis } from 'ioredis'
import { GenericContainer } from 'testcontainers'
import { session } from './real.js'
import { runsIt } from '../it-mode.js'

let container
let client

const REDIS_PORT = 6379
const CONTAINER_START_TIMEOUT_MS = 120_000

const buildServer = async () => {
  const server = Hapi.server({
    cache: [
      {
        name: 'session',
        engine: new CatboxRedis({ client, partition: 'session' })
      }
    ]
  })
  await server.register({
    plugin: yar,
    options: {
      storeBlank: false,
      maxCookieSize: 0,
      cache: { cache: 'session', expiresIn: 60000 },
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
    }
  ])
  await server.initialize()
  return server
}

const cookieOf = (res) => res.headers['set-cookie']?.[0]?.split(';')[0]

describe.skipIf(!runsIt('testcontainer'))('#session (real, Redis)', () => {
  beforeAll(async () => {
    container = await new GenericContainer('redis:7.2.3-alpine3.18')
      .withExposedPorts(REDIS_PORT)
      .start()
    client = new Redis({
      host: container.getHost(),
      port: container.getMappedPort(REDIS_PORT),
      maxRetriesPerRequest: null
    })
    await client.ping()
  }, CONTAINER_START_TIMEOUT_MS)

  afterAll(async () => {
    await client.quit()
    await container.stop()
  })

  it('Should round-trip known journeys over Redis', async () => {
    const server = await buildServer()
    const set = await server.inject({
      method: 'POST',
      url: '/known',
      payload: { id: 'J-1' }
    })
    const get = await server.inject({
      method: 'GET',
      url: '/known',
      headers: { cookie: cookieOf(set) }
    })
    expect(get.result.ids).toEqual(['J-1'])
  })

  it('Should return an empty known list for a fresh session', async () => {
    const server = await buildServer()
    const get = await server.inject({ method: 'GET', url: '/known' })
    expect(get.result.ids).toEqual([])
  })

  it('Should write the session server-side into Redis', async () => {
    const server = await buildServer()
    await server.inject({
      method: 'POST',
      url: '/known',
      payload: { id: 'J-1' }
    })
    expect(await client.dbsize()).toBeGreaterThan(0)
  })
})
