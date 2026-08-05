import Hapi from '@hapi/hapi'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import * as state from '../../../../../../../engine/index.js'
import {
  driveHandler,
  postHandlerOf
} from '../../../../../../../engine/test-support.js'
import { plantProducts } from '../../../../../../../routes-plant-products.js'
import * as kit from '../../../../../../../shared/kit.js'
import {
  enterSetContext,
  withSetContext
} from '../../../../../../../shared/set-context.js'
import { records } from '../../../../../services/records/stub.js'
import { copy as featureCopy } from '../copy/copy.en.js'
import * as search from './search.controller.js'

const copy = featureCopy.commoditySearch
const SEARCH_CODE_ACTION = 'search-code'
const get = search.routes.find(({ method }) => method === 'GET').handler
const post = postHandlerOf(search)
const drive = (handler, options) =>
  withSetContext('plant-products', () => driveHandler(handler, options))

describe('plant-products commodity-search controller', () => {
  let server

  beforeAll(async () => {
    vi.stubEnv('PLANT_PRODUCTS_MODE', 'stub')
    server = Hapi.server()
    await server.register(plantProducts, {
      routes: { prefix: '/plant-products' }
    })
  })

  beforeEach(async () => {
    enterSetContext('plant-products')
    await records.clear()
  })

  afterEach(() => vi.restoreAllMocks())

  afterAll(async () => {
    vi.unstubAllEnvs()
    await server.stop({ timeout: 0 })
  })

  it('renders both search models and the root commodity tree', async () => {
    const result = await drive(get)

    expect(result.view.context.values).toEqual({
      commoditySearchCode: '',
      speciesSearchTerm: ''
    })
    expect(result.view.context.tree.rows[0]).toMatchObject({
      code: '06',
      isLeaf: false,
      href: expect.stringContaining('/plant-products/')
    })
    expect(result.view.context.formAction).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/commodity-search$/
    )
  })

  it('drills down one tree level with an All commodities breadcrumb', async () => {
    const result = await drive(get, { query: { parent: '06' } })

    expect(result.view.context.tree.crumbs[0]).toMatchObject({
      text: copy.tree.allCommodities,
      href: expect.stringContaining('/plant-products/')
    })
    expect(result.view.context.tree.rows.map(({ code }) => code)).toEqual([
      '06011010',
      '0603197090',
      '06042090'
    ])
    expect(result.view.context.tree.rows.every(({ isLeaf }) => isLeaf)).toBe(
      true
    )
  })

  it.each([
    ['', 'codeRequired'],
    ['not-a-code', 'codeNumeric']
  ])(
    'rejects code %j with canonical %s copy and preserves it',
    async (raw, key) => {
      const result = await drive(post, {
        payload: { action: SEARCH_CODE_ACTION, commoditySearchCode: raw }
      })

      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors).toEqual({
        commoditySearchCode: copy.errors[key]
      })
      expect(result.view.context.values.commoditySearchCode).toBe(raw)
      expect(result.after).toEqual({})
    }
  )

  it('rejects a duplicate code without writing', async () => {
    const seed = { commodityLines: [{ commoditySelection: '06011010' }] }
    const result = await drive(post, {
      seed,
      payload: { action: SEARCH_CODE_ACTION, commoditySearchCode: '06011010' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.commoditySearchCode).toBe(
      copy.errors.codeDuplicate
    )
    expect(result.after).toEqual(seed)
  })

  it('appends a valid code and redirects through nextTarget', async () => {
    const nextTarget = vi
      .spyOn(kit, 'nextTarget')
      .mockResolvedValue('/plant-products/notifications/next-target')
    const result = await drive(post, {
      payload: { action: SEARCH_CODE_ACTION, commoditySearchCode: '06011010' }
    })

    expect(result.after.commodityLines).toEqual([
      { commoditySelection: '06011010' }
    ])
    expect(result.response.redirect).toBe(
      '/plant-products/notifications/next-target'
    )
    expect(nextTarget).toHaveBeenCalledOnce()
  })

  it('selects a tree leaf through the same append path', async () => {
    const result = await drive(post, {
      payload: { 'select-code': '0713500010' }
    })

    expect(result.after.commodityLines).toEqual([
      { commoditySelection: '0713500010' }
    ])
  })

  it('renders an explicit no-results state at 200 with the raw code', async () => {
    const result = await drive(post, {
      payload: { action: SEARCH_CODE_ACTION, commoditySearchCode: '99999999' }
    })

    expect(result.response.statusCode).toBe(200)
    expect(result.view.context.codeNoResults).toBe(true)
    expect(result.view.context.errorSummary).toBeNull()
    expect(result.view.context.values.commoditySearchCode).toBe('99999999')
  })

  it('requires a genus and species and preserves the raw value', async () => {
    const result = await drive(post, {
      payload: { action: 'search-species', speciesSearchTerm: '' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.speciesSearchTerm).toBe(
      copy.errors.speciesRequired
    )
    expect(result.view.context.values.speciesSearchTerm).toBe('')
    expect(result.after).toEqual({})
  })

  it('renders case-insensitive species results with their commodity codes', async () => {
    const result = await drive(post, {
      payload: { action: 'search-species', speciesSearchTerm: 'citrus' }
    })

    expect(result.view.context.speciesResults).toEqual([
      {
        speciesId: '1364882',
        eppoCode: 'CIDAC',
        genusAndSpecies: 'Citrus australasica',
        commodityCode: '08059000'
      }
    ])
  })

  it('adds a species result and seeds the nested EPPO join key', async () => {
    const result = await drive(post, {
      payload: {
        speciesSearchTerm: 'Citrus',
        'add-species-1364882': '08059000'
      }
    })

    expect(result.after.commodityLines).toEqual([
      {
        commoditySelection: '08059000',
        species: [
          {
            eppoCode: 'CIDAC',
            genusAndSpecies: 'Citrus australasica'
          }
        ]
      }
    ])
  })

  it('refuses a forged species submit without writing', async () => {
    const result = await drive(post, {
      payload: {
        speciesSearchTerm: 'Citrus',
        'add-species-forged': '08059000'
      }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.after).toEqual({})
  })

  it('does not fabricate a phantom parent for an invalid append index', async () => {
    vi.spyOn(state, 'appendEntry').mockResolvedValueOnce(9)

    await expect(
      drive(post, {
        payload: {
          speciesSearchTerm: 'Citrus',
          'add-species-1364882': '08059000'
        }
      })
    ).rejects.toThrow('parent index is out of range')
  })

  it('renders raw values and the recoverable failure at 500', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const result = await drive(post, {
      payload: { action: SEARCH_CODE_ACTION, commoditySearchCode: '06011010' }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.values.commoditySearchCode).toBe('06011010')
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after).toEqual({})
  })

  it('allows unexpected persistence errors to throw', async () => {
    vi.spyOn(kit, 'recoverableSave').mockRejectedValueOnce(
      new TypeError('programming failure')
    )

    await expect(
      drive(post, {
        payload: { action: SEARCH_CODE_ACTION, commoditySearchCode: '06011010' }
      })
    ).rejects.toThrow('programming failure')
  })
})
