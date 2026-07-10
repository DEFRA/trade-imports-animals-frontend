import { beforeAll, describe, expect, it } from 'vitest'
import { records } from './real.js'
import { IN_PROGRESS, SUBMITTED } from '../../../engine/persistence/records.js'

// Gated backend integration test for the REAL records adapter (S3c).
//
// Skips entirely unless RECORDS_REAL_IT is set, so the default hermetic
// `npm run test:live-animals` run adds ZERO running tests here. Run it only
// against a live stack backend (the adapter itself reads
// TRADE_IMPORTS_ANIMALS_BACKEND_URL, default http://localhost:8085):
//
//   RECORDS_REAL_IT=1 npm run test:live-animals -- real.integration
//
// There is no records.clear() against a real Mongo, so every case mints its
// own journey and derives unique userIds from a per-run prefix.

const backendBaseUrl =
  process.env.TRADE_IMPORTS_ANIMALS_BACKEND_URL ?? 'http://localhost:8085'

const runPrefix = `it-${Date.now()}`
let seq = 0
const uniqueUserId = () => `${runPrefix}-${seq++}`

const REF_PATTERN = /^GBN-AG-\d{2}-[A-Z0-9]{6}$/

describe.skipIf(!process.env.RECORDS_REAL_IT)(
  'real records adapter over the live backend + Mongo',
  () => {
    beforeAll(async () => {
      try {
        await fetch(`${backendBaseUrl}/notifications?sort=updated,desc`, {
          method: 'GET'
        })
      } catch (cause) {
        throw new Error(
          `Backend not reachable at ${backendBaseUrl} — start the stack ` +
            `(tim docker up) before running the gated records integration test.`,
          { cause }
        )
      }
    })

    it('Should mint a reference on create and load it back with no answers', async () => {
      const created = await records.create({ userId: uniqueUserId() })

      expect(created.journeyId).toMatch(REF_PATTERN)
      expect(created.status).toBe(IN_PROGRESS)
      expect(created.submittedAt).toBeNull()

      const loaded = await records.load({ journeyId: created.journeyId })
      expect(loaded.journeyId).toBe(created.journeyId)
      expect(loaded.status).toBe(IN_PROGRESS)
      // A freshly-minted notification carries no obligation answers; the mapper
      // only round-trips its server-minted referenceNumber back into answers.
      expect(loaded.answers.countryOfOrigin).toBeUndefined()
      expect(loaded.answers.commodityLines).toBeUndefined()
    })

    it('Should persist a saveAnswers write-through and re-read the mapped subset', async () => {
      const { journeyId } = await records.create({ userId: uniqueUserId() })

      const answers = {
        countryOfOrigin: 'FR',
        placeOfOrigin: {
          name: 'Origin Farm',
          address: {
            addressLine1: '1 Field Road',
            city: 'Lyon',
            country: 'FR'
          }
        },
        arrivalDateAtPort: { day: 14, month: 3, year: 2026 },
        commodityLines: [
          {
            commoditySelection: 'live-bovine',
            typeSelection: 'breeding',
            speciesSelection: ['Cattle'],
            numberOfPackages: 3,
            numberOfAnimalsQuantity: 5,
            animalIdentifiers: [
              {
                animalIdentifierEarTag: 'UK123456700001',
                animalIdentifierPassport: 'PP-001'
              }
            ]
          }
        ]
      }

      await records.saveAnswers(journeyId, answers)
      const loaded = await records.load({ journeyId })

      // Mapped subset only — the gap fields (extra animalIdentifiers beyond
      // earTag/passport, Tier-B keys) are known-lossy against the real backend
      // (Mapper A) and are deliberately not asserted here.
      expect(loaded.answers.countryOfOrigin).toBe('FR')
      expect(loaded.answers.placeOfOrigin).toEqual(answers.placeOfOrigin)
      expect(loaded.answers.arrivalDateAtPort).toEqual({
        day: 14,
        month: 3,
        year: 2026
      })
      expect(loaded.answers.commodityLines).toEqual([
        {
          commoditySelection: 'live-bovine',
          typeSelection: 'breeding',
          speciesSelection: ['Cattle'],
          numberOfPackages: 3,
          numberOfAnimalsQuantity: 5,
          animalIdentifiers: [
            {
              animalIdentifierEarTag: 'UK123456700001',
              animalIdentifierPassport: 'PP-001'
            }
          ]
        }
      ])
    })

    it('Should full-replace on a second saveAnswers so dropped keys are gone', async () => {
      const { journeyId } = await records.create({ userId: uniqueUserId() })

      await records.saveAnswers(journeyId, {
        countryOfOrigin: 'FR',
        internalReferenceNumber: 'Imports456GB'
      })
      expect((await records.load({ journeyId })).answers).toMatchObject({
        countryOfOrigin: 'FR',
        internalReferenceNumber: 'Imports456GB'
      })

      await records.saveAnswers(journeyId, { countryOfOrigin: 'DE' })
      const reloaded = await records.load({ journeyId })

      expect(reloaded.answers.countryOfOrigin).toBe('DE')
      // Present in the first write, absent in the second — the whole-map re-POST
      // + backend full-replace must have cleared it.
      expect(reloaded.answers.internalReferenceNumber).toBeUndefined()
    })

    it('Should freeze after finalise so a later saveAnswers throws', async () => {
      const { journeyId } = await records.create({ userId: uniqueUserId() })
      await records.saveAnswers(journeyId, { countryOfOrigin: 'FR' })

      const finalised = await records.finalise(journeyId)
      expect(finalised.status).toBe(SUBMITTED)
      expect((await records.load({ journeyId })).status).toBe(SUBMITTED)

      await expect(
        records.saveAnswers(journeyId, { countryOfOrigin: 'DE' })
      ).rejects.toThrow(/is submitted — writes blocked/)
    })

    it('Should return undefined and has=false for an unknown reference', async () => {
      expect(
        await records.load({ journeyId: 'GBN-AG-99-ZZZZZZ' })
      ).toBeUndefined()
      expect(await records.has('GBN-AG-99-ZZZZZZ')).toBe(false)
    })
  }
)
