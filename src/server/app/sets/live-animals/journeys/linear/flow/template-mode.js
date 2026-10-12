import { arrivalDateAtPort } from '../../../obligations/sections/arrival.js'
import { documents, obligations } from '../../../obligations/index.js'
import { documentsPage } from '../features/documents/page.js'
import { notificationViewPage } from '../features/check-answers/page.js'
import { declarationPage } from '../features/declaration/page.js'
import { confirmationPage } from '../features/confirmation/page.js'

// What a template leaves out, stated once and applied by the set gateway and
// the opening run. A template holds no documents and no declaration; amend,
// cancel-amend, copy and delete are notification lifecycle actions. The review
// is walked in template mode, as the template review. Every other journey page
// is walked as it stands.
export const TEMPLATE_MODE_EXCLUDED_PAGES = [
  documentsPage,
  declarationPage,
  confirmationPage
]

export const TEMPLATE_MODE_EXCLUDED_PAGE_IDS = TEMPLATE_MODE_EXCLUDED_PAGES.map(
  ({ id }) => id
)

// The run creates a template in order and hands it to its task list, from which
// the trader chooses to review it, so the run still skips the review.
export const TEMPLATE_MODE_RUN_SKIPPED_PAGE_IDS = [
  ...TEMPLATE_MODE_EXCLUDED_PAGE_IDS,
  notificationViewPage.id
]

const NOTIFICATION_ACTION_SLUGS = ['amend', 'cancel-amend', 'copy', 'delete']

export const TEMPLATE_MODE_EXCLUDED_SLUGS = [
  ...TEMPLATE_MODE_EXCLUDED_PAGES.map(({ slug }) => slug),
  ...NOTIFICATION_ACTION_SLUGS
]

// A template is reused across consignments, so it never holds an arrival date:
// the arrival page still asks for it, but it is never stored.
export const TEMPLATE_NOT_HELD_OBLIGATIONS = [arrivalDateAtPort]

export const TEMPLATE_NOT_HELD_OBLIGATION_IDS =
  TEMPLATE_NOT_HELD_OBLIGATIONS.map(({ id }) => id)

export const TEMPLATE_NOT_HELD_FIELDS = TEMPLATE_NOT_HELD_OBLIGATIONS.map(
  ({ name }) => name
)

// What a notification started from a template never takes from it: what a
// template never holds, and every document.
export const TEMPLATE_NOT_CARRIED_OBLIGATION_IDS = [
  ...TEMPLATE_NOT_HELD_OBLIGATION_IDS,
  ...obligations
    .filter(
      (obligation) =>
        obligation === documents || obligation.within === documents
    )
    .map(({ id }) => id)
]
