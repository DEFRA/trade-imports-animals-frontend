import {
  obligationByName,
  obligationSet
} from '../model/obligations/manifest.js'
import { purgeFulfilments } from './purge.js'

const givenAgainObligationIds = () =>
  new Set(
    obligationSet().givenAgainOnCopy.map((name) => obligationByName(name).id)
  )

const withoutGivenAgain = (fulfilments) => {
  const givenAgainIds = givenAgainObligationIds()
  return Object.fromEntries(
    Object.entries(fulfilments).filter(([id]) => !givenAgainIds.has(id))
  )
}

export const carriedFulfilmentsFrom = (fulfilments) =>
  purgeFulfilments(withoutGivenAgain(fulfilments)).fulfilments
