import { SET_ID } from '../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../flow/dispatch.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from '../../../../../../engine/read.js'
import {
  expectOneRefusalLogged,
  journeyRequest,
  stubH
} from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import { AMEND, DRAFT } from '../../../../../../engine/index.js'
import { copy as documentsEn } from '../documents/copy/copy.en.js'
import { copy as reviewEn } from './copy/copy.en.js'
import {
  documentScanCardErrors,
  isReviewRefused,
  speciesCardErrors
} from './refusal.js'

const LISTED_SPECIES_LINE = {
  commodityCode: '0102',
  speciesLatinName: 'Bos taurus'
}
const UNLISTED_SPECIES_LINE = {
  commodityCode: '0102',
  speciesLatinName: 'Bos spp.'
}
const SPECIES_LISTED_UNDER_ANOTHER_CODE_LINE = {
  commodityCode: '0102',
  speciesLatinName: 'Felis catus'
}

const PENDING_FILENAME = 'notes-never-scans.pdf'
const REJECTED_FILENAME = 'virus-alert.pdf'
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

const askRefusedAndReadLog = async (journeyId) => {
  const request = journeyRequest(journeyId)
  return {
    refused: await isReviewRefused(request, stubH()),
    logger: request.logger
  }
}

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
    const journey = await seedAnd(
      fullyAnswered({
        documents: [doc({ filename: PENDING_FILENAME })]
      })
    )

    expect(await askRefused(journey.journeyId)).toBe(true)
  })

  it('Should refuse a notification whose stored document was rejected by the scan', async () => {
    const journey = await seedAnd(
      fullyAnswered({
        documents: [doc({ filename: REJECTED_FILENAME })]
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

  it('Should refuse a draft holding a species not listed under its code', async () => {
    const journey = await seedAnd(
      fullyAnswered({ commodityLines: [UNLISTED_SPECIES_LINE] })
    )

    expect(await askRefused(journey.journeyId)).toBe(true)
  })

  it('Should not refuse a draft whose species is still listed under its code', async () => {
    const journey = await seedAnd(
      fullyAnswered({ commodityLines: [LISTED_SPECIES_LINE] })
    )

    expect(await askRefused(journey.journeyId)).toBe(false)
  })

  it('Should log the refusal once at warn with the journey id and each unlisted code and Latin name', async () => {
    const journey = await seedAnd(
      fullyAnswered({
        commodityLines: [
          LISTED_SPECIES_LINE,
          UNLISTED_SPECIES_LINE,
          SPECIES_LISTED_UNDER_ANOTHER_CODE_LINE
        ]
      })
    )
    const { refused, logger } = await askRefusedAndReadLog(journey.journeyId)

    expect(refused).toBe(true)
    expectOneRefusalLogged(logger, {
      journeyId: journey.journeyId,
      errorCodes: [],
      level: 'warn',
      reason: 'unlisted-species',
      unlisted: [
        { code: '0102', latinName: 'Bos spp.' },
        { code: '0102', latinName: 'Felis catus' }
      ]
    })
  })

  it('Should log nothing when every species is still listed', async () => {
    const journey = await seedAnd(
      fullyAnswered({ commodityLines: [LISTED_SPECIES_LINE] })
    )
    const { refused, logger } = await askRefusedAndReadLog(journey.journeyId)

    expect(refused).toBe(false)
    expect(logger.entries).toEqual([])
  })
})

describe('#speciesCardErrors', () => {
  const unlistedDraft = {
    status: DRAFT,
    commodityLines: [
      LISTED_SPECIES_LINE,
      UNLISTED_SPECIES_LINE,
      SPECIES_LISTED_UNDER_ANOTHER_CODE_LINE
    ]
  }

  it('Should name every species of a draft that reference data no longer lists under its code, with its code, when Continue was refused', async () => {
    expect(
      await speciesCardErrors(
        { status: unlistedDraft.status },
        { commodityLines: unlistedDraft.commodityLines },
        { refused: true }
      )
    ).toEqual({
      species: reviewEn.errors.species.notListed(
        'Bos spp. (0102), Felis catus (0102)'
      )
    })
  })

  it('Should return no species error until Continue is refused', async () => {
    expect(
      await speciesCardErrors(
        { status: unlistedDraft.status },
        { commodityLines: unlistedDraft.commodityLines }
      )
    ).toEqual({})
  })

  it('Should return no species error for an amendment holding an unlisted species', async () => {
    expect(
      await speciesCardErrors(
        { status: AMEND },
        { commodityLines: [UNLISTED_SPECIES_LINE] },
        { refused: true }
      )
    ).toEqual({})
  })

  it('Should return no species error for a line with no species', async () => {
    expect(
      await speciesCardErrors(
        { status: DRAFT },
        { commodityLines: [{ commodityCode: '0102' }] },
        { refused: true }
      )
    ).toEqual({})
  })
})

describe('#documentScanCardErrors', () => {
  const request = journeyRequest('journey-1')

  it('Should return no errors when no documents are stored', async () => {
    expect(await documentScanCardErrors(request, {})).toEqual({})
  })

  it('Should return no errors when every stored document has completed scanning', async () => {
    expect(
      await documentScanCardErrors(request, {
        documents: [doc({ filename: 'clean.pdf' })]
      })
    ).toEqual({})
  })

  it('Should name a document still being scanned', async () => {
    expect(
      await documentScanCardErrors(request, {
        documents: [doc({ filename: PENDING_FILENAME })]
      })
    ).toEqual({ documents: documentsEn.errors.someStillScanning })
  })

  it('Should not name a document still being scanned when pending is excluded', async () => {
    expect(
      await documentScanCardErrors(
        request,
        { documents: [doc({ filename: PENDING_FILENAME })] },
        { includePending: false }
      )
    ).toEqual({})
  })

  it('Should name a REJECTED scan ahead of one still scanning', async () => {
    expect(
      await documentScanCardErrors(request, {
        documents: [
          doc({ filename: PENDING_FILENAME }),
          doc({ uploadId: 'upload-2', filename: REJECTED_FILENAME })
        ]
      })
    ).toEqual({ documents: documentsEn.errors.someRejected })
  })
})
