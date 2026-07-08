import { beforeEach, describe, expect, it } from 'vitest'
import { commit } from './index.js'
import { records } from './persistence/records.js'
import { configureReadyForQuote } from './read.js'
import { stubH, journeyRequest } from './test-support.js'

let journeyId
const buildRequest = () => journeyRequest(journeyId)

describe('write-through on every commit', () => {
  beforeEach(() => {
    records.clear()
    configureReadyForQuote(() => false)
    journeyId = records.create().journeyId
  })

  it('Should persist to the records port on the first commit, before any submit', () => {
    commit(buildRequest(), stubH(), { countryOfOrigin: 'FR' })
    expect(records.load({ journeyId }).answers).toEqual({
      countryOfOrigin: 'FR'
    })
  })

  it('Should overwrite the durable record on a second commit', () => {
    commit(buildRequest(), stubH(), { countryOfOrigin: 'FR' })
    commit(buildRequest(), stubH(), { internalReferenceNumber: 'Imports456GB' })
    expect(records.load({ journeyId }).answers).toEqual({
      countryOfOrigin: 'FR',
      internalReferenceNumber: 'Imports456GB'
    })
  })
})
