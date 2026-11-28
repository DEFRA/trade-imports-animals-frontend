import { describe, it, expect } from 'vitest'
import { completeNotification } from '../engine/test-support.js'
import { assembleFulfilments } from './assemble-fulfilments.js'
import { purgeFulfilments } from './purge.js'
import {
  obligationByName,
  obligationSet
} from '../model/obligations/manifest.js'
import { carriedFulfilmentsFrom } from './carried-answers.js'

const { carriedOnCopy } = obligationSet()
const carriedIds = new Set(
  carriedOnCopy.map((name) => obligationByName(name).id)
)

const sourceFulfilments = () =>
  purgeFulfilments(assembleFulfilments(completeNotification())).fulfilments

const sourceFulfilmentsWithReasonForImport = (reasonForImport, answers) =>
  purgeFulfilments(
    assembleFulfilments({
      ...completeNotification(),
      reasonForImport,
      ...answers
    })
  ).fulfilments

const expectCarriedExactlyTheAnsweredCarriedObligations = (source) => {
  const expectedIds = Object.keys(source).filter((id) => carriedIds.has(id))

  const carried = carriedFulfilmentsFrom(source)

  expect(Object.keys(carried).sort()).toEqual(expectedIds.sort())
  for (const id of expectedIds) {
    expect(carried[id]).toEqual(source[id])
  }
  return carried
}

describe('#carriedFulfilmentsFrom', () => {
  it('Should carry every answered carried obligation at its source value, losing none to the purge the drop triggers, and carry no obligation given again', () => {
    expectCarriedExactlyTheAnsweredCarriedObligations(sourceFulfilments())
  })

  it("Should carry a temporary-admission source's exit date and port of exit at their answered values", () => {
    const source = sourceFulfilmentsWithReasonForImport(
      'temporaryAdmissionHorses',
      {
        exitDate: { day: '20', month: '12', year: '2026' },
        portOfExit: 'GB DVR'
      }
    )

    const carried = expectCarriedExactlyTheAnsweredCarriedObligations(source)

    expect(carried[obligationByName('exitDate').id]).toEqual(
      source[obligationByName('exitDate').id]
    )
    expect(carried[obligationByName('portOfExit').id]).toEqual(
      source[obligationByName('portOfExit').id]
    )
  })

  it("Should carry a transit source's destination country and port of exit at their answered values", () => {
    const source = sourceFulfilmentsWithReasonForImport('transit', {
      portOfExit: 'GB DVR',
      destinationCountry: 'IE'
    })

    const carried = expectCarriedExactlyTheAnsweredCarriedObligations(source)

    expect(carried[obligationByName('destinationCountry').id]).toEqual(
      source[obligationByName('destinationCountry').id]
    )
    expect(carried[obligationByName('portOfExit').id]).toEqual(
      source[obligationByName('portOfExit').id]
    )
  })
})
