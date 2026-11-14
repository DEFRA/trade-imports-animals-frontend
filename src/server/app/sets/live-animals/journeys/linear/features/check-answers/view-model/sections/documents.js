import * as state from '../../../../../../../../engine/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { documentCards } from '../cards/documents.js'

const copy = copyFor({ en, cy })

const showsHealthCertificateErrorInPlaceOfCards = ({
  status,
  answers,
  evaluation
}) =>
  status === state.SUBMITTED_ACTION_REQUIRED &&
  state.collectionView(answers, ['documents'], evaluation).length === 0

export const documentsSection = ({
  journeyId,
  changeLinkTrail,
  answers,
  evaluation,
  readOnly,
  status
}) => {
  const section = {
    anchor: 'documents-section',
    heading: copy.sections.documents
  }

  if (
    showsHealthCertificateErrorInPlaceOfCards({ status, answers, evaluation })
  ) {
    return { ...section, error: copy.errors.healthCertificate, cards: [] }
  }

  return {
    ...section,
    cards: documentCards({
      journeyId,
      changeLinkTrail,
      answers,
      evaluation,
      readOnly
    })
  }
}
