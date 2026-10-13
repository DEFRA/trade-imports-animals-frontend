import { beforeEach, describe, expect, it } from 'vitest'
import { records } from './stub/index.js'
import { outstandingItemsOf } from './stub/outstanding-items.js'
import { encodeEvaluatorFulfilments } from './fulfilment-codec/index.js'
import { assembleFulfilments } from '../../../bridge/assemble-fulfilments.js'
import {
  OUTSTANDING_HEALTH_CERTIFICATE,
  SUBMITTED,
  SUBMITTED_ACTION_REQUIRED
} from '../../../engine/persistence/records.js'

const heldDocument = (accompanyingDocumentType) => ({
  accompanyingDocumentType,
  accompanyingDocumentAttachmentType: 'PDF',
  accompanyingDocumentReference: 'GBHC1234567890',
  accompanyingDocumentDateOfIssue: { day: '12', month: '12', year: '2025' },
  filename: 'health-certificate.pdf'
})

const fulfilmentHolding = (...types) =>
  assembleFulfilments({
    countryOfOrigin: 'FR',
    documents: types.map(heldDocument)
  })

const stored = (fulfilment) => encodeEvaluatorFulfilments(fulfilment)

const finaliseAtLoadedToken = async (journeyId) => {
  const { concurrencyToken } = await records.load({ journeyId })
  return records.finalise(journeyId, undefined, concurrencyToken)
}

describe('stub records — outstanding items worked out at submission', () => {
  it('Should owe the health certificate when no document is held', () => {
    expect(outstandingItemsOf(stored(fulfilmentHolding()))).toEqual([
      OUTSTANDING_HEALTH_CERTIFICATE
    ])
  })

  it('Should owe nothing when an ITAHC is held', () => {
    expect(outstandingItemsOf(stored(fulfilmentHolding('ITAHC')))).toEqual([])
  })

  it('Should owe nothing when a health certificate is held', () => {
    expect(
      outstandingItemsOf(stored(fulfilmentHolding('HEALTH_CERTIFICATE')))
    ).toEqual([])
  })

  it('Should owe the health certificate when only a veterinary health certificate is held', () => {
    expect(
      outstandingItemsOf(
        stored(fulfilmentHolding('VETERINARY_HEALTH_CERTIFICATE'))
      )
    ).toEqual([OUTSTANDING_HEALTH_CERTIFICATE])
  })
})

describe('records durable port — submitted with action required', () => {
  beforeEach(() => records.clear())

  it('Should submit as Submitted action required, carrying the outstanding health certificate, when none is held', async () => {
    const { journeyId } = await records.create()
    await records.replaceFulfilment(journeyId, fulfilmentHolding())

    const submitted = await finaliseAtLoadedToken(journeyId)

    expect(submitted.status).toBe(SUBMITTED_ACTION_REQUIRED)
    expect(submitted.outstandingItems).toEqual([OUTSTANDING_HEALTH_CERTIFICATE])
  })

  it('Should submit as Submitted when an ITAHC is held', async () => {
    const { journeyId } = await records.create()
    await records.replaceFulfilment(journeyId, fulfilmentHolding('ITAHC'))

    const submitted = await finaliseAtLoadedToken(journeyId)

    expect(submitted.status).toBe(SUBMITTED)
    expect(submitted.outstandingItems).toEqual([])
  })

  it('Should restore Submitted action required when an amendment of it is cancelled', async () => {
    const { journeyId } = await records.create()
    await records.replaceFulfilment(journeyId, fulfilmentHolding())
    await finaliseAtLoadedToken(journeyId)
    await records.amend(journeyId)

    const restored = await records.cancelAmend(journeyId)

    expect(restored.status).toBe(SUBMITTED_ACTION_REQUIRED)
  })
})

describe('records durable port — outstanding items recomputed on re-submission', () => {
  beforeEach(() => records.clear())

  it('Should clear the outstanding health certificate when an ITAHC is added in an amendment and re-submitted', async () => {
    const { journeyId } = await records.create()
    const submitted = await finaliseAtLoadedToken(journeyId)
    expect(submitted.status).toBe(SUBMITTED_ACTION_REQUIRED)
    expect(submitted.outstandingItems).toEqual([OUTSTANDING_HEALTH_CERTIFICATE])
    await records.amend(journeyId)
    await records.replaceFulfilment(journeyId, fulfilmentHolding('ITAHC'))

    const resubmitted = await finaliseAtLoadedToken(journeyId)

    expect(resubmitted.status).toBe(SUBMITTED)
    expect(resubmitted.outstandingItems).toEqual([])
  })

  it('Should owe the health certificate again when the ITAHC is removed in an amendment and re-submitted', async () => {
    const { journeyId } = await records.create()
    await records.replaceFulfilment(journeyId, fulfilmentHolding('ITAHC'))
    const submitted = await finaliseAtLoadedToken(journeyId)
    expect(submitted.status).toBe(SUBMITTED)
    await records.amend(journeyId)
    await records.replaceFulfilment(journeyId, fulfilmentHolding())

    const resubmitted = await finaliseAtLoadedToken(journeyId)

    expect(resubmitted.status).toBe(SUBMITTED_ACTION_REQUIRED)
    expect(resubmitted.outstandingItems).toEqual([
      OUTSTANDING_HEALTH_CERTIFICATE
    ])
  })

  it('Should restore Submitted when an amendment of a Submitted notification is cancelled', async () => {
    const { journeyId } = await records.create()
    await records.replaceFulfilment(journeyId, fulfilmentHolding('ITAHC'))
    await finaliseAtLoadedToken(journeyId)
    await records.amend(journeyId)

    const restored = await records.cancelAmend(journeyId)

    expect(restored.status).toBe(SUBMITTED)
  })
})
