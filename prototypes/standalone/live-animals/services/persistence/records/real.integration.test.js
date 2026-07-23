import { beforeAll, describe, expect, it } from 'vitest'
import { records } from './real.js'
import { IN_PROGRESS, SUBMITTED } from '../../../engine/persistence/records.js'
import { runsIt } from '../it-mode.js'
import { assembleFulfilments } from '../../../bridge/assemble-fulfilments.js'
import { projectAnswers } from '../../../bridge/fulfilments.js'
import { encodeEvaluatorFulfilments } from './fulfilment-codec.js'
import {
  answersToTargetNotification,
  fulfilmentToNotification
} from './mapper.js'

// Gated integration test for the option-e REAL adapter and its three backend
// resources. The default hermetic run skips it. Run against the matching
// backend worktree with:
//
//   LIVE_ANIMALS_IT=real npm run test:live-animals -- real.integration

const backendBaseUrl =
  process.env.TRADE_IMPORTS_ANIMALS_BACKEND_URL ?? 'http://localhost:8085'
const fulfilmentsUrl = `${backendBaseUrl}/fulfilments`
const notificationsUrl = `${backendBaseUrl}/notifications`
const proposedNotificationsUrl = `${backendBaseUrl}/proposed-notifications`

const replaceAnswers = (journeyId, answers) =>
  records.replaceFulfilment(journeyId, assembleFulfilments(answers))
const answersOf = (journey) => projectAnswers(journey.fulfilment)
const json = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status}`)
  }
  return response.json()
}

const REF_PATTERN = /^GBN-AG-\d{2}-[A-Z0-9]{6}$/

const answers = {
  countryOfOrigin: 'FR',
  regionOfOriginCode: 'FR-75',
  purposeInInternalMarket: 'breeding',
  meansOfTransport: 'ROAD_VEHICLE',
  transportIdentification: 'FR-892-LK',
  transportDocumentReference: 'CMR-2026-884721',
  transitedCountries: ['FR', 'BE'],
  transporterType: 'Commercial',
  commercialTransporter: {
    name: 'Transporter Co',
    approvalNumber: 'UK/NEWCA/T1/00090953',
    address: {
      addressLine1: '7 Route One',
      city: 'Dover',
      country: 'GB'
    }
  },
  documents: [
    {
      accompanyingDocumentType: 'ITAHC',
      accompanyingDocumentAttachmentType: 'PDF',
      accompanyingDocumentReference: 'GBHC1234567890',
      accompanyingDocumentDateOfIssue: '2025-12-12',
      uploadId: 'upload-1',
      filename: 'certificate.pdf'
    }
  ],
  commodityLines: [
    {
      commoditySelection: 'Cow',
      commodityType: '16',
      speciesSelection: ['1148346'],
      numberOfPackages: '3',
      numberOfAnimalsQuantity: '5',
      animalIdentifiers: [
        {
          animalIdentifierEarTag: 'UK123456700001',
          animalIdentifierPassport: 'PP-001',
          animalIdentifierTattoo: 'AB1234',
          horseName: 'Dobbin',
          animalIdentifierIdentificationDetails: 'Chip 981000012345678',
          animalIdentifierDescription: 'Brown cow'
        }
      ]
    }
  ]
}

describe.skipIf(!runsIt('real'))(
  'real records adapter over the live option-e backend',
  () => {
    beforeAll(async () => {
      try {
        await fetch(`${fulfilmentsUrl}/GBN-AG-99-ZZZZZZ`)
      } catch (cause) {
        throw new Error(
          `Backend not reachable at ${backendBaseUrl} — start the matching stack before running this integration test.`,
          { cause }
        )
      }
    })

    it('Should mint an empty canonical journey and load it directly', async () => {
      const created = await records.create()

      expect(created.journeyId).toMatch(REF_PATTERN)
      expect(created.status).toBe(IN_PROGRESS)
      expect(created.submittedAt).toBeNull()
      expect(created.fulfilment).toEqual({})

      const loaded = await records.load({ journeyId: created.journeyId })
      expect(loaded).toEqual({ ...created, userId: null })
    })

    it('Should round-trip canonical fulfilment and store both projections from it', async () => {
      const { journeyId } = await records.create()
      const snapshot = assembleFulfilments(answers)

      const saved = await records.replaceFulfilment(journeyId, snapshot)
      const loaded = await records.load({ journeyId })
      const [canonical, current, proposed] = await Promise.all([
        json(`${fulfilmentsUrl}/${journeyId}`),
        json(`${notificationsUrl}/${journeyId}`),
        json(`${proposedNotificationsUrl}/${journeyId}`)
      ])

      expect(saved.fulfilment).toEqual(snapshot)
      expect(loaded.fulfilment).toEqual(snapshot)
      expect(canonical).toMatchObject({
        id: journeyId,
        fulfilment: encodeEvaluatorFulfilments(snapshot)
      })
      expect(current).toMatchObject(
        fulfilmentToNotification(snapshot, journeyId)
      )
      expect(proposed).toEqual(answersToTargetNotification(snapshot, journeyId))
      expect(answersOf(loaded).documents).toEqual(answers.documents)
      expect(answersOf(loaded).commodityLines[0].animalIdentifiers).toEqual(
        answers.commodityLines[0].animalIdentifiers
      )
    })

    it('Should whole-replace the canonical snapshot so removed values stay removed', async () => {
      const { journeyId } = await records.create()

      await replaceAnswers(journeyId, {
        countryOfOrigin: 'FR',
        internalReferenceNumber: 'Imports456GB'
      })
      await replaceAnswers(journeyId, { countryOfOrigin: 'DE' })

      const loaded = await records.load({ journeyId })
      expect(answersOf(loaded).countryOfOrigin).toBe('DE')
      expect(answersOf(loaded).internalReferenceNumber).toBeUndefined()
    })

    it('Should submit and amend through the canonical lifecycle', async () => {
      const { journeyId } = await records.create()
      await replaceAnswers(journeyId, { countryOfOrigin: 'FR' })

      expect((await records.finalise(journeyId)).status).toBe(SUBMITTED)
      expect((await records.load({ journeyId })).status).toBe(SUBMITTED)
      await expect(
        replaceAnswers(journeyId, { countryOfOrigin: 'DE' })
      ).rejects.toThrow(/is submitted — writes blocked/)

      const amended = await records.amend(journeyId)
      expect(amended.status).toBe(IN_PROGRESS)
      expect(amended.submittedAt).toBeNull()
      await expect(
        replaceAnswers(journeyId, { countryOfOrigin: 'DE' })
      ).resolves.toMatchObject({ status: IN_PROGRESS })
    })

    it('Should return undefined and has=false for an unknown exact id', async () => {
      expect(
        await records.load({ journeyId: 'GBN-AG-99-ZZZZZZ' })
      ).toBeUndefined()
      expect(await records.has('GBN-AG-99-ZZZZZZ')).toBe(false)
    })
  }
)
