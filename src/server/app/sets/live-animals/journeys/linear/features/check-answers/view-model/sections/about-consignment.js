import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { importDetailsCard } from '../cards/consignment/import-details.js'
import { reasonForImportCard } from '../cards/consignment/reason-for-import.js'

const copy = copyFor({ en, cy })

// Design release 2.1's first numbered section: where the consignment comes
// from, and why it is being imported. The Origin of import and Main import
// reason cards stand straight under the section heading. What is being
// imported is the next section's subject, so the commodity and animal answers
// are not here.
export const aboutConsignmentSection = async (
  journeyId,
  answers,
  scope,
  readOnly
) => ({
  anchor: 'about-the-consignment',
  heading: copy.sections.aboutTheConsignment,
  cards: [
    await importDetailsCard(journeyId, answers, scope, readOnly),
    await reasonForImportCard(journeyId, answers, scope, readOnly)
  ]
})
