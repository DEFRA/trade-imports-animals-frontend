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
