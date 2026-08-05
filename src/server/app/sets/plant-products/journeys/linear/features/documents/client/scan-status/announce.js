import { createEl } from '../dom.js'

export const announcer = () =>
  document.getElementById('js-scan-status-announcer')

// The presentation the browser applies comes from the server, already
// localised. The client never composes a user-facing sentence of its own.
export const readScanCopy = () => {
  const raw = announcer()?.dataset.scanCopy
  return raw ? JSON.parse(raw) : {}
}

// Two rows can settle in the same read, and one assignment to textContent
// would destroy the first verdict before it was ever read out. Each message
// is its own node, and the region is aria-atomic so they are announced
// together. The strings are still server-supplied — nothing is composed here.
export const announce = (messages) => {
  const region = announcer()
  if (!region || messages.length === 0) {
    return
  }
  region.replaceChildren(
    ...messages.map((message) => createEl('span', { text: message }))
  )
}
