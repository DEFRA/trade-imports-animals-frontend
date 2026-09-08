import { beforeEach, describe, expect, it } from 'vitest'
import { records } from './index.js'
import {
  consignor,
  placeOfDestination,
  placeOfOrigin
} from '../../../../sets/live-animals/obligations/sections/parties.js'
import { hasReferenceParty } from './lifecycle/has-reference-party.js'
import { encodeEvaluatorFulfilments } from '../fulfilment-codec/index.js'

const partyFulfilment = (obligation, addressId) =>
  encodeEvaluatorFulfilments({ [obligation.id]: { addressId } })

const seedSubmitted = async (fulfilment, actor) => {
  const draft = await records.create(actor)
  if (fulfilment) {
    await records.replaceFulfilment(draft.journeyId, {
      [consignor.id]: { addressId: 'consignor-x' }
    })
  }
  await records.finalise(draft.journeyId, actor)
  return draft.journeyId
}

const validActor = { organisationId: 'org-123' }
const MISSING_ORG_ID = 'organisation id is required'

describe('hasReferenceParty', () => {
  it('returns true when a reference role carries an addressId', () => {
    const fulfilment = partyFulfilment(consignor, 'abc')
    expect(hasReferenceParty(fulfilment)).toBe(true)
  })

  it('returns false when no party is present', () => {
    expect(hasReferenceParty([])).toBe(false)
  })

  it('returns false when only an inline role carries an addressId', () => {
    // placeOfOrigin is inline on the backend — its addressId is stripped at
    // ingest and never triggers a resolve, so the check must not fire on it.
    const fulfilment = partyFulfilment(placeOfOrigin, 'ignored')
    expect(hasReferenceParty(fulfilment)).toBe(false)
  })

  it('returns true when a non-consignor reference role carries an addressId', () => {
    const fulfilment = partyFulfilment(placeOfDestination, 'dest-1')
    expect(hasReferenceParty(fulfilment)).toBe(true)
  })
})

describe('stub lifecycle actor requirement', () => {
  beforeEach(async () => {
    await records.clear()
  })

  it('rejects cancel-amend without organisationId when the freeze carries a reference party', async () => {
    const journeyId = await seedSubmitted(true, validActor)
    await records.amend(journeyId, validActor)

    await expect(records.cancelAmend(journeyId)).rejects.toThrow(MISSING_ORG_ID)
  })

  it('accepts cancel-amend with organisationId when the freeze carries a reference party', async () => {
    const journeyId = await seedSubmitted(true, validActor)
    await records.amend(journeyId, validActor)

    await expect(
      records.cancelAmend(journeyId, validActor)
    ).resolves.toBeDefined()
  })

  it('rejects soft-delete of a submitted notification without organisationId when a reference party is present', async () => {
    const journeyId = await seedSubmitted(true, validActor)

    await expect(records.softDelete(journeyId)).rejects.toThrow(MISSING_ORG_ID)
  })

  it('accepts soft-delete of a draft notification without an actor', async () => {
    // Draft delete emits a draft-grade event; no address-book resolution is
    // needed even when a reference party has been picked.
    const draft = await records.create()
    await records.replaceFulfilment(draft.journeyId, {
      [consignor.id]: { addressId: 'consignor-x' }
    })

    await expect(records.softDelete(draft.journeyId)).resolves.toBeDefined()
  })

  it('rejects copy of a source carrying a reference party without organisationId', async () => {
    const journeyId = await seedSubmitted(true, validActor)

    await expect(records.copy(journeyId, 'idempotency-key')).rejects.toThrow(
      MISSING_ORG_ID
    )
  })

  it('accepts copy of a source with no reference parties without an actor', async () => {
    const draft = await records.create()

    await expect(
      records.copy(draft.journeyId, 'idempotency-key')
    ).resolves.toBeDefined()
  })
})
