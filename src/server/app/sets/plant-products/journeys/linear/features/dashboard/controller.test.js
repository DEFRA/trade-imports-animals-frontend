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
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { plantProducts } from '../../../../../../routes-plant-products.js'
import {
  createRoutePath,
  dashboardRoutePath
} from '../../../../../../shared/paths.js'
import { records as plantRecords } from '../../../../services/records/index.js'
import { records as recordsStub } from '../../../../services/records/stub.js'
import { copy } from './copy/copy.en.js'
import { routes } from './controller.js'

describe('plant-products dashboard controller', () => {
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
    configureRecords('plant-products', plantRecords)
    await recordsStub.clear()
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    await server.stop({ timeout: 0 })
  })

  it('renders the empty list returned by records.list', async () => {
    const response = await server.inject('/plant-products')

    expect(response.statusCode).toBe(200)
    expect(response.result).toContain(copy.title)
    expect(response.result).toContain(copy.emptyState)
  })

  it('creates a journey and redirects to its plant import-type page', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/plant-products/notifications'
    })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toMatch(
      /^\/plant-products\/notifications\/GBN-PP-[^/]+\/import-type$/
    )
  })

  it('registers prefix-free route shapes and renders prefix-bearing actions', async () => {
    expect(routes.map(({ path }) => path)).toEqual([
      dashboardRoutePath(),
      createRoutePath()
    ])

    const response = await server.inject('/plant-products')
    expect(response.result).toContain('action="/plant-products/notifications"')
  })

  it('surfaces records list and create failures', async () => {
    configureRecords('plant-products', {
      ...recordsStub,
      list: async () => {
        throw new Error('list failed')
      },
      create: async () => {
        throw new Error('create failed')
      }
    })

    const listResponse = await server.inject('/plant-products')
    const createResponse = await server.inject({
      method: 'POST',
      url: '/plant-products/notifications'
    })

    expect(listResponse.statusCode).toBe(500)
    expect(createResponse.statusCode).toBe(500)
  })
})
