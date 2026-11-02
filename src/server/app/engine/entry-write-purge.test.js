import { beforeEach, describe, expect, it } from 'vitest'
import { updateEntryAt } from './write/index.js'
import { makeScope } from './read.js'
import { stubH, purgeTestJourney } from './test-support.js'

const CATTLE_LINE_WITH_HORSE_NAME = {
  countryOfOrigin: 'FR',
  commodityLines: [
    {
      commodityCode: '0102',
      speciesLatinName: 'Bos taurus',
      numberOfAnimalsQuantity: '2',
      animalIdentifiers: [
        { animalIdentifierEarTag: 'UK123', horseName: 'Dobbin' }
      ]
    }
  ]
}

const HORSE_LINE = {
  countryOfOrigin: 'FR',
  commodityLines: [
    {
      commodityCode: '0101',
      speciesLatinName: 'Equus cabalus',
      numberOfAnimalsQuantity: '1',
      animalIdentifiers: [{ horseName: 'Dobbin' }]
    }
  ]
}

const STALE_HORSE_NAME_KEY = 'commodityLines[0].animalIdentifiers[0].horseName'

let buildRequest, seed, durable, wipeOf

describe('entry-write canonical purge', () => {
  beforeEach(async () => {
    ;({ buildRequest, seed, durable, wipeOf } = await purgeTestJourney())
  })

  it('Should keep an out-of-scope stored value invisible to scope', () => {
    const scope = makeScope(CATTLE_LINE_WITH_HORSE_NAME)
    expect(scope.inScope.has(STALE_HORSE_NAME_KEY)).toBe(false)
    expect(
      scope.inScope.has(
        'commodityLines[0].animalIdentifiers[0].animalIdentifierEarTag'
      )
    ).toBe(true)
  })

  it('Should name the stale value in the wipe set', () => {
    expect(wipeOf(CATTLE_LINE_WITH_HORSE_NAME)).toContain(STALE_HORSE_NAME_KEY)
  })

  it('Should destroy an out-of-scope value in the same updateEntryAt snapshot', async () => {
    await seed(HORSE_LINE)
    await updateEntryAt(
      buildRequest(),
      stubH(),
      ['commodityLines'],
      0,
      CATTLE_LINE_WITH_HORSE_NAME.commodityLines[0]
    )
    const answers = await durable()
    expect(
      answers.commodityLines[0].animalIdentifiers[0].horseName
    ).toBeUndefined()
    expect(
      answers.commodityLines[0].animalIdentifiers[0].animalIdentifierEarTag
    ).toBe('UK123')
  })
})
