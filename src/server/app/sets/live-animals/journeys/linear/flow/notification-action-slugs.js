import { CANCEL_AMEND_SLUG } from '../../../../../shared/kit.js'
import { amendPage } from '../features/amend/page.js'
import { deleteNotificationPage } from '../features/delete-notification/page.js'

export const notificationActionSlugs = Object.freeze({
  amend: amendPage.slug,
  cancelAmend: CANCEL_AMEND_SLUG,
  copy: 'copy',
  delete: deleteNotificationPage.slug
})
