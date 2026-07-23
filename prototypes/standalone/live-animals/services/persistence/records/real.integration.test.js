import { beforeAll, describe, expect, it } from 'vitest'
import { records } from './real.js'
import { IN_PROGRESS, SUBMITTED } from '../../../engine/persistence/records.js'
import { runsIt } from '../it-mode.js'
import { assembleFulfilments } from '../../../bridge/assemble-fulfilments.js'
import { projectAnswers } from '../../../bridge/fulfilments.js'

// Gated backend integration test for the REAL records adapter (S3c).
//
// The adapter defaults to Mapper A (skeleton-exact, storable-only:
// answersToNotification / notificationToAnswers). Mapper A maps
// only the backend-storable set, so the storable answers below (species
// earTag/passport, the collapsed transporter object, the party addresses) must
// round-trip through the real backend; the Stage-2 extras (regionCode, purpose,
// the split transport fields, per-animal identifiers beyond earTag/passport,
// documents) are never mapped by Mapper A and are expected to drop.
//
// Runs under LIVE_ANIMALS_IT=real (or =all); the default (stubs/unset)
// skips it, so the default hermetic `npm run test:live-animals` run adds
// ZERO running tests here. Run it only against a live stack backend (the
// adapter itself reads TRADE_IMPORTS_ANIMALS_BACKEND_URL, default
// http://localhost:8085):
//
//   LIVE_ANIMALS_IT=real npm run test:live-animals -- real.integration
//
// The Mapper B case additionally requires the branch's extended backend (a
// dev-mode stack build with the additive extras fields), not the :latest image.
//
// There is no records.clear() against a real Mongo, so every case mints its
// own journey and derives unique userIds from a per-run prefix.

const backendBaseUrl =
  process.env.TRADE_IMPORTS_ANIMALS_BACKEND_URL ?? 'http://localhost:8085'

const runPrefix = `it-${Date.now()}`
let seq = 0
const uniqueUserId = () => `${runPrefix}-${seq++}`
const replaceAnswers = (journeyId, answers) =>
  records.replaceFulfilment(journeyId, assembleFulfilments(answers))
const answersOf = (journey) => projectAnswers(journey.fulfilment)

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
      expect(answersOf(loaded).countryOfOrigin).toBeUndefined()
      expect(answersOf(loaded).commodityLines).toBeUndefined()
    })

    it('Should persist the Mapper A storable set write-through and re-read it', async () => {
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
        // Stage-2 extra: purpose has no backend home.
        purposeInInternalMarket: 'Breeding',
        commodityLines: [
          {
            commoditySelection: 'live-bovine',
            typeSelection: 'breeding',
            speciesSelection: ['Cattle'],
            numberOfPackages: '3',
            numberOfAnimalsQuantity: '5',
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

      await replaceAnswers(journeyId, answers)
      const loaded = await records.load({ journeyId })

      // Storable set survives the real backend.
      expect(answersOf(loaded).countryOfOrigin).toBe('FR')
      expect(answersOf(loaded).placeOfOrigin).toEqual(answers.placeOfOrigin)
      expect(answersOf(loaded).arrivalDateAtPort).toEqual({
        day: 14,
        month: 3,
        year: 2026
      })
      // The collapsed Transporter (name/address/approvalNumber/type) round-trips.
      expect(answersOf(loaded).transporterType).toBe('Commercial')
      expect(answersOf(loaded).commercialTransporter).toEqual(
        answers.commercialTransporter
      )
      // commodityCode drops, so commoditySelection is recovered from the
      // commodity name; species earTag/passport survive on the species entry.
      expect(answersOf(loaded).commodityLines).toEqual([
        {
          commoditySelection: 'live-bovine',
          typeSelection: 'breeding',
          speciesSelection: ['Cattle'],
          numberOfPackages: '3',
          numberOfAnimalsQuantity: '5',
          animalIdentifiers: [
            {
              animalIdentifierEarTag: 'UK123456700001',
              animalIdentifierPassport: 'PP-001'
            }
          ]
        }
      ])

      // Stage-2 extras have no backend home yet and drop (documenting the gap).
      expect(answersOf(loaded).regionOfOriginCode).toBeUndefined()
      expect(answersOf(loaded).purposeInInternalMarket).toBeUndefined()
      expect(
        answersOf(loaded).commodityLines[0].animalIdentifiers[0]
          .animalIdentifierTattoo
      ).toBeUndefined()
    })

    it('Should full-replace on a second canonical save so dropped keys are gone', async () => {
      const { journeyId } = await records.create({ userId: uniqueUserId() })

      await replaceAnswers(journeyId, {
        countryOfOrigin: 'FR',
        internalReferenceNumber: 'Imports456GB'
      })
      expect(answersOf(await records.load({ journeyId }))).toMatchObject({
        countryOfOrigin: 'FR',
        internalReferenceNumber: 'Imports456GB'
      })

      await replaceAnswers(journeyId, { countryOfOrigin: 'DE' })
      const reloaded = await records.load({ journeyId })

      expect(answersOf(reloaded).countryOfOrigin).toBe('DE')
      // Present in the first write, absent in the second — the whole-map re-POST
      // + backend full-replace must have cleared it.
      expect(answersOf(reloaded).internalReferenceNumber).toBeUndefined()
    })

    it('Should freeze after finalise so a later canonical save throws', async () => {
      const { journeyId } = await records.create({ userId: uniqueUserId() })
      await replaceAnswers(journeyId, { countryOfOrigin: 'FR' })

      const finalised = await records.finalise(journeyId)
      expect(finalised.status).toBe(SUBMITTED)
      expect((await records.load({ journeyId })).status).toBe(SUBMITTED)

      await expect(
        replaceAnswers(journeyId, { countryOfOrigin: 'DE' })
      ).rejects.toThrow(/is submitted — writes blocked/)
    })

    it('Should return undefined and has=false for an unknown reference', async () => {
      expect(
        await records.load({ journeyId: 'GBN-AG-99-ZZZZZZ' })
      ).toBeUndefined()
      expect(await records.has('GBN-AG-99-ZZZZZZ')).toBe(false)
    })

    it('Should persist the Mapper B extras through the extended backend and re-read them', async () => {
      // The mapper selector reads LIVE_ANIMALS_MAPPER at call time, so opt
      // into Mapper B for this case only and restore the default afterwards —
      // the other cases must keep running under Mapper A.
      const previousMapper = process.env.LIVE_ANIMALS_MAPPER
      process.env.LIVE_ANIMALS_MAPPER = 'b'
      try {
        const { journeyId } = await records.create({ userId: uniqueUserId() })

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
              accompanyingDocumentDateOfIssue: '2025-12-12'
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

        await replaceAnswers(journeyId, answers)
        const loaded = await records.load({ journeyId })

        // The extras have backend homes on the extended backend and survive.
        expect(answersOf(loaded).regionOfOriginCode).toBe('FR-75')
        expect(answersOf(loaded).purposeInInternalMarket).toBe('breeding')
        expect(answersOf(loaded).meansOfTransport).toBe('ROAD_VEHICLE')
        expect(answersOf(loaded).transportIdentification).toBe('FR-892-LK')
        expect(answersOf(loaded).transportDocumentReference).toBe(
          'CMR-2026-884721'
        )
        expect(answersOf(loaded).transitedCountries).toEqual(['FR', 'BE'])
        expect(answersOf(loaded).documents).toEqual(answers.documents)
        // The full identifier unit round-trips, including the fields Mapper A
        // drops (tattoo, horseName, identificationDetails, description).
        expect(answersOf(loaded).commodityLines[0].animalIdentifiers).toEqual(
          answers.commodityLines[0].animalIdentifiers
        )
        // commodityCode ('0102') now persists, so commoditySelection is
        // recovered from the code, not just the commodity name.
        expect(answersOf(loaded).commodityLines[0].commoditySelection).toBe(
          'Cow'
        )
      } finally {
        if (previousMapper === undefined) {
          delete process.env.LIVE_ANIMALS_MAPPER
        } else {
          process.env.LIVE_ANIMALS_MAPPER = previousMapper
        }
      }
    })
  }
)
