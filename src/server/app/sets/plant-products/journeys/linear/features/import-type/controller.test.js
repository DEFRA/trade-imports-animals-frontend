// Controller contract from docs/add-a-set.md step 7.
import Hapi from '@hapi/hapi'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { nunjucksConfig } from '../../../../../../../../config/nunjucks/nunjucks.js'
import { plantProducts } from '../../../../../../routes-plant-products.js'
import * as kit from '../../../../../../shared/kit.js'
import { records } from '../../../../services/records/stub.js'
import { copy } from './copy/copy.en.js'

const jar = () => {
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

describe('plant-products import-type controller', () => {
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

  afterEach(async () => {
    vi.restoreAllMocks()
    await records.clear()
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    await server.stop({ timeout: 0 })
  })

  const newJourney = async (cookies = jar()) => {
    const response = await server.inject({
      method: 'POST',
      url: '/plant-products/notifications',
      headers: { cookie: cookies.header() }
    })
    cookies.absorb(response)
    return { cookies, url: response.headers.location }
  }

  it('prefills GET from the saved flow-only answer', async () => {
    const { cookies, url } = await newJourney()
    const post = await server.inject({
      method: 'POST',
      url,
      payload: { importType: 'plant-products' },
      headers: { cookie: cookies.header() }
    })
    cookies.absorb(post)

    const response = await server.inject({
      url,
      headers: { cookie: cookies.header() }
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).toMatch(/value="plant-products"[^>]*checked/)
  })

  it('returns 400 with raw values and the required error', async () => {
    const { cookies, url } = await newJourney()
    const response = await server.inject({
      method: 'POST',
      url,
      payload: { importType: '' },
      headers: { cookie: cookies.header() }
    })

    expect(response.statusCode).toBe(400)
    expect(response.result).toContain(copy.errors.importTypeRequired)
    expect(response.result).not.toMatch(/name="importType"[^>]*checked/)
  })

  it('commits plant-products and redirects through the opening run to the hub', async () => {
    const { cookies, url } = await newJourney()
    const response = await server.inject({
      method: 'POST',
      url,
      payload: { importType: 'plant-products' },
      headers: { cookie: cookies.header() }
    })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toMatch(
      /^\/plant-products\/notifications\/[^/]+$/
    )
  })

  it('commits a non-plant selection and redirects to the holding page', async () => {
    const { cookies, url } = await newJourney()
    const response = await server.inject({
      method: 'POST',
      url,
      payload: { importType: 'poao' },
      headers: { cookie: cookies.header() }
    })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/import-type\/not-available$/
    )
  })

  it('renders a recoverable save failure at 500', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const { cookies, url } = await newJourney()
    const response = await server.inject({
      method: 'POST',
      url,
      payload: { importType: 'plant-products' },
      headers: { cookie: cookies.header() }
    })

    expect(response.statusCode).toBe(500)
    expect(response.result).toContain('problem with the service')
  })

  it('lets unexpected save errors reach the server catch-all', async () => {
    vi.spyOn(kit, 'recoverableSave').mockRejectedValueOnce(
      new TypeError('programming failure')
    )
    const { cookies, url } = await newJourney()
    const response = await server.inject({
      method: 'POST',
      url,
      payload: { importType: 'plant-products' },
      headers: { cookie: cookies.header() }
    })

    expect(response.statusCode).toBe(500)
    expect(response.result).not.toContain('problem with the service')
  })
})
