import { entryOwesNestedRecord } from '../../../../../../../bridge/collection-complete.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { hasAnimalCount, linesOf } from '../../commodities/lines.js'
import { speciesSentenceName } from '../../commodities/species-label.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy })

const KEY_PREFIX = 'species:'

const speciesErrorKey = (lineIndex) => `${KEY_PREFIX}${lineIndex}`

export const speciesBlockAnchor = (lineIndex) => `species-block-${lineIndex}`

/** The in-page target for a per-species error key, or undefined for any other key. */
export const speciesBlockHref = (key) =>
  key.startsWith(KEY_PREFIX)
    ? `#${speciesBlockAnchor(key.slice(KEY_PREFIX.length))}`
    : undefined

const messageFor = (line) => {
  const name = speciesSentenceName(line.entry)
  return hasAnimalCount(line)
    ? copy.errors.species.noIdentifier(name)
    : copy.errors.species.noCount(name)
}

const owesIdentifiers = ({ index }, evaluation) =>
  entryOwesNestedRecord(
    evaluation,
    ['commodityLines'],
    index,
    'animalIdentifiers'
  )

/**
 * The species the notification still owes a count or an identifier for.
 *
 * @param {object} answers - the nested answer POJO.
 * @param {object} evaluation - the request-level evaluator result.
 * @returns {object} map of per-species key to message, in line order. Empty
 * means no species is short.
 */
export const speciesErrors = (answers, evaluation) =>
  Object.fromEntries(
    linesOf(answers, evaluation)
      .filter((line) => owesIdentifiers(line, evaluation))
      .map((line) => [speciesErrorKey(line.index), messageFor(line)])
  )
