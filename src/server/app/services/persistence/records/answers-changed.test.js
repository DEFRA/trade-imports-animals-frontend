import { beforeEach, describe, expect, it } from 'vitest'
import { records } from './stub/index.js'
import { obligationSet } from '../../../model/obligations/manifest.js'
import { assembleFulfilments } from '../../../bridge/assemble-fulfilments.js'

const { countryOfOrigin } = obligationSet()

const originFulfilment = (value) => ({ [countryOfOrigin.id]: value })

const finaliseAtLoadedToken = async (journeyId) => {
  const { concurrencyToken } = await records.load({ journeyId })
  return records.finalise(journeyId, undefined, concurrencyToken)
}

const uploadedDocument = (reference) => ({
  accompanyingDocumentType: 'VETERINARY_HEALTH_CERTIFICATE',
  accompanyingDocumentAttachmentType: 'PDF',
  accompanyingDocumentReference: reference,
  accompanyingDocumentDateOfIssue: { day: '12', month: '12', year: '2025' },
  filename: 'health-certificate.pdf'
})

const answersChanged = async (journeyId) =>
  (await records.load({ journeyId })).answersChangedSinceSubmission

describe('records durable port — answers changed since submission', () => {
  beforeEach(() => records.clear())

  it('Should report no answers changed when an amendment starts', async () => {
    const { journeyId } = await records.create()
    await records.replaceFulfilment(journeyId, originFulfilment('FR'))
    await finaliseAtLoadedToken(journeyId)

    const amended = await records.amend(journeyId)

    expect(amended.answersChangedSinceSubmission).toBe(false)
  })

  it("Should report answers changed once an amendment's notification answers differ, and not once they are put back", async () => {
    const { journeyId } = await records.create()
    await records.replaceFulfilment(journeyId, originFulfilment('FR'))
    await finaliseAtLoadedToken(journeyId)
    await records.amend(journeyId)

    await records.replaceFulfilment(journeyId, originFulfilment('DE'))
    expect(await answersChanged(journeyId)).toBe(true)

    await records.replaceFulfilment(journeyId, originFulfilment('FR'))
    expect(await answersChanged(journeyId)).toBe(false)
  })

  it('Should not count a change to the uploaded documents only', async () => {
    const { journeyId } = await records.create()
    await records.replaceFulfilment(
      journeyId,
      assembleFulfilments({
        countryOfOrigin: 'FR',
        documents: [uploadedDocument('GBHC1234567890')]
      })
    )
    await finaliseAtLoadedToken(journeyId)
    await records.amend(journeyId)

    await records.replaceFulfilment(
      journeyId,
      assembleFulfilments({
        countryOfOrigin: 'FR',
        documents: [
          uploadedDocument('GBHC1234567890'),
          uploadedDocument('GBHC0000000001')
        ]
      })
    )

    expect(await answersChanged(journeyId)).toBe(false)
  })

  it('Should report no answers changed on a draft or a submitted notification', async () => {
    const { journeyId } = await records.create()
    await records.replaceFulfilment(journeyId, originFulfilment('FR'))
    expect(await answersChanged(journeyId)).toBe(false)

    await finaliseAtLoadedToken(journeyId)
    expect(await answersChanged(journeyId)).toBe(false)
  })
})
