import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { importDetailsCard } from '../cards/consignment/import-details.js'
import { reasonForImportCard } from '../cards/consignment/reason-for-import.js'

const copy = copyFor({ en, cy })

// Design release 1's first numbered section: where the consignment comes from,
// and why it is being imported. What is being imported is the next section's
// subject, so the commodity and animal answers are no longer here.
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
      heading: copy.groups.mainReasonForImport,
      cards: [await reasonForImportCard(journeyId, answers, scope, readOnly)]
    }
  ]
})
