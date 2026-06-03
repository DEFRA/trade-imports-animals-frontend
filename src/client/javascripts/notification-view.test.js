// @vitest-environment jsdom

import { vi } from 'vitest'

const CRUMB = 'test-crumb-token'
const REF = 'IMP.GB.2026.1001401'

const HTML = `
  <input type="hidden" id="crumb-value" value="${CRUMB}">
  <button id="delete-btn" data-reference-number="${REF}">Delete</button>
  <button id="copy-btn" data-copy-ref="${REF}">Copy as new</button>
  <div id="success-banner" hidden></div>
  <div id="error-banner" hidden></div>
  <dialog id="delete-dialog">
    <button id="confirm-delete-btn">Yes, delete</button>
    <button id="cancel-delete-btn">Cancel</button>
  </dialog>
`

let originalFetch

describe('#notificationView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetModules()
    originalFetch = global.fetch
    global.fetch = vi.fn()
    document.body.innerHTML = HTML
    window.HTMLDialogElement.prototype.showModal = vi.fn()
    window.HTMLDialogElement.prototype.close = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    global.fetch = originalFetch
  })

  describe('initialisation', () => {
    test('Should not throw when required elements are absent', async () => {
      document.body.innerHTML = ''
      await expect(import('./notification-view.js')).resolves.toBeDefined()
    })
  })

  describe('delete button', () => {
    test('Should open dialog when delete button is clicked', async () => {
      await import('./notification-view.js')

      document.getElementById('delete-btn').click()

      expect(
        window.HTMLDialogElement.prototype.showModal
      ).toHaveBeenCalledTimes(1)
    })
  })

  describe('cancel button', () => {
    test('Should close dialog when cancel is clicked', async () => {
      await import('./notification-view.js')

      document.getElementById('cancel-delete-btn').click()

      expect(window.HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1)
    })
  })

  describe('confirm button — success', () => {
    test('Should POST to the correct URL with CSRF header', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true })

      await import('./notification-view.js')
      document.getElementById('confirm-delete-btn').click()
      await vi.runAllTimersAsync()

      expect(global.fetch).toHaveBeenCalledWith(
        `/notification-delete/${REF}`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-csrf-token': CRUMB
          })
        })
      )
    })

    test('Should reveal success banner on successful delete', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true })

      await import('./notification-view.js')
      document.getElementById('confirm-delete-btn').click()
      await vi.runAllTimersAsync()

      expect(document.getElementById('success-banner').hidden).toBe(false)
    })

    test('Should redirect to / after 3 seconds on success', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true })
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true
      })

      await import('./notification-view.js')
      document.getElementById('confirm-delete-btn').click()
      await vi.runAllTimersAsync()

      expect(window.location.href).toBe('/')
    })
  })

  describe('confirm button — failure', () => {
    test('Should reveal error banner when fetch returns non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false })

      await import('./notification-view.js')
      document.getElementById('confirm-delete-btn').click()
      await vi.runAllTimersAsync()

      expect(document.getElementById('error-banner').hidden).toBe(false)
    })

    test('Should reveal error banner when fetch throws a network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

      await import('./notification-view.js')
      document.getElementById('confirm-delete-btn').click()
      await vi.runAllTimersAsync()

      expect(document.getElementById('error-banner').hidden).toBe(false)
    })
  })

  describe('copy button', () => {
    test('Should append a POST form with crumb to the body when clicked', async () => {
      const appendedForms = []
      const originalAppendChild = document.body.appendChild.bind(document.body)
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
        if (node.tagName === 'FORM') {
          node.submit = vi.fn()
          appendedForms.push(node)
        }
        return originalAppendChild(node)
      })

      await import('./notification-view.js')
      document.getElementById('copy-btn').click()

      expect(appendedForms).toHaveLength(1)
      const form = appendedForms[0]
      expect(form.method).toBe('post')
      expect(form.action).toContain(`/notification-copy/${REF}`)
      expect(form.querySelector('input[name="crumb"]').value).toBe(CRUMB)
      expect(form.submit).toHaveBeenCalledTimes(1)
    })
  })

  describe('dialog close event', () => {
    test('Should return focus to delete button when dialog closes', async () => {
      await import('./notification-view.js')

      const deleteBtn = document.getElementById('delete-btn')
      const focusSpy = vi.spyOn(deleteBtn, 'focus')

      const dialog = document.getElementById('delete-dialog')
      dialog.dispatchEvent(new Event('close'))

      expect(focusSpy).toHaveBeenCalledTimes(1)
    })
  })
})
