/*
 * Status announcer — makes a server-rendered message actually announce.
 *
 * A live region that already holds its text when the document is parsed is
 * read as ordinary page content, not as a status. Add and Remove on the
 * transit-countries page are full form submits, so the message arrives with a
 * fresh document every time. The region therefore ships empty and this writes
 * the message into it just after load, which is the mutation assistive
 * technology announces.
 */
const ANNOUNCE_DELAY_MS = 150

class StatusAnnouncer {
  static moduleName = 'app-status-announcer'

  constructor($module) {
    const message = $module?.dataset?.message
    if (!message) {
      return
    }
    $module.textContent = ''
    setTimeout(() => {
      $module.textContent = message
    }, ANNOUNCE_DELAY_MS)
  }
}

export default StatusAnnouncer
