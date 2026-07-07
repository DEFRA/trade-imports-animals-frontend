/**
 * Import-free data leaf — importing a controller here (or in flow.js)
 * creates the load cycle flow -> controller -> engine -> status -> flow
 * and leaves `sections` undefined at boot.
 *
 * Spec identity: page `notificationView` in the "Check and submit"
 * (review) section. The rendered heading stays "Check your answers"
 * as provisional copy — the spec's title ("Notification details") names
 * the backend-refetching CYA hub the real service will build, which
 * this session-backed prototype does not do.
 */
export const notificationViewPage = {
  id: 'notification-view',
  slug: 'notification-view'
}
