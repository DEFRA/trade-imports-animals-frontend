import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { originOfImportCard } from '../cards/consignment/origin-of-import.js'
import { mainImportReasonCard } from '../cards/consignment/main-import-reason.js'

const copy = copyFor({ en, cy })

export const aboutConsignmentSection = async ({
  journeyId,
  changeLinkTrail,
  answers,
  scope,
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
    await mainImportReasonCard({
      journeyId,
      changeLinkTrail,
      answers,
      scope,
      readOnly
    })
  ]
})
