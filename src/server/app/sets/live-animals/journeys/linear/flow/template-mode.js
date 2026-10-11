import { documentsPage } from '../features/documents/page.js'
import { notificationViewPage } from '../features/check-answers/page.js'
import { declarationPage } from '../features/declaration/page.js'
import { confirmationPage } from '../features/confirmation/page.js'

// What a template leaves out, stated once and applied by the set gateway and
// the opening run. A template holds no documents and no declaration; its review
// is a later row's; and amend, cancel-amend, copy and delete are notification
// lifecycle actions. Every other journey page is walked as it stands.
export const TEMPLATE_MODE_EXCLUDED_PAGES = [
  documentsPage,
  notificationViewPage,
  declarationPage,
  confirmationPage
]

export const TEMPLATE_MODE_EXCLUDED_PAGE_IDS = TEMPLATE_MODE_EXCLUDED_PAGES.map(
  ({ id }) => id
)

const NOTIFICATION_ACTION_SLUGS = ['amend', 'cancel-amend', 'copy', 'delete']

export const TEMPLATE_MODE_EXCLUDED_SLUGS = [
  ...TEMPLATE_MODE_EXCLUDED_PAGES.map(({ slug }) => slug),
  ...NOTIFICATION_ACTION_SLUGS
]
