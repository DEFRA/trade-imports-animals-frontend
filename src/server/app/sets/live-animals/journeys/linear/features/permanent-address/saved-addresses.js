import { addressableUnits, originOf } from './cards.js'
import { toDisplayParty } from '../addresses/frozen-parties.js'
import { animalLabelOf } from '../commodities/animal-identification/animal-label.js'

/**
 * Each addressable animal's saved permanent address, in line and animal
 * order: its label (the species' common name and number), the choice it was
 * saved with, and its address in the shape the journey renders (country name
 * resolved), or no address while the animal still owes one.
 *
 * @param {object} answers - the journey's stored answers.
 * @param {object} evaluation - the request-level evaluator result.
 * @returns {Promise<{label: string, permanentAddressOrigin: (string|null), permanentAddress: (object|undefined)}[]>}
 */
export const permanentAddressesFromStoredAnswers = async (
  answers,
  evaluation
) =>
  Promise.all(
    addressableUnits(answers, evaluation).map(
      async ({ line, unitIndex, unit }) => ({
        label: animalLabelOf(line.speciesCommonName, unitIndex + 1),
        permanentAddressOrigin: originOf(unit),
        permanentAddress: await toDisplayParty(unit.permanentAddress)
      })
    )
  )
