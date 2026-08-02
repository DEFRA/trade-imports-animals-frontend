// Gateway boot proof from docs/add-a-set.md step 7.
import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { nunjucksConfig } from '../../config/nunjucks/nunjucks.js'
import { speciesLabel } from './services/persistence/records/notification-mapper/commodity-reference.js'
import { records } from './sets/plant-products/services/records/stub.js'
import { withSetContext } from './shared/set-context.js'
import { plantProducts } from './routes-plant-products.js'

const cookieJar = () => {
  const values = new Map()
  return {
    absorb(response) {
      for (const cookie of response.headers['set-cookie'] ?? []) {
        const [pair] = cookie.split(';')
        const separator = pair.indexOf('=')
        values.set(pair.slice(0, separator), pair.slice(separator + 1))
      }
    },
    header() {
      return [...values.entries()]
        .map(([key, value]) => `${key}=${value}`)
        .join('; ')
    }
  }
}

describe('plant-products gateway boot proof', () => {
  let server

  beforeAll(async () => {
    vi.stubEnv('PLANT_PRODUCTS_MODE', 'stub')
    server = Hapi.server()
    await server.register(nunjucksConfig)
    await server.register(plantProducts, {
      routes: { prefix: '/plant-products' }
    })
    await server.initialize()
  })

  afterAll(async () => {
    await records.clear()
    vi.unstubAllEnvs()
    await server.stop({ timeout: 0 })
  })

  it('registers the empty manifest and serves the plant dashboard', async () => {
    const response = await server.inject('/plant-products')

    expect(response.statusCode).toBe(200)
    expect(response.result).toContain('Your import notifications')
    expect(response.result).toContain('Create a new notification')
  })

  it('creates a journey, guards a fresh hub, then serves import-type and hub', async () => {
    const cookies = cookieJar()
    const created = await server.inject({
      method: 'POST',
      url: '/plant-products/notifications'
    })
    cookies.absorb(created)
    const importTypeUrl = created.headers.location
    const hubUrl = importTypeUrl.replace(/\/import-type$/, '')

    expect(created.statusCode).toBe(302)
    expect(importTypeUrl).toMatch(
      /^\/plant-products\/notifications\/GBN-PP-[^/]+\/import-type$/
    )

    const guarded = await server.inject({
      url: hubUrl,
      headers: { cookie: cookies.header() }
    })
    expect(guarded.statusCode).toBe(302)
    expect(guarded.headers.location).toBe(importTypeUrl)

    const entry = await server.inject({
      url: importTypeUrl,
      headers: { cookie: cookies.header() }
    })
    expect(entry.statusCode).toBe(200)
    expect(entry.result).toContain('Plants, plant products and other objects')

    const selected = await server.inject({
      method: 'POST',
      url: importTypeUrl,
      payload: { importType: 'plant-products' },
      headers: { cookie: cookies.header() }
    })
    cookies.absorb(selected)
    expect(selected.statusCode).toBe(302)
    expect(selected.headers.location).toBe(hubUrl)

    const hub = await server.inject({
      url: hubUrl,
      headers: { cookie: cookies.header() }
    })
    expect(hub.statusCode).toBe(200)
    expect(hub.result).toContain('Review and submit')
    expect(hub.result).toContain('Cannot start yet')
  })

  it('leaves the plant commodity-mapper slot absent', () => {
    expect(() =>
      withSetContext('plant-products', () => speciesLabel('fixture'))
    ).toThrow('commodity reference not configured for set "plant-products"')
  })
})
