import * as state from '../../../../../../engine/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

export const outstandingItems = (answers, evaluation) => {
  const documents = state.collectionView(answers, ['documents'], evaluation)
  return documents.length === 0 ? [copy.outstanding.documents] : []
}
