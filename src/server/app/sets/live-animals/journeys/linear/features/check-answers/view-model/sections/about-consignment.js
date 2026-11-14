import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { originOfImportCard } from '../cards/consignment/origin-of-import.js'
import { whatAreYouImportingCard } from '../cards/consignment/what-are-you-importing.js'
import { mainImportReasonCard } from '../cards/consignment/main-import-reason.js'

const copy = copyFor({ en, cy })

export const aboutConsignmentSection = async ({
  journeyId,
  changeLinkTrail,
  answers,
  scope,
  evaluation,
  readOnly
}) => ({
  anchor: 'about-the-consignment',
  heading: copy.sections.aboutTheConsignment,
  cards: [
    await originOfImportCard({
      journeyId,
      changeLinkTrail,
      answers,
      readOnly
    }),
    whatAreYouImportingCard({
      journeyId,
      changeLinkTrail,
      answers,
      evaluation,
      readOnly
    }),
    await mainImportReasonCard({
      journeyId,
      changeLinkTrail,
      answers,
      scope,
      readOnly
    })
  ]
})
