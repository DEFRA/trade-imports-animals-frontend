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
import * as summaryPage from './commodity-summary.controller.js'

const get = summaryPage.routes.find(({ method }) => method === 'GET').handler
const post = postHandlerOf(summaryPage)
const drive = (handler, options) =>
  withSetContext('plant-products', () => driveHandler(handler, options))

const crataegomespilus = {
  eppoCode: 'CXQDA',
  genusAndSpecies: '+ Crataegomespilus dardarii',
  speciesId: '1345651'
}
const lens = {
  eppoCode: 'LENCU',
  genusAndSpecies: 'Lens culinaris',
  speciesId: '1346687'
}
const citrus = {
  eppoCode: 'CIDAC',
  genusAndSpecies: 'Citrus australasica',
  speciesId: '1364882'
}
const citrusVarieties = [
  { variety: 'NONE', varietyClass: 'CLASS_I' },
  { variety: 'NONE', varietyClass: 'CLASS_II' }
]
const multiLineSeed = () => ({
  commodityLines: [
    {
      commoditySelection: '06042090',
      species: [crataegomespilus, lens]
    },
    {
      commoditySelection: '08059000',
      species: [{ ...citrus, varieties: citrusVarieties }]
    }
  ]
})

describe('plant-products commodity-summary controller', () => {
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

  it('declares no collection ownership', () => {
    expect(summaryPage.meta.collects).toEqual([])
  })

  it('gets state once and builds fixture-resolved groups with blank and stacked cells', async () => {
    const getState = vi.spyOn(state, 'get')
    const result = await drive(get, { seed: multiLineSeed() })

    expect(getState).toHaveBeenCalledOnce()
    expect(result.view.context.groups).toMatchObject([
      {
        lineIndex: 0,
        commodityCode: '06042090',
        commodityDescription: 'Other',
        rows: [
          {
            speciesIndex: 0,
            genusAndSpecies: '+ Crataegomespilus dardarii',
            eppoCode: 'CXQDA',
            varieties: [],
            removable: true,
            action: 'remove:0:0'
          },
          {
            speciesIndex: 1,
            genusAndSpecies: 'Lens culinaris',
            eppoCode: 'LENCU',
            varieties: [],
            removable: true,
            action: 'remove:0:1'
          }
        ]
      },
      {
        lineIndex: 1,
        commodityCode: '08059000',
        commodityDescription: 'Other',
        rows: [
          {
            speciesIndex: 0,
            genusAndSpecies: 'Citrus australasica',
            eppoCode: 'CIDAC',
            varieties: [
              { varietyLabel: 'None', classLabel: 'Class I' },
              { varietyLabel: 'None', classLabel: 'Class II' }
            ],
            removable: false,
            action: 'remove:1:0'
          }
        ]
      }
    ])
    expect(result.view.context.groups[0].addSpeciesHref).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/commodity-basic-description\?line=0#species-0$/
    )
    expect(result.view.context.groups[1].addSpeciesHref).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/commodity-basic-description\?line=1#species-1$/
    )
    expect(result.view.context.addCommodityHref).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/commodity-search$/
    )
  })

  it('gives every rendered Remove control an exact distinct line-and-species name', async () => {
    const result = await drive(get, { seed: multiLineSeed() })
    const removeNames = result.view.context.groups.flatMap(({ rows }) =>
      rows
        .filter(({ removable }) => removable)
        .map(({ removeAccessibleName }) => removeAccessibleName)
    )

    expect(removeNames).toEqual([
      'Remove + Crataegomespilus dardarii from commodity line 1, species 1: 06042090',
      'Remove Lens culinaris from commodity line 1, species 2: 06042090'
    ])
    expect(new Set(removeNames).size).toBe(removeNames.length)
  })

  it('removes only the addressed species, preserves all sibling levels and renumbers rows', async () => {
    const seed = multiLineSeed()
    const removed = await drive(post, {
      seed,
      payload: { action: 'remove:0:0' }
    })

    expect(removed.after.commodityLines[0]).toEqual({
      commoditySelection: '06042090',
      species: [lens]
    })
    expect(removed.after.commodityLines[1]).toEqual(seed.commodityLines[1])
    expect(removed.response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/commodity-summary$/
    )

    const rerendered = await drive(get, { seed: removed.after })
    expect(rerendered.view.context.groups[0].rows).toMatchObject([
      {
        speciesIndex: 0,
        genusAndSpecies: 'Lens culinaris',
        varieties: [],
        removable: false,
        action: 'remove:0:0'
      }
    ])
    expect(rerendered.view.context.groups[1]).toMatchObject({
      lineIndex: 1,
      rows: [
        {
          speciesIndex: 0,
          genusAndSpecies: 'Citrus australasica',
          varieties: [
            { varietyLabel: 'None', classLabel: 'Class I' },
            { varietyLabel: 'None', classLabel: 'Class II' }
          ]
        }
      ]
    })
  })

  it.each([
    ['negative line', 'remove:-1:0'],
    ['non-integer line', 'remove:0.5:0'],
    ['out-of-range line', 'remove:2:0'],
    ['negative species', 'remove:0:-1'],
    ['non-integer species', 'remove:0:0.5'],
    ['out-of-range species', 'remove:0:2'],
    ['malformed target', 'remove:0'],
    ['empty target', 'remove::0']
  ])(
    'refuses a %s index before any persistence write',
    async (_case, action) => {
      const seed = multiLineSeed()
      const result = await drive(post, { seed, payload: { action } })

      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.groups).toHaveLength(2)
      expect(result.after).toEqual(seed)
    }
  )

  it('refuses removal of the last species without writing', async () => {
    const seed = {
      commodityLines: [{ commoditySelection: '06042090', species: [lens] }]
    }
    const result = await drive(post, {
      seed,
      payload: { action: 'remove:0:0' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.groups[0].rows[0].removable).toBe(false)
    expect(result.after).toEqual(seed)
  })

  it('continues without writing and uses the exact next target', async () => {
    const nextTarget = vi
      .spyOn(kit, 'nextTarget')
      .mockResolvedValue('/plant-products/notifications/next-target')
    const seed = multiLineSeed()
    const result = await drive(post, { seed, payload: {} })

    expect(result.response.redirect).toBe(
      '/plant-products/notifications/next-target'
    )
    expect(nextTarget).toHaveBeenCalledOnce()
    expect(result.after).toEqual(seed)
  })

  it('lets the hub exit win without writing', async () => {
    const nextTarget = vi.spyOn(kit, 'nextTarget')
    const seed = multiLineSeed()
    const result = await drive(post, { seed, payload: { exit: 'hub' } })

    expect(result.response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+$/
    )
    expect(nextTarget).not.toHaveBeenCalled()
    expect(result.after).toEqual(seed)
  })

  it('renders the unchanged page with a recoverable error at 500', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const seed = multiLineSeed()
    const result = await drive(post, {
      seed,
      payload: { action: 'remove:0:0' }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after).toEqual(seed)
  })

  it('allows unexpected persistence errors to throw', async () => {
    vi.spyOn(kit, 'recoverableSave').mockRejectedValueOnce(
      new TypeError('programming failure')
    )

    await expect(
      drive(post, {
        seed: multiLineSeed(),
        payload: { action: 'remove:0:0' }
      })
    ).rejects.toThrow('programming failure')
  })
})
