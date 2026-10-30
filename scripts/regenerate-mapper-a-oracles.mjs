import '../test/setup-obligation-set.js'
import { readFileSync, writeFileSync } from 'node:fs'
import { assembleFulfilments } from '../src/server/app/bridge/assemble-fulfilments.js'
import { characterisationCorpus } from '../src/server/app/sets/live-animals/journeys/linear/fixtures/characterisation-corpus.js'
import { fulfilmentToNotification } from '../src/server/app/services/persistence/records/notification-mapper/index.js'

const path = new URL(
  '../src/server/app/sets/live-animals/journeys/linear/fixtures/characterisation-oracles.json',
  import.meta.url
)
const oracles = JSON.parse(readFileSync(path, 'utf8'))

for (const { name, answers } of characterisationCorpus) {
  const fulfilments = assembleFulfilments(answers)
  oracles[name].mapperA = fulfilmentToNotification(
    fulfilments,
    answers.referenceNumber
  )
}

writeFileSync(path, JSON.stringify(oracles, null, 2) + '\n')
