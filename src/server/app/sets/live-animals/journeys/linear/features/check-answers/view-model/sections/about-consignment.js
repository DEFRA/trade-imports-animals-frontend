import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { importDetailsCard } from '../cards/consignment/import-details.js'
import { reasonForImportCard } from '../cards/consignment/reason-for-import.js'
import { whatAreYouImportingCard } from '../cards/consignment/what-are-you-importing.js'

const copy = copyFor({ en, cy })

// Design release 2.1's first numbered section: where the consignment comes
// from, what is being imported, and why. The Origin of import, What are you
// importing? and Main import reason cards stand straight under the section
// heading. The commodity cards, with a block per species, stand in the next
// section.
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
    whatAreYouImportingCard(journeyId, answers, readOnly),
    await reasonForImportCard(journeyId, answers, scope, readOnly)
  ]
})
