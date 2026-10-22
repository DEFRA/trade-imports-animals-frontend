const SEARCH_DELAY_MS = 250
const SLOT_ATTRIBUTE = 'data-live-search-slot'
const MESSAGE_ATTRIBUTE = 'data-live-search-message'

const isSubmitted = (field) =>
  field.name &&
  !field.disabled &&
  (!['checkbox', 'radio'].includes(field.type) || field.checked)

const queryStringOf = ($module) => {
  const params = new URLSearchParams()
  for (const field of $module.querySelectorAll('input, select, textarea')) {
    if (isSubmitted(field)) {
      params.append(field.name, field.value)
    }
  }
  return params.toString()
}

const slotsIn = (root) =>
  new Map(
    Array.from(root.querySelectorAll(`[${SLOT_ATTRIBUTE}]`), (slot) => [
      slot.getAttribute(SLOT_ATTRIBUTE),
      slot
    ])
  )

const parseHtml = (html) => {
  const template = document.createElement('template')
  template.innerHTML = html
  return template.content
}

class LiveSearch {
  static moduleName = 'app-live-search'

  constructor($module) {
    const form = $module?.closest('form')
    const input = $module?.querySelector('input[type="search"]')
    const resultsHref = $module?.dataset.resultsHref
    if (!form || !input || !resultsHref) {
      return
    }
    this.$module = $module
    this.input = input
    this.resultsHref = resultsHref
    this.status = $module.querySelector('[data-live-search-status]')
    this.searchTimer = null
    this.inFlight = null
    this.searchPending = false

    input.addEventListener('input', () => this.scheduleSearch())
    $module.addEventListener('change', (event) =>
      this.refreshAllBut(event.target)
    )
    form.addEventListener('submit', () => this.cancel())
  }

  scheduleSearch() {
    this.cancel()
    this.searchPending = true
    this.searchTimer = setTimeout(() => this.refresh(null), SEARCH_DELAY_MS)
  }

  refreshAllBut(control) {
    const slot = control.closest(`[${SLOT_ATTRIBUTE}]`)
    if (control === this.input || !slot) {
      return
    }
    const keptSlot = this.searchPending
      ? null
      : slot.getAttribute(SLOT_ATTRIBUTE)
    this.cancel()
    this.refresh(keptSlot)
  }

  cancel() {
    clearTimeout(this.searchTimer)
    this.searchTimer = null
    this.inFlight?.abort()
    this.inFlight = null
  }

  async refresh(keptSlot) {
    this.inFlight?.abort()
    const request = new AbortController()
    this.inFlight = request
    const html = await this.fetchSlots(request.signal)
    if (html === null || request.signal.aborted) {
      return
    }
    this.inFlight = null
    this.swapSlots(parseHtml(html), keptSlot)
  }

  async fetchSlots(signal) {
    try {
      const response = await fetch(
        `${this.resultsHref}?${queryStringOf(this.$module)}`,
        { headers: { Accept: 'text/html' }, signal }
      )
      return response.ok ? await response.text() : null
    } catch {
      return null
    }
  }

  swapSlots(fragment, keptSlot) {
    const current = slotsIn(this.$module)
    for (const [name, incoming] of slotsIn(fragment)) {
      const slot = current.get(name)
      if (slot && name !== keptSlot) {
        slot.replaceChildren(...incoming.childNodes)
        this.announce(incoming.getAttribute(MESSAGE_ATTRIBUTE))
      }
    }
    if (keptSlot === null) {
      this.searchPending = false
    }
  }

  announce(message) {
    if (this.status && message !== null) {
      this.status.textContent = message
    }
  }
}

export default LiveSearch
