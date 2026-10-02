import { SET_ID } from '../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../flow/dispatch.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from '../../../../../../engine/read.js'
import { journeyRequest, stubH } from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import { copy as documentsEn } from '../documents/copy/copy.en.js'
import { documentsRejectedCardErrors, isReviewRefused } from './refusal.js'

const KNOWN_PORT = 'GB ABD'
const STALE_PORT = 'GB ZZZ'
const VALID_COPY = {
  name: 'Astra Rosales',
  phone: '01632 960000',
  email: 'astra-rosales@example.com',
  address: {
    addressLine1: '43 East Hague Extension',
    townOrCity: 'Bern',
    postcode: '30055',
    countryCode: 'CH'
  }
}

const doc = (overrides = {}) => ({
  accompanyingDocumentType: 'ITAHC',
  accompanyingDocumentAttachmentType: 'PDF',
  accompanyingDocumentReference: 'GBHC1234567890',
  accompanyingDocumentDateOfIssue: '2026-01-01',
  uploadId: 'upload-1',
  filename: 'clean.pdf',
  ...overrides
})

const fullyAnswered = (overrides = {}) => ({
  portOfEntry: KNOWN_PORT,
  consignor: VALID_COPY,
  ...overrides
})

const seedAnd = async (seed) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, seed)
  return journey
}

const askRefused = async (journeyId) =>
  isReviewRefused(journeyRequest(journeyId), stubH())

describe('#isReviewRefused', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => {
    store.clear()
    configureReadyForCheckYourAnswers(SET_ID, () => true)
  })

  it('Should not refuse a submitted notification, even one carrying a stale answer', async () => {
    const journey = await seedAnd({ portOfEntry: STALE_PORT })
    await store.submit(journey.journeyId)

    expect(await askRefused(journey.journeyId)).toBe(false)
  })

  it('Should refuse an unfinished notification', async () => {
    configureReadyForCheckYourAnswers(SET_ID, () => false)
    const journey = await seedAnd({})

    expect(await askRefused(journey.journeyId)).toBe(true)
  })

  it('Should refuse a notification whose stored answer no longer passes its own rules', async () => {
    const journey = await seedAnd({ portOfEntry: STALE_PORT })

    expect(await askRefused(journey.journeyId)).toBe(true)
  })

  it('Should refuse a notification whose copied address breaks the address-book rules', async () => {
    const { postcode: _dropped, ...withoutPostcode } = VALID_COPY.address
    const journey = await seedAnd(
      fullyAnswered({
        consignor: { ...VALID_COPY, address: withoutPostcode }
      })
    )

    expect(await askRefused(journey.journeyId)).toBe(true)
  })

  it('Should refuse a notification whose copied contact address breaks the rules', async () => {
    const journey = await seedAnd(
      fullyAnswered({
        contactAddress: { ...VALID_COPY, email: 'not-an-email' }
      })
    )

    expect(await askRefused(journey.journeyId)).toBe(true)
  })

  it('Should not refuse a notification whose answers all pass', async () => {
    const journey = await seedAnd(fullyAnswered())

    expect(await askRefused(journey.journeyId)).toBe(false)
  })

  it('Should refuse a notification whose stored document is still being scanned', async () => {
    // Stub scanStatus maps filename → status when the uploadId has not been
    // seen by upload(); "never-scans" stays PENDING on non-refresh reads.
    const journey = await seedAnd(
      fullyAnswered({
        documents: [doc({ filename: 'notes-never-scans.pdf' })]
      })
    )

    expect(await askRefused(journey.journeyId)).toBe(true)
  })

  it('Should refuse a notification whose stored document was rejected by the scan', async () => {
    const journey = await seedAnd(
      fullyAnswered({
        documents: [doc({ filename: 'virus-alert.pdf' })]
      })
    )

    expect(await askRefused(journey.journeyId)).toBe(true)
  })

  it('Should not refuse a notification whose stored documents have all completed scanning', async () => {
    const journey = await seedAnd(
      fullyAnswered({
        documents: [doc({ filename: 'clean.pdf' })]
      })
    )

    expect(await askRefused(journey.journeyId)).toBe(false)
  })
})

describe('#documentsRejectedCardErrors', () => {
  it('Should return no errors when no documents are stored', async () => {
    expect(await documentsRejectedCardErrors({})).toEqual({})
  })

  it('Should return no errors when every stored document has completed scanning', async () => {
    expect(
      await documentsRejectedCardErrors({
        documents: [doc({ filename: 'clean.pdf' })]
      })
    ).toEqual({})
  })

  it('Should not surface a PENDING scan — a mid-upload is not a permanent problem', async () => {
    expect(
      await documentsRejectedCardErrors({
        documents: [doc({ filename: 'notes-never-scans.pdf' })]
      })
    ).toEqual({})
  })

  it('Should surface a REJECTED scan on the read path', async () => {
    expect(
      await documentsRejectedCardErrors({
        documents: [doc({ filename: 'virus-alert.pdf' })]
      })
    ).toEqual({ documents: documentsEn.errors.someRejected })
  })
})
