import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MongoClient } from 'mongodb'
import { GenericContainer } from 'testcontainers'

import { runsIt } from '../../../src/server/app/services/persistence/it-mode.js'
import { unknownObligation } from './unknown-obligation.js'

const REFERENCE_NUMBER = 'GBN-AG-26-SMOKE1'
const MONGO_PORT = 27017
const CONTAINER_START_TIMEOUT_MS = 120_000

let container
let client
let notifications

describe.skipIf(!runsIt('testcontainer'))(
  '#unknownObligation — smoke against a real Mongo',
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
        fulfilments: [{ obligationId: 'real-obligation', value: 'real-value' }]
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
  }
)
