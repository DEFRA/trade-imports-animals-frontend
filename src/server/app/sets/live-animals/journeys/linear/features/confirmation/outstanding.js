import * as state from '../../../../../../engine/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { anyLineIsShortOfIdentifiedAnimals } from '../commodities/animal-identification/identified-animals.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

const certificateItems = (answers, evaluation) => {
  const itahcUploaded = state
    .collectionView(answers, ['documents'], evaluation)
    .some(({ entry }) => entry.accompanyingDocumentType === 'ITAHC')
  return itahcUploaded ? [] : [copy.outstanding.documents]
}

const identifierItems = (answers, evaluation) =>
  anyLineIsShortOfIdentifiedAnimals(answers, evaluation)
    ? [copy.outstanding.completeIdentifiers]
    : []

export const outstandingItems = (answers, evaluation) => [
  ...certificateItems(answers, evaluation),
  ...identifierItems(answers, evaluation)
]
