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
let originalLocation

const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 10
const TOTAL_POLL_CYCLES = MAX_POLL_ATTEMPTS + 1

const makeFetchOk = (docs) =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ documents: docs })
  })

describe('#accompanyingDocuments', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // module runs top-level side-effects on import; reset so each test gets a fresh evaluation
    vi.resetModules()
    originalFetch = global.fetch
    global.fetch = vi.fn()
    originalLocation = window.location
  })

  afterEach(() => {
    vi.useRealTimers()
    global.fetch = originalFetch
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true
    })
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
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)

      expect(vi.getTimerCount()).toBe(1)
    })

    test('Should retry when fetch throws a network error', async () => {
      document.body.innerHTML = TABLE_PENDING
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      await import('./accompanying-documents.js')
      expect(vi.getTimerCount()).toBe(1)

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)

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

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)

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
      document.body.innerHTML =
        TABLE_PENDING +
        '<div id="js-scan-status-announcer" aria-live="polite" aria-atomic="true" class="govuk-visually-hidden"></div>'
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
      const announcer = document.getElementById('js-scan-status-announcer')
      expect(announcer.textContent).toBe(
        'Document scan failed: virus found. Remove the file and try again.'
      )
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

    test('Should announce status via the static aria-live region on COMPLETE', async () => {
      document.body.innerHTML =
        TABLE_PENDING +
        '<div id="js-scan-status-announcer" aria-live="polite" aria-atomic="true" class="govuk-visually-hidden"></div>'
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

  describe('client-side file-size preflight', () => {
    const FILE_INPUT_ID = 'file'
    const MAX_FILE_SIZE = 10 * 1000 * 1000
    const OVERSIZE_MESSAGE = 'The selected file must be smaller than 10 MB'
    const buildUploadForm = ({
      oversizeError = OVERSIZE_MESSAGE,
      omitOversizeError = false
    } = {}) => {
      const oversizeAttr = omitOversizeError
        ? ''
        : ` data-oversize-error="${oversizeError}"`
      return `
      <div>
        <form method="post" enctype="multipart/form-data" data-max-file-size="${MAX_FILE_SIZE}"${oversizeAttr}>
          <div class="govuk-form-group">
            <label class="govuk-label" for="${FILE_INPUT_ID}">Attachment</label>
            <input id="${FILE_INPUT_ID}" name="file" type="file"/>
          </div>
          <button type="submit">Add attachment</button>
        </form>
      </div>
    `
    }

    const attachFile = (input, sizeBytes) => {
      const file = new File(['x'], 'sample.pdf', { type: 'application/pdf' })
      Object.defineProperty(file, 'size', { value: sizeBytes })
      Object.defineProperty(input, 'files', { value: [file], writable: false })
    }

    const submitForm = (form) => {
      const event = new Event('submit', { cancelable: true, bubbles: true })
      form.dispatchEvent(event)
      return event
    }

    test('Should not prevent submit when no file is attached', async () => {
      document.body.innerHTML = buildUploadForm()

      await import('./accompanying-documents.js')

      const form = document.querySelector('form')
      const submitEvent = submitForm(form)

      expect(submitEvent.defaultPrevented).toBe(false)
      expect(
        document.querySelector('[data-client-error="file-size-summary"]')
      ).toBeNull()
    })

    test('Should not prevent submit when file size is at the limit', async () => {
      document.body.innerHTML = buildUploadForm()
      attachFile(document.getElementById(FILE_INPUT_ID), MAX_FILE_SIZE)

      await import('./accompanying-documents.js')

      const form = document.querySelector('form')
      const submitEvent = submitForm(form)

      expect(submitEvent.defaultPrevented).toBe(false)
      expect(
        document.querySelector('[data-client-error="file-size-summary"]')
      ).toBeNull()
    })

    test('Should prevent submit and render GDS error summary + inline message when file exceeds the limit', async () => {
      document.body.innerHTML = buildUploadForm()
      attachFile(document.getElementById(FILE_INPUT_ID), MAX_FILE_SIZE + 1)

      await import('./accompanying-documents.js')

      const form = document.querySelector('form')
      const submitEvent = submitForm(form)

      expect(submitEvent.defaultPrevented).toBe(true)

      const summary = document.querySelector(
        '[data-client-error="file-size-summary"]'
      )
      expect(summary).not.toBeNull()
      expect(summary.classList.contains('govuk-error-summary')).toBe(true)
      expect(summary.textContent).toContain('There is a problem')
      const summaryLink = summary.querySelector('a')
      expect(summaryLink.getAttribute('href')).toBe(`#${FILE_INPUT_ID}`)
      expect(summaryLink.textContent).toBe(
        'The selected file must be smaller than 10 MB'
      )

      const group = document.querySelector('.govuk-form-group')
      expect(group.classList.contains('govuk-form-group--error')).toBe(true)

      const inlineError = document.querySelector(
        '[data-client-error="file-size-message"]'
      )
      expect(inlineError).not.toBeNull()
      expect(inlineError.id).toBe(`${FILE_INPUT_ID}-error`)
      expect(inlineError.textContent).toContain(
        'The selected file must be smaller than 10 MB'
      )
    })

    test('Should not duplicate errors when an oversize submit is attempted twice', async () => {
      document.body.innerHTML = buildUploadForm()
      attachFile(document.getElementById(FILE_INPUT_ID), MAX_FILE_SIZE + 1)

      await import('./accompanying-documents.js')

      const form = document.querySelector('form')
      submitForm(form)
      const second = submitForm(form)

      expect(second.defaultPrevented).toBe(true)
      expect(
        document.querySelectorAll('[data-client-error="file-size-summary"]')
      ).toHaveLength(1)
      expect(
        document.querySelectorAll('[data-client-error="file-size-message"]')
      ).toHaveLength(1)
    })

    test('Should remain inert when no form with data-max-file-size is present', async () => {
      document.body.innerHTML = '<div>No upload form here</div>'

      await expect(import('./accompanying-documents.js')).resolves.toBeDefined()
    })

    test('Should render the message supplied via data-oversize-error rather than a hard-coded copy', async () => {
      const customMessage = 'Your file must be smaller than 5MB'
      document.body.innerHTML = buildUploadForm({
        oversizeError: customMessage
      })
      attachFile(document.getElementById(FILE_INPUT_ID), MAX_FILE_SIZE + 1)

      await import('./accompanying-documents.js')

      const form = document.querySelector('form')
      submitForm(form)

      const summary = document.querySelector(
        '[data-client-error="file-size-summary"]'
      )
      expect(summary.querySelector('a').textContent).toBe(customMessage)
      expect(
        document.querySelector('[data-client-error="file-size-message"]')
          .textContent
      ).toContain(customMessage)
    })

    test('Should not attach the preflight when data-oversize-error is missing', async () => {
      document.body.innerHTML = buildUploadForm({ omitOversizeError: true })
      attachFile(document.getElementById(FILE_INPUT_ID), MAX_FILE_SIZE + 1)

      await import('./accompanying-documents.js')

      const form = document.querySelector('form')
      const submitEvent = submitForm(form)

      expect(submitEvent.defaultPrevented).toBe(false)
      expect(
        document.querySelector('[data-client-error="file-size-summary"]')
      ).toBeNull()
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
      for (let i = 0; i < TOTAL_POLL_CYCLES; i++) {
        await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
      }

      const timeoutMsg = document.getElementById('js-timeout-message')
      expect(timeoutMsg.hidden).toBe(false)
      expect(vi.getTimerCount()).toBe(0)
    })

    test('Should stop polling cleanly when #js-timeout-message element is absent', async () => {
      document.body.innerHTML = TABLE_PENDING
      // Always return PENDING so the module keeps rescheduling
      global.fetch = makeFetchOk([{ uploadId: 'U1', scanStatus: 'PENDING' }])

      await import('./accompanying-documents.js')

      for (let i = 0; i < TOTAL_POLL_CYCLES; i++) {
        await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
      }

      // Polling must stop without throwing even when the timeout element is missing
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
