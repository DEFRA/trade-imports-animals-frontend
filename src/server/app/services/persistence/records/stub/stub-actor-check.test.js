import { beforeEach, describe, expect, it } from 'vitest'
import { records } from './index.js'
import { consignor } from '../../../../sets/live-animals/obligations/sections/parties.js'

const consignorCopy = {
  name: 'Consignor Ltd',
  address: {
    addressLine1: '2 Depot Road',
    townOrCity: 'Vernier',
    postcode: '30055',
    countryCode: 'CH'
  }
}

const seedSubmittedWithParty = async () => {
  const draft = await records.create()
  const saved = await records.replaceFulfilment(draft.journeyId, {
    [consignor.id]: consignorCopy
  })
  await records.finalise(draft.journeyId, undefined, saved.concurrencyToken)
  return draft.journeyId
}

describe('stub lifecycle without an actor', () => {
  beforeEach(async () => {
    await records.clear()
  })

  it('accepts cancel-amend without an actor when the submitted baseline holds a party', async () => {
    const journeyId = await seedSubmittedWithParty()
    await records.amend(journeyId)

    await expect(records.cancelAmend(journeyId)).resolves.toBeDefined()
  })

  it('accepts soft-delete of a submitted notification holding a party without an actor', async () => {
    const journeyId = await seedSubmittedWithParty()

    await expect(records.softDelete(journeyId)).resolves.toBeDefined()
  })

  it('accepts soft-delete of a draft holding a party without an actor', async () => {
    const draft = await records.create()
    await records.replaceFulfilment(draft.journeyId, {
      [consignor.id]: consignorCopy
    })

    await expect(records.softDelete(draft.journeyId)).resolves.toBeDefined()
  })

  it('accepts copy of a source holding a party without an actor', async () => {
    const journeyId = await seedSubmittedWithParty()

    await expect(
      records.copy(journeyId, 'idempotency-key')
    ).resolves.toBeDefined()
  })
})
