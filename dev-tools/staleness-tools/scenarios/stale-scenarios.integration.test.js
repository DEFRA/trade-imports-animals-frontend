import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MongoClient } from 'mongodb'
import { GenericContainer } from 'testcontainers'

import { assembleFulfilments } from '../../../src/server/app/bridge/assemble-fulfilments.js'
import { obligations } from '../../../src/server/app/sets/live-animals/obligations/index.js'
import {
  CONTACT_PARTY,
  PARTIES
} from '../../../src/server/app/sets/live-animals/journeys/linear/features/addresses/parties.js'
import { runsIt } from '../../../src/server/app/services/persistence/it-mode.js'
import { countryStale } from './country-stale.js'
import { partyDeleted } from './party-deleted.js'
import { unknownObligation } from './unknown-obligation.js'

const REFERENCE_NUMBER = 'GBN-AG-26-SMOKE1'
const MONGO_PORT = 27017
const CONTAINER_START_TIMEOUT_MS = 120_000

const idOf = (name) => obligations.find((o) => o.name === name).id

const fulfilmentsForAnswers = (answers) =>
  Object.entries(assembleFulfilments(answers)).map(([obligationId, value]) => ({
    obligationId,
    value
  }))

// Not gated — no Docker needed. `party-deleted.js` throws the same drift
// at runtime; this fires it on main CI so the drift is spotted before
// anyone runs the tool.
describe('#partyDeleted — data source integrity', () => {
  it('Should resolve every role name in PARTIES + CONTACT_PARTY to an obligation', () => {
    const names = [...PARTIES.map((p) => p.id), CONTACT_PARTY.id]
    for (const name of names) {
      expect(obligations.find((o) => o.name === name)).toBeTruthy()
    }
  })
})

describe.skipIf(!runsIt('testcontainer'))(
  '#staleness scenarios — smoke against a real Mongo',
  () => {
    let container
    let client
    let notifications

    beforeAll(async () => {
      container = await new GenericContainer('mongo:7.0')
        .withExposedPorts(MONGO_PORT)
        .start()
      const uri = `mongodb://${container.getHost()}:${container.getMappedPort(MONGO_PORT)}`
      client = new MongoClient(uri)
      await client.connect()
      notifications = client
        .db('trade-imports-animals-backend')
        .collection('notifications')
    }, CONTAINER_START_TIMEOUT_MS)

    afterAll(async () => {
      await client?.close()
      await container?.stop()
    })

    describe('#countryStale', () => {
      beforeEach(async () => {
        await notifications.deleteMany({})
        await notifications.insertOne({
          referenceNumber: REFERENCE_NUMBER,
          fulfilments: fulfilmentsForAnswers({ countryOfOrigin: 'FR' })
        })
      })

      it('Should leave the countryOfOrigin fulfilment holding the sentinel value', async () => {
        await countryStale.mutate(notifications, REFERENCE_NUMBER)
        const doc = await notifications.findOne({
          referenceNumber: REFERENCE_NUMBER
        })
        expect(doc.fulfilments.find((f) => f.value === 'ZZ')).toBeTruthy()
      })

      it('Should leave other fulfilments untouched', async () => {
        await notifications.updateOne(
          { referenceNumber: REFERENCE_NUMBER },
          {
            $push: {
              fulfilments: {
                obligationId: 'unrelated-obligation',
                value: 'keep-me'
              }
            }
          }
        )
        await countryStale.mutate(notifications, REFERENCE_NUMBER)
        const doc = await notifications.findOne({
          referenceNumber: REFERENCE_NUMBER
        })
        const unrelated = doc.fulfilments.find(
          (f) => f.obligationId === 'unrelated-obligation'
        )
        expect(unrelated?.value).toBe('keep-me')
      })

      it('Should be idempotent — a second run leaves the same terminal state', async () => {
        await countryStale.mutate(notifications, REFERENCE_NUMBER)
        const after1 = await notifications.findOne({
          referenceNumber: REFERENCE_NUMBER
        })
        await countryStale.mutate(notifications, REFERENCE_NUMBER)
        const after2 = await notifications.findOne({
          referenceNumber: REFERENCE_NUMBER
        })
        expect(after2.fulfilments).toEqual(after1.fulfilments)
      })
    })

    describe('#partyDeleted', () => {
      beforeEach(async () => {
        await notifications.deleteMany({})
        await notifications.insertOne({
          referenceNumber: REFERENCE_NUMBER,
          fulfilments: [
            { obligationId: idOf('consignor'), value: { addressId: 'real-1' } },
            {
              obligationId: idOf('contactAddress'),
              value: { addressId: 'real-2' }
            }
          ]
        })
      })

      it('Should leave every party fulfilment pointing at the ghost id', async () => {
        await partyDeleted.mutate(notifications, REFERENCE_NUMBER)
        const doc = await notifications.findOne({
          referenceNumber: REFERENCE_NUMBER
        })
        for (const fulfilment of doc.fulfilments) {
          expect(fulfilment.value.addressId).toBe(
            'eudpa-573-ghost-address-abcdef'
          )
        }
      })

      it('Should leave non-party fulfilments untouched', async () => {
        await notifications.updateOne(
          { referenceNumber: REFERENCE_NUMBER },
          {
            $push: {
              fulfilments: {
                obligationId: 'unrelated-obligation',
                value: 'keep-me'
              }
            }
          }
        )
        await partyDeleted.mutate(notifications, REFERENCE_NUMBER)
        const doc = await notifications.findOne({
          referenceNumber: REFERENCE_NUMBER
        })
        const unrelated = doc.fulfilments.find(
          (f) => f.obligationId === 'unrelated-obligation'
        )
        expect(unrelated?.value).toBe('keep-me')
      })

      it('Should be idempotent — a second run leaves the same terminal state', async () => {
        await partyDeleted.mutate(notifications, REFERENCE_NUMBER)
        const after1 = await notifications.findOne({
          referenceNumber: REFERENCE_NUMBER
        })
        await partyDeleted.mutate(notifications, REFERENCE_NUMBER)
        const after2 = await notifications.findOne({
          referenceNumber: REFERENCE_NUMBER
        })
        expect(after2.fulfilments).toEqual(after1.fulfilments)
      })
    })

    describe('#unknownObligation', () => {
      beforeEach(async () => {
        await notifications.deleteMany({})
        await notifications.insertOne({
          referenceNumber: REFERENCE_NUMBER,
          fulfilments: [
            { obligationId: 'real-obligation', value: 'real-value' }
          ]
        })
      })

      it('Should append the ghost fulfilment to the doc', async () => {
        await unknownObligation.mutate(notifications, REFERENCE_NUMBER)
        const doc = await notifications.findOne({
          referenceNumber: REFERENCE_NUMBER
        })
        const ghost = doc.fulfilments.find((f) =>
          f.obligationId.startsWith('eudpa-573-ghost-obligation-')
        )
        expect(ghost).toBeTruthy()
      })

      it('Should leave the existing fulfilments untouched', async () => {
        await unknownObligation.mutate(notifications, REFERENCE_NUMBER)
        const doc = await notifications.findOne({
          referenceNumber: REFERENCE_NUMBER
        })
        const real = doc.fulfilments.find(
          (f) => f.obligationId === 'real-obligation'
        )
        expect(real?.value).toBe('real-value')
      })

      it('Should be idempotent — a second run leaves the same terminal state', async () => {
        await unknownObligation.mutate(notifications, REFERENCE_NUMBER)
        const after1 = await notifications.findOne({
          referenceNumber: REFERENCE_NUMBER
        })
        await unknownObligation.mutate(notifications, REFERENCE_NUMBER)
        const after2 = await notifications.findOne({
          referenceNumber: REFERENCE_NUMBER
        })
        expect(after2.fulfilments).toEqual(after1.fulfilments)
      })
    })
  }
)
