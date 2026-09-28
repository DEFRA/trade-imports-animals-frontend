import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MongoClient } from 'mongodb'
import { GenericContainer } from 'testcontainers'

import { obligations } from '../../src/server/app/sets/live-animals/obligations/index.js'
import { runsIt } from '../../src/server/app/services/persistence/it-mode.js'
import { partyDeleted } from './party-deleted.js'

const REFERENCE_NUMBER = 'GBN-AG-26-SMOKE1'
const MONGO_PORT = 27017
const CONTAINER_START_TIMEOUT_MS = 120_000

let container
let client
let notifications

const idOf = (name) => obligations.find((o) => o.name === name).id

describe.skipIf(!runsIt('testcontainer'))(
  '#partyDeleted — smoke against a real Mongo',
  () => {
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
  }
)
