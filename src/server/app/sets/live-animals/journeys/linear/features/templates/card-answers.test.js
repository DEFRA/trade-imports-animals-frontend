import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  commodityCode,
  consignee,
  consignor,
  countryOfOrigin
} from '../../../../obligations/index.js'
import * as countries from '../../../../../../services/countries/index.js'
import { encodeEvaluatorFulfilments } from '../../../../../../services/persistence/records/fulfilment-codec/index.js'
import { cardAnswersFor } from './card-answers.js'

describe('cardAnswersFor', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Should name the commodity, country of origin, consignee and consignor a template holds', async () => {
    const label = vi
      .spyOn(countries, 'countryDisplayLabel')
      .mockResolvedValue('France')
    const fulfilments = encodeEvaluatorFulfilments({
      [commodityCode.id]: { l1: 'Cow' },
      [countryOfOrigin.id]: 'FR',
      [consignee.id]: { name: 'British Livestock Ltd' },
      [consignor.id]: { name: 'Astra Rosales' }
    })

    expect(await cardAnswersFor(fulfilments)).toEqual({
      commodity: 'Cow',
      origin: 'France',
      consignee: 'British Livestock Ltd',
      consignor: 'Astra Rosales'
    })
    expect(label).toHaveBeenCalledWith('FR')
  })

  it("Should list each commodity's common name once, in line order", async () => {
    const fulfilments = encodeEvaluatorFulfilments({
      [commodityCode.id]: { l1: 'Cow', l2: 'Horse', l3: 'Cow' }
    })

    const { commodity } = await cardAnswersFor(fulfilments)

    expect(commodity).toBe('Cow, Horse')
  })

  it('Should answer blanks for a template saved with nothing answered', async () => {
    expect(await cardAnswersFor([])).toEqual({
      commodity: '',
      origin: '',
      consignee: '',
      consignor: ''
    })
  })

  it('Should answer a blank for a party with no name', async () => {
    const fulfilments = encodeEvaluatorFulfilments({
      [consignee.id]: { address: {} }
    })

    const { consignee: name } = await cardAnswersFor(fulfilments)

    expect(name).toBe('')
  })
})
