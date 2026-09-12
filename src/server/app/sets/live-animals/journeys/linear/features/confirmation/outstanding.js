import * as state from '../../../../../../engine/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

// What the trader still owes once the notification is in (design release 1).
// Submission does not require documents — the documents group carries only a
// cap, no floor and no required-one-of (obligations/sections/documents.js) — so
// a notification can be submitted with the health certificate still to come.
// The submitted page is the last place the service can say so, and saying
// nothing leaves the trader believing the notification is finished.
//
// Only what the service actually lets a trader submit without belongs here,
// and the section disappears when the list is empty.
//
// Design release 1 carries a second bullet, for animal identifiers, which this
// journey can now reach: the identifier obligation asks for a record only
// where more than one commodity line carries a typed identifier set
// (obligations/sections/commodities/identifiers.js, floorAppliesToParent with
// moreThanOne), so a consignment declaring a single identified species is
// submitted with no identifier record saved at all. That bullet is not held
// back for reachability. It waits on the identifier-completeness decision —
// what counts as a complete identifier record — which is still open, and is
// recorded as an open question on inc-153 in the parity backlog.
export const outstandingItems = (answers, evaluation) => {
  const documents = state.collectionView(answers, ['documents'], evaluation)
  return documents.length === 0 ? [copy.outstanding.documents] : []
}
