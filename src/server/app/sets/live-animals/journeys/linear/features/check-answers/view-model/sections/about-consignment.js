import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { importDetailsCard } from '../cards/consignment/import-details.js'
import { reasonForImportCard } from '../cards/consignment/reason-for-import.js'

const copy = copyFor({ en, cy })

export const aboutConsignmentSection = async (
  journeyId,
  answers,
  scope,
  readOnly
) => ({
  anchor: 'about-the-consignment',
  heading: copy.sections.aboutTheConsignment,
  groups: [
    {
      heading: copy.groups.whereFrom,
      cards: [await importDetailsCard(journeyId, answers, scope, readOnly)]
    },
    {
      heading: copy.groups.mainImportReason,
      cards: [await reasonForImportCard(journeyId, answers, scope, readOnly)]
    }
  ]
})
