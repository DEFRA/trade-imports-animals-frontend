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
import { varietiesFor } from '../../../../../services/commodities/index.js'
import { fromDto } from '../../../../../services/records/mapper/from-dto.js'
import { toDto } from '../../../../../services/records/mapper/to-dto.js'
import { records } from '../../../../../services/records/stub.js'
import { copy as featureCopy } from '../copy/copy.en.js'
import * as varietyPage from './variety-of-genus-and-species.controller.js'

const copy = featureCopy.varietyOfGenusAndSpecies
const get = varietyPage.routes.find(({ method }) => method === 'GET').handler
const post = postHandlerOf(varietyPage)
const drive = (handler, options) =>
  withSetContext('plant-products', () => driveHandler(handler, options))

const citrus = {
  eppoCode: 'CIDAC',
  genusAndSpecies: 'Citrus australasica',
  speciesId: '1364882'
}
const apple = {
  eppoCode: 'MABSD',
  genusAndSpecies: 'Malus domestica',
  speciesId: '1391442'
}
const lentil = {
  eppoCode: 'LENCU',
  genusAndSpecies: 'Lens culinaris',
  speciesId: '1346687'
}
const citrusVarietyId = 'C5E27C5A-D13B-E9F5-B4B0-7234A7941208'
const appleVarietyId = '03107EFA-9BCD-1089-565E-B28F73994DEC'
const variety = (name = appleVarietyId, varietyClass = 'CLASS_I') => ({
  variety: name,
  varietyClass
})
const qualifiedSeed = (extra = {}) => ({
  commodityLines: [
    {
      commoditySelection: '0808108090',
      species: [{ ...apple, ...extra }]
    }
  ]
})
const validAdd = {
  action: 'add:0:0',
  'varietySelect-0-0': appleVarietyId,
  'otherVariety-0-0': '',
  'varietyClass-0-0': 'CLASS_I'
}

describe('plant-products variety-of-genus-and-species controller', () => {
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
    expect(varietyPage.meta.collects).toEqual([])
  })

  it('gets state once, gates species by varieties and prefills saved rows', async () => {
    const getState = vi.spyOn(state, 'get')
    const result = await drive(get, {
      seed: {
        commodityLines: [
          {
            commoditySelection: '08059000',
            species: [{ ...citrus, varieties: [{ variety: citrusVarietyId }] }]
          },
          {
            commoditySelection: '0808108090',
            species: [{ ...apple, varieties: [variety()] }]
          }
        ]
      }
    })

    expect(getState).toHaveBeenCalledOnce()
    expect(result.view.context.cards).toHaveLength(2)
    expect(result.view.context.cards[0]).toMatchObject({
      lineIndex: 0,
      speciesIndex: 0,
      heading: 'CIDAC - Citrus australasica',
      hasClasses: false,
      rows: [
        {
          variety: 'None',
          class: '',
          action: 'remove:0:0:0'
        }
      ]
    })
    expect(result.view.context.cards[0].varietyItems).toEqual([
      { value: '', text: copy.varietyPlaceholder, selected: true },
      { value: citrusVarietyId, text: 'None', selected: false },
      { value: '__OTHER__', text: copy.otherOption, selected: false }
    ])
    expect(result.view.context.cards[1]).toMatchObject({
      lineIndex: 1,
      speciesIndex: 0,
      heading: 'MABSD - Malus domestica',
      hasClasses: true,
      rows: [
        {
          variety: 'McIntosh Red',
          class: 'Class I',
          action: 'remove:1:0:0'
        }
      ]
    })
    expect(result.view.context.addSpeciesHref).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/commodity-basic-description$/
    )
  })

  it('gives repeated controls exact distinct line-and-species names', async () => {
    const result = await drive(get, {
      seed: {
        commodityLines: [
          {
            commoditySelection: '0808108090',
            species: [
              {
                ...apple,
                varieties: [variety(), variety('Tahiti', 'CLASS_II')]
              },
              { ...apple, varieties: [variety()] }
            ]
          },
          {
            commoditySelection: '0808108090',
            species: [{ ...apple, varieties: [variety()] }]
          }
        ]
      }
    })

    const cards = result.view.context.cards
    const varietyNames = cards.map(
      ({ varietyAccessibleName }) => varietyAccessibleName
    )
    expect(varietyNames).toEqual([
      'Variety for commodity line 1, species 1: MABSD - Malus domestica',
      'Variety for commodity line 1, species 2: MABSD - Malus domestica',
      'Variety for commodity line 2, species 1: MABSD - Malus domestica'
    ])
    expect(new Set(varietyNames).size).toBe(varietyNames.length)
    for (const key of [
      'otherVarietyAccessibleName',
      'classAccessibleName',
      'addAccessibleName'
    ]) {
      const names = cards.map((card) => card[key])
      expect(names).toHaveLength(3)
      expect(new Set(names).size).toBe(names.length)
    }
    const removeNames = cards.flatMap(({ rows }) =>
      rows.map(({ accessibleName }) => accessibleName)
    )
    expect(removeNames).toEqual([
      'Remove McIntosh Red, Class I from commodity line 1, species 1: MABSD - Malus domestica',
      'Remove Tahiti, Class II from commodity line 1, species 1: MABSD - Malus domestica',
      'Remove McIntosh Red, Class I from commodity line 1, species 2: MABSD - Malus domestica',
      'Remove McIntosh Red, Class I from commodity line 2, species 1: MABSD - Malus domestica'
    ])
    expect(new Set(removeNames).size).toBe(removeNames.length)
  })

  it('redirects onward when no species has variety data', async () => {
    const nextTarget = vi
      .spyOn(kit, 'nextTarget')
      .mockResolvedValue('/plant-products/notifications/next-target')
    const result = await drive(get, {
      seed: {
        commodityLines: [{ commoditySelection: '06042090', species: [lentil] }]
      }
    })

    expect(result.response.redirect).toBe(
      '/plant-products/notifications/next-target'
    )
    expect(nextTarget).toHaveBeenCalledOnce()
  })

  it('appends exactly variety and class at depth three', async () => {
    const result = await drive(post, {
      seed: qualifiedSeed(),
      payload: validAdd
    })

    expect(result.after.commodityLines[0].species[0].varieties).toEqual([
      variety()
    ])
    expect(result.response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/variety-of-genus-and-species$/
    )
  })

  it('requires a variety but not a class for a no-class species', async () => {
    const seed = {
      commodityLines: [{ commoditySelection: '08059000', species: [citrus] }]
    }
    const result = await drive(post, {
      seed,
      payload: { action: 'add:0:0' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      'varietySelect-0-0': copy.errors.atLeastOneVariety
    })
    expect(result.view.context.errors).not.toHaveProperty('varietyClass-0-0')
    expect(result.after).toEqual(seed)
  })

  it('persists and round-trips a no-class variety without a class leaf', async () => {
    const selectedVariety = varietiesFor('08059000', citrus.eppoCode)[0].id
    const result = await drive(post, {
      seed: {
        commodityLines: [{ commoditySelection: '08059000', species: [citrus] }]
      },
      payload: {
        action: 'add:0:0',
        'varietySelect-0-0': selectedVariety
      }
    })
    const saved = result.after.commodityLines[0].species[0].varieties
    const { nominatedContacts, ...roundTripped } = fromDto(toDto(result.after))
    const duplicate = await drive(post, {
      seed: result.after,
      payload: {
        action: 'add:0:0',
        'varietySelect-0-0': selectedVariety
      }
    })

    expect(saved).toEqual([{ variety: selectedVariety }])
    expect(saved[0]).not.toHaveProperty('varietyClass')
    expect(nominatedContacts).toEqual([])
    expect(roundTripped).toEqual(result.after)
    expect(duplicate.response.statusCode).toBe(400)
    expect(duplicate.view.context.errors).toEqual({
      'varietySelect-0-0': copy.errors.duplicatePair
    })
    expect(duplicate.after).toEqual(result.after)
  })

  it('commits cleaned Other text as variety and never persists the sentinel', async () => {
    const result = await drive(post, {
      seed: qualifiedSeed(),
      payload: {
        ...validAdd,
        'varietySelect-0-0': '__OTHER__',
        'otherVariety-0-0': '  Tahiti Lime  ',
        'varietyClass-0-0': 'CLASS_II'
      }
    })

    expect(result.after.commodityLines[0].species[0].varieties).toEqual([
      variety('Tahiti Lime', 'CLASS_II')
    ])
    expect(JSON.stringify(result.after)).not.toContain('__OTHER__')
  })

  it.each([
    [
      'variety required',
      { 'varietyClass-0-0': 'CLASS_I' },
      'varietySelect-0-0',
      copy.errors.varietyRequired
    ],
    [
      'class required',
      { 'varietySelect-0-0': appleVarietyId },
      'varietyClass-0-0',
      copy.errors.classRequired
    ],
    [
      'at least one required',
      {},
      'varietySelect-0-0',
      copy.errors.atLeastOneVariety
    ],
    [
      'other required',
      {
        'varietySelect-0-0': '__OTHER__',
        'varietyClass-0-0': 'CLASS_I'
      },
      'otherVariety-0-0',
      copy.errors.otherVarietyRequired
    ],
    [
      'other length',
      {
        'varietySelect-0-0': '__OTHER__',
        'otherVariety-0-0': 'A'.repeat(33),
        'varietyClass-0-0': 'CLASS_I'
      },
      'otherVariety-0-0',
      copy.errors.otherVarietyLength
    ]
  ])(
    'returns the canonical %s error and preserves raw state',
    async (_case, fields, errorField, message) => {
      const seed = qualifiedSeed()
      const payload = { action: 'add:0:0', ...fields }
      const result = await drive(post, { seed, payload })

      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors[errorField]).toBe(message)
      expect(result.view.context.errorSummary.errorList).toContainEqual({
        text: message,
        href: `#${errorField}`
      })
      expect(result.view.context.cards[0].values).toEqual({
        variety: String(payload['varietySelect-0-0'] ?? ''),
        otherVariety: String(payload['otherVariety-0-0'] ?? ''),
        varietyClass: String(payload['varietyClass-0-0'] ?? '')
      })
      expect(result.after).toEqual(seed)
    }
  )

  it('rejects a duplicate pair for the same species without writing', async () => {
    const seed = qualifiedSeed({ varieties: [variety()] })
    const result = await drive(post, { seed, payload: validAdd })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      'varietySelect-0-0': copy.errors.duplicatePair
    })
    expect(result.after).toEqual(seed)
  })

  it.each([
    ['negative line add', 'add:-1:0'],
    ['non-integer line add', 'add:0.5:0'],
    ['out-of-range line add', 'add:1:0'],
    ['negative species add', 'add:0:-1'],
    ['non-integer species add', 'add:0:0.5'],
    ['out-of-range species add', 'add:0:1'],
    ['negative line remove', 'remove:-1:0:0'],
    ['non-integer line remove', 'remove:0.5:0:0'],
    ['out-of-range line remove', 'remove:1:0:0'],
    ['negative species remove', 'remove:0:-1:0'],
    ['non-integer species remove', 'remove:0:0.5:0'],
    ['out-of-range species remove', 'remove:0:1:0'],
    ['negative variety remove', 'remove:0:0:-1'],
    ['non-integer variety remove', 'remove:0:0:0.5'],
    ['out-of-range variety remove', 'remove:0:0:1'],
    ['malformed add', 'add:0'],
    ['malformed remove', 'remove:0:0']
  ])('refuses %s without persistence corruption', async (_case, action) => {
    const seed = qualifiedSeed({ varieties: [variety()] })
    const result = await drive(post, {
      seed,
      payload: { ...validAdd, action }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.after).toEqual(seed)
  })

  it('removes only the addressed variety and preserves every sibling level', async () => {
    const firstSpeciesSibling = variety('Tahiti', 'CLASS_II')
    const secondSpeciesSibling = variety('Species sibling', 'EXTRA_CLASS')
    const lineSibling = variety('Line sibling', 'CLASS_II')
    const result = await drive(post, {
      seed: {
        commodityLines: [
          {
            commoditySelection: '0808108090',
            species: [
              { ...apple, varieties: [variety(), firstSpeciesSibling] },
              { ...apple, varieties: [secondSpeciesSibling] }
            ]
          },
          {
            commoditySelection: '0808108090',
            species: [{ ...apple, varieties: [lineSibling] }]
          }
        ]
      },
      payload: { action: 'remove:0:0:0' }
    })

    expect(result.after.commodityLines[0].species[0].varieties).toEqual([
      firstSpeciesSibling
    ])
    expect(result.after.commodityLines[0].species[1].varieties).toEqual([
      secondSpeciesSibling
    ])
    expect(result.after.commodityLines[1].species[0].varieties).toEqual([
      lineSibling
    ])
  })

  it('save and continue commits independent part-filled species rows then advances', async () => {
    const nextTarget = vi
      .spyOn(kit, 'nextTarget')
      .mockResolvedValue('/plant-products/notifications/next-target')
    const result = await drive(post, {
      seed: {
        commodityLines: [
          {
            commoditySelection: '0808108090',
            species: [apple, apple]
          }
        ]
      },
      payload: {
        'varietySelect-0-0': appleVarietyId,
        'varietyClass-0-0': 'CLASS_I',
        'varietySelect-0-1': '__OTHER__',
        'otherVariety-0-1': 'Tahiti',
        'varietyClass-0-1': 'CLASS_II'
      }
    })

    expect(result.after.commodityLines[0].species[0].varieties).toEqual([
      variety()
    ])
    expect(result.after.commodityLines[0].species[1].varieties).toEqual([
      variety('Tahiti', 'CLASS_II')
    ])
    expect(result.response.redirect).toBe(
      '/plant-products/notifications/next-target'
    )
    expect(nextTarget).toHaveBeenCalledOnce()
  })

  it('lets the hub exit win after validating the page', async () => {
    const nextTarget = vi.spyOn(kit, 'nextTarget')
    const result = await drive(post, {
      seed: qualifiedSeed({ varieties: [variety()] }),
      payload: { exit: 'hub' }
    })

    expect(result.response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+$/
    )
    expect(nextTarget).not.toHaveBeenCalled()
  })

  it('renders the current page state and recoverable error at 500', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const seed = qualifiedSeed()
    const result = await drive(post, { seed, payload: validAdd })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after).toEqual(seed)
  })

  it('allows unexpected persistence errors to throw', async () => {
    vi.spyOn(kit, 'recoverableSave').mockRejectedValueOnce(
      new TypeError('programming failure')
    )

    await expect(
      drive(post, { seed: qualifiedSeed(), payload: validAdd })
    ).rejects.toThrow('programming failure')
  })
})
