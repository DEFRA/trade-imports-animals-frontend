import { deleteNotificationPage } from '../features/delete-notification/page.js'

export const notificationActionSlugs = Object.freeze({
  amend: 'amend',
  cancelAmend: 'cancel-amend',
  copy: 'copy',
  delete: deleteNotificationPage.slug
})
