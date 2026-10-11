import * as state from '../../../../../../../engine/index.js'
import { isBlank } from '../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as commodities from '../../../../../services/commodities/index.js'
import { scopedFields } from '../../commodities/animal-identification/animal-identification.controller.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { REVIEW_CARDS } from './incomplete-cards.js'
import { unitsForCommodityLine } from './cards/consignment/species/units-for-commodity-line.js'
import { speciesBlockHeading } from './cards/consignment/species/species-block.js'

const copy = copyFor({ en, cy })

export const SPECIES_ENTRY_PREFIX = 'species:'

const SINGLE_SPECIES = 1

/** The anchor on a species block's heading, by the line's place in the
 * notification, so every summary entry links to a block the page carries. */
export const speciesBlockAnchor = (index) => `species-${index + 1}`

const identifiesAnimals = ({ entry }) =>
  commodities.identifiedCommodities().includes(entry.commoditySelection)

const carriesAnIdentifier = (units, commodity) =>
  units.some((unit) =>
    scopedFields(commodity).some(({ id }) => !isBlank(unit[id]))
  )

const messageFor = (entry) => {
  const species = speciesBlockHeading(entry).toLowerCase()
  return isBlank(entry.numberOfAnimalsQuantity)
    ? copy.errors.species.numberOfAnimals(species)
    : copy.errors.species.atLeastOneIdentifier(species)
}

/**
 * The species of a multi-species consignment that still have no animal
 * identifier, each with the message the error summary shows.
 *
 * Species are named only where the notification's own submit rule asks for
 * identifiers per species: more than one commodity line whose commodity is an
 * identified one, the same test the unit record's floor applies. The block
 * itself is not marked; only the summary entry links to it, by the anchor
 * `speciesBlockAnchor` gives.
 *
 * @param {object} answers - the nested answer POJO.
 * @param {object} evaluation - the request-level evaluator result.
 * @returns {object} map of `species:<anchor>` to message, in line order. Empty
 *   means no species is named.
 */
export const unfinishedSpeciesErrors = (answers, evaluation) => {
  const lines = state
    .collectionView(answers, ['commodityLines'], evaluation)
    .filter(identifiesAnimals)
  if (lines.length <= SINGLE_SPECIES) {
    return {}
  }
  return Object.fromEntries(
    lines
      .filter(
        ({ index, entry }) =>
          !carriesAnIdentifier(
            unitsForCommodityLine(answers, evaluation, index),
            entry.commoditySelection
          )
      )
      .map(({ index, entry }) => [
        `${SPECIES_ENTRY_PREFIX}${speciesBlockAnchor(index)}`,
        messageFor(entry)
      ])
  )
}

const positionOf = (key) => {
  const position = REVIEW_CARDS.findIndex((card) => card.id === key)
  return position === -1 ? Infinity : position
}

const COMMODITY_DETAILS_POSITION = REVIEW_CARDS.findIndex(
  (card) => card.id === 'commodityDetails'
)

/** The card errors with the species entries straight after commodity details,
 * each half keeping its own order. */
export const withSpeciesErrors = (cardErrors, speciesErrors) => {
  const upToCommodityDetails = Object.entries(cardErrors).filter(
    ([key]) => positionOf(key) <= COMMODITY_DETAILS_POSITION
  )
  const afterCommodityDetails = Object.entries(cardErrors).filter(
    ([key]) => positionOf(key) > COMMODITY_DETAILS_POSITION
  )
  return Object.fromEntries([
    ...upToCommodityDetails,
    ...Object.entries(speciesErrors),
    ...afterCommodityDetails
  ])
}
