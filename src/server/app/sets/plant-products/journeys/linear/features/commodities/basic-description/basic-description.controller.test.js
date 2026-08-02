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
import * as basicDescription from './basic-description.controller.js'

const copy = featureCopy.basicDescription
const get = basicDescription.routes.find(
  ({ method }) => method === 'GET'
).handler
const post = postHandlerOf(basicDescription)
const drive = (handler, options) =>
  withSetContext('plant-products', () => driveHandler(handler, options))

const albuca = {
  eppoCode: 'ABWBR',
  genusAndSpecies: 'Albuca bracteata',
  speciesId: '1325967'
}
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

describe('plant-products commodity-basic-description controller', () => {
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

  it('gets state once and renders one fixture-backed card per commodity line', async () => {
    const getState = vi.spyOn(state, 'get')
    const result = await drive(get, {
      seed: {
        commodityLines: [
          { commoditySelection: '06042090' },
          { commoditySelection: '06011010', species: [albuca] }
        ]
      }
    })

    expect(getState).toHaveBeenCalledOnce()
    expect(result.view.context.cards).toHaveLength(2)
    expect(result.view.context.cards[0]).toMatchObject({
      commodity: { code: '06042090', description: 'Other' },
      added: [],
      candidates: [crataegomespilus, lens]
    })
    expect(result.view.context.cards[1]).toMatchObject({
      commodity: { code: '06011010', description: 'Hyacinths' },
      added: [{ ...albuca, speciesIndex: 0 }],
      candidates: []
    })
    expect(result.view.context.cards[0].postAction).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/commodity-basic-description#species-0$/
    )
  })

  it('filters only the addressed line with case-insensitive AND substrings', async () => {
    const result = await drive(get, {
      seed: {
        commodityLines: [
          { commoditySelection: '06042090' },
          { commoditySelection: '06011010' }
        ]
      },
      query: { line: '0', genus: 'LENS', eppoCode: 'enc' }
    })

    expect(result.view.context.cards[0].candidates).toEqual([lens])
    expect(result.view.context.cards[0].filters).toEqual({
      genus: 'LENS',
      eppoCode: 'enc'
    })
    expect(result.view.context.cards[1].candidates).toEqual([albuca])
    expect(result.view.context.cards[1].filters).toEqual({
      genus: '',
      eppoCode: ''
    })
  })

  it('exposes a no-results view state without creating an error', async () => {
    const result = await drive(get, {
      seed: { commodityLines: [{ commoditySelection: '06042090' }] },
      query: { line: '0', genus: 'no match', eppoCode: 'none' }
    })

    expect(result.view.context.cards[0].candidates).toEqual([])
    expect(result.view.context.cards[0].error).toBeUndefined()
    expect(result.view.context.errorSummary).toBeNull()
  })

  it('appends exactly fixture-derived species fields at depth two', async () => {
    const result = await drive(post, {
      seed: { commodityLines: [{ commoditySelection: '06042090' }] },
      payload: {
        action: 'add:0:LENCU',
        genusAndSpecies: 'forged client value',
        speciesId: 'forged-client-id'
      }
    })

    expect(result.after.commodityLines[0].species).toEqual([lens])
    expect(result.response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/commodity-basic-description$/
    )
  })

  it.each([
    ['negative', 'add:-1:LENCU'],
    ['non-integer', 'add:0.5:LENCU'],
    ['out-of-range', 'add:1:LENCU'],
    ['malformed', 'add:0'],
    ['unknown species', 'add:0:FORGED']
  ])(
    'refuses a %s add target without persistence corruption',
    async (_case, action) => {
      const seed = { commodityLines: [{ commoditySelection: '06042090' }] }
      const result = await drive(post, { seed, payload: { action } })

      expect(result.response.statusCode).toBe(400)
      expect(result.after).toEqual(seed)
    }
  )

  it('refuses a duplicate EPPO code without writing', async () => {
    const seed = {
      commodityLines: [{ commoditySelection: '06042090', species: [lens] }]
    }
    const result = await drive(post, {
      seed,
      payload: { action: 'add:0:LENCU' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.after).toEqual(seed)
  })

  it('removes only the addressed species entry', async () => {
    const result = await drive(post, {
      seed: {
        commodityLines: [
          {
            commoditySelection: '06042090',
            species: [crataegomespilus, lens]
          }
        ]
      },
      payload: { action: 'remove:0:0' }
    })

    expect(result.after.commodityLines[0].species).toEqual([lens])
  })

  it.each([
    ['negative parent', 'remove:-1:0'],
    ['non-integer parent', 'remove:0.5:0'],
    ['out-of-range parent', 'remove:1:0'],
    ['negative species', 'remove:0:-1'],
    ['non-integer species', 'remove:0:0.5'],
    ['out-of-range species', 'remove:0:1'],
    ['malformed', 'remove:0']
  ])(
    'refuses a %s remove target without persistence corruption',
    async (_case, action) => {
      const seed = {
        commodityLines: [{ commoditySelection: '06042090', species: [lens] }]
      }
      const result = await drive(post, { seed, payload: { action } })

      expect(result.response.statusCode).toBe(400)
      expect(result.after).toEqual(seed)
    }
  )

  it('allows removing the last remaining species', async () => {
    const result = await drive(post, {
      seed: {
        commodityLines: [{ commoditySelection: '06042090', species: [lens] }]
      },
      payload: { action: 'remove:0:0' }
    })

    expect(result.after.commodityLines[0].species).toBeUndefined()
  })

  it('returns 400 with one linked error per empty species collection and preserves state', async () => {
    const seed = {
      commodityLines: [
        { commoditySelection: '06042090' },
        { commoditySelection: '06011010', species: [albuca] }
      ]
    }
    const result = await drive(post, { seed })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      'species-0': copy.errors.selectAtLeastOne
    })
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: copy.errors.selectAtLeastOne, href: '#species-0' }
    ])
    expect(result.after).toEqual(seed)
  })

  it('continues without writing when every commodity line has species', async () => {
    const nextTarget = vi
      .spyOn(kit, 'nextTarget')
      .mockResolvedValue('/plant-products/notifications/next-target')
    const seed = {
      commodityLines: [
        { commoditySelection: '06042090', species: [lens] },
        { commoditySelection: '06011010', species: [albuca] }
      ]
    }
    const result = await drive(post, { seed })

    expect(result.after).toEqual(seed)
    expect(result.response.redirect).toBe(
      '/plant-products/notifications/next-target'
    )
    expect(nextTarget).toHaveBeenCalledOnce()
  })

  it('lets the hub exit win before nextTarget', async () => {
    const nextTarget = vi.spyOn(kit, 'nextTarget')
    const result = await drive(post, {
      seed: {
        commodityLines: [{ commoditySelection: '06042090', species: [lens] }]
      },
      payload: { exit: 'hub' }
    })

    expect(result.response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+$/
    )
    expect(nextTarget).not.toHaveBeenCalled()
  })

  it('renders the existing page state and recoverable error at 500', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const seed = { commodityLines: [{ commoditySelection: '06042090' }] }
    const result = await drive(post, {
      seed,
      payload: { action: 'add:0:LENCU' }
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
        seed: { commodityLines: [{ commoditySelection: '06042090' }] },
        payload: { action: 'add:0:LENCU' }
      })
    ).rejects.toThrow('programming failure')
  })
})
