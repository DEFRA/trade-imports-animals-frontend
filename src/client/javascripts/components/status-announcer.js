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
