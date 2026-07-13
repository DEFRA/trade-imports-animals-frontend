import { beforeAll, describe, expect, it } from 'vitest'
import { records } from './real.js'
import { IN_PROGRESS, SUBMITTED } from '../../../engine/persistence/records.js'
import { runsIt } from '../it-mode.js'

// Gated backend integration test for the REAL records adapter (S3c).
//
// The adapter is wired to Mapper B (answersToTargetNotification /
// targetNotificationToAnswers). Mapper B is a superset of Mapper A on the
// backend-storable set, so the storable answers below (species earTag/passport,
// the collapsed transporter object, the party addresses) must round-trip
// through the real backend; its Stage-2 extras (regionCode, purpose, the split
// transport fields, per-animal identifiers beyond earTag/passport, documents)
// have no backend home yet and are expected to drop.
//
// Runs under LIVE_ANIMALS_IT=real (or =all); the default (stubs/unset)
// skips it, so the default hermetic `npm run test:live-animals` run adds
// ZERO running tests here. Run it only against a live stack backend (the
// adapter itself reads TRADE_IMPORTS_ANIMALS_BACKEND_URL, default
// http://localhost:8085):
//
//   LIVE_ANIMALS_IT=real npm run test:live-animals -- real.integration
//
// There is no records.clear() against a real Mongo, so every case mints its
// own journey and derives unique userIds from a per-run prefix.

const backendBaseUrl =
  process.env.TRADE_IMPORTS_ANIMALS_BACKEND_URL ?? 'http://localhost:8085'

const runPrefix = `it-${Date.now()}`
let seq = 0
const uniqueUserId = () => `${runPrefix}-${seq++}`

const REF_PATTERN = /^GBN-AG-\d{2}-[A-Z0-9]{6}$/

describe.skipIf(!runsIt('real'))(
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

    it('Should persist the Mapper B storable set write-through and re-read it', async () => {
      const { journeyId } = await records.create({ userId: uniqueUserId() })

      const answers = {
        countryOfOrigin: 'FR',
        // Stage-2 extra: origin.regionCode has no backend home.
        regionOfOriginCode: 'FR-75',
        placeOfOrigin: {
          name: 'Origin Farm',
          address: {
            addressLine1: '1 Field Road',
            city: 'Lyon',
            country: 'FR'
          }
        },
        arrivalDateAtPort: { day: 14, month: 3, year: 2026 },
        transporterType: 'Commercial transporter',
        commercialTransporter: {
          name: 'Transporter Co',
          approvalNumber: 'UK/NEWCA/T1/00090953',
          address: {
            addressLine1: '7 Route One',
            city: 'Dover',
            country: 'GB'
          }
        },
        // Stage-2 extra: purpose has no backend home.
        purposeInInternalMarket: 'Breeding',
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
                animalIdentifierPassport: 'PP-001',
                // Stage-2 extra: identifiers beyond earTag/passport have no home.
                animalIdentifierTattoo: 'AB1234'
              }
            ]
          }
        ]
      }

      await records.saveAnswers(journeyId, answers)
      const loaded = await records.load({ journeyId })

      // Storable set survives the real backend.
      expect(loaded.answers.countryOfOrigin).toBe('FR')
      expect(loaded.answers.placeOfOrigin).toEqual(answers.placeOfOrigin)
      expect(loaded.answers.arrivalDateAtPort).toEqual({
        day: 14,
        month: 3,
        year: 2026
      })
      // The collapsed Transporter (name/address/approvalNumber/type) round-trips.
      expect(loaded.answers.transporterType).toBe('Commercial transporter')
      expect(loaded.answers.commercialTransporter).toEqual(
        answers.commercialTransporter
      )
      // commodityCode drops, so commoditySelection is recovered from the
      // commodity name; species earTag/passport survive on the species entry.
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

      // Stage-2 extras have no backend home yet and drop (documenting the gap).
      expect(loaded.answers.regionOfOriginCode).toBeUndefined()
      expect(loaded.answers.purposeInInternalMarket).toBeUndefined()
      expect(
        loaded.answers.commodityLines[0].animalIdentifiers[0]
          .animalIdentifierTattoo
      ).toBeUndefined()
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
