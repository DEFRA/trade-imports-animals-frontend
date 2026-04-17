// @vitest-environment jsdom

import { vi } from 'vitest'

// jsdom strips bare <tr> elements from body.innerHTML because they are invalid
// HTML outside a <table>. All row fixtures must be wrapped in a proper table.
const TABLE_PENDING = `
  <table>
    <tbody>
      <tr data-upload-id="U1" data-scan-status="PENDING">
        <td><span class="govuk-tag">Checking</span></td>
      </tr>
    </tbody>
  </table>
`

const TABLE_COMPLETE = `
  <table>
    <tbody>
      <tr data-upload-id="U1" data-scan-status="COMPLETE">
        <td><span class="govuk-tag govuk-tag--green">Safe</span></td>
      </tr>
    </tbody>
  </table>
`

let originalFetch

function makeFetchOk(docs) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ documents: docs })
  })
}

describe('#accompanyingDocuments', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetModules()
    originalFetch = global.fetch
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    global.fetch = originalFetch
  })

  describe('initialisation', () => {
    test('Should hide #js-refresh-fallback when element exists', async () => {
      document.body.innerHTML =
        '<div id="js-refresh-fallback"></div>' + TABLE_COMPLETE

      await import('./accompanying-documents.js')

      const fallback = document.getElementById('js-refresh-fallback')
      expect(fallback.hidden).toBe(true)
    })

    test('Should schedule polling when PENDING rows exist', async () => {
      document.body.innerHTML = TABLE_PENDING

      await import('./accompanying-documents.js')

      expect(vi.getTimerCount()).toBe(1)
    })

    test('Should not schedule polling when no PENDING rows exist', async () => {
      document.body.innerHTML = TABLE_COMPLETE

      await import('./accompanying-documents.js')

      expect(vi.getTimerCount()).toBe(0)
    })
  })

  describe('polling — retry paths', () => {
    test('Should retry when fetch returns a non-ok response', async () => {
      document.body.innerHTML = TABLE_PENDING
      global.fetch = vi.fn().mockResolvedValue({ ok: false })

      await import('./accompanying-documents.js')
      expect(vi.getTimerCount()).toBe(1)

      // Advance exactly one poll interval so only the first poll fires;
      // runAllTimersAsync would recursively drain all retries up to MAX_ATTEMPTS.
      await vi.advanceTimersByTimeAsync(3000)

      expect(vi.getTimerCount()).toBe(1)
    })

    test('Should retry when fetch throws a network error', async () => {
      document.body.innerHTML = TABLE_PENDING
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      await import('./accompanying-documents.js')
      expect(vi.getTimerCount()).toBe(1)

      await vi.advanceTimersByTimeAsync(3000)

      expect(vi.getTimerCount()).toBe(1)
    })

    test('Should retry when response JSON has no documents field', async () => {
      document.body.innerHTML = TABLE_PENDING
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      })

      await import('./accompanying-documents.js')
      expect(vi.getTimerCount()).toBe(1)

      await vi.advanceTimersByTimeAsync(3000)

      expect(vi.getTimerCount()).toBe(1)
    })
  })

  describe('polling — status updates', () => {
    test('Should update row tag to Safe/green on COMPLETE status', async () => {
      document.body.innerHTML = TABLE_PENDING
      global.fetch = makeFetchOk([{ uploadId: 'U1', scanStatus: 'COMPLETE' }])
      Object.defineProperty(window, 'location', {
        value: { reload: vi.fn() },
        writable: true
      })

      await import('./accompanying-documents.js')
      await vi.runAllTimersAsync()

      const tag = document.querySelector('[data-upload-id="U1"] .govuk-tag')
      expect(tag.textContent).toBe('Safe')
      expect(tag.classList.contains('govuk-tag--green')).toBe(true)
    })

    test('Should update row tag to "Virus found"/red on REJECTED status', async () => {
      document.body.innerHTML = TABLE_PENDING
      global.fetch = makeFetchOk([{ uploadId: 'U1', scanStatus: 'REJECTED' }])
      Object.defineProperty(window, 'location', {
        value: { reload: vi.fn() },
        writable: true
      })

      await import('./accompanying-documents.js')
      await vi.runAllTimersAsync()

      const tag = document.querySelector('[data-upload-id="U1"] .govuk-tag')
      expect(tag.textContent).toBe('Virus found')
      expect(tag.classList.contains('govuk-tag--red')).toBe(true)
    })

    test('Should reload the page when all documents are no longer PENDING', async () => {
      document.body.innerHTML = TABLE_PENDING
      const reload = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload },
        writable: true
      })
      global.fetch = makeFetchOk([{ uploadId: 'U1', scanStatus: 'COMPLETE' }])

      await import('./accompanying-documents.js')
      await vi.runAllTimersAsync()

      expect(reload).toHaveBeenCalledTimes(1)
    })

    test('Should create an aria-live region and announce status on COMPLETE', async () => {
      document.body.innerHTML = TABLE_PENDING
      global.fetch = makeFetchOk([{ uploadId: 'U1', scanStatus: 'COMPLETE' }])
      Object.defineProperty(window, 'location', {
        value: { reload: vi.fn() },
        writable: true
      })

      await import('./accompanying-documents.js')
      await vi.runAllTimersAsync()

      const announcer = document.getElementById('js-scan-status-announcer')
      expect(announcer).not.toBeNull()
      expect(announcer.getAttribute('aria-live')).toBe('polite')
      expect(announcer.textContent).toBe('Document scan complete: safe to use')
    })
  })

  describe('polling — timeout', () => {
    test('Should show #js-timeout-message and stop polling after 10 attempts', async () => {
      document.body.innerHTML =
        TABLE_PENDING + '<div id="js-timeout-message" hidden></div>'
      // Always return PENDING so the module keeps rescheduling
      global.fetch = makeFetchOk([{ uploadId: 'U1', scanStatus: 'PENDING' }])

      await import('./accompanying-documents.js')

      // Advance one POLL_INTERVAL at a time.
      // Attempts 0–9 each fetch (returning PENDING) and reschedule.
      // The 11th advance triggers pollStatus(10) which hits MAX_ATTEMPTS and stops.
      for (let i = 0; i < 11; i++) {
        await vi.advanceTimersByTimeAsync(3000)
      }

      const timeoutMsg = document.getElementById('js-timeout-message')
      expect(timeoutMsg.hidden).toBe(false)
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
