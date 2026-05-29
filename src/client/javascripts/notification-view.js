const deleteBtn = document.getElementById('delete-btn')
const dialog = document.getElementById('delete-dialog')
const confirmBtn = document.getElementById('confirm-delete-btn')
const cancelBtn = document.getElementById('cancel-delete-btn')
const successBanner = document.getElementById('success-banner')
const errorBanner = document.getElementById('error-banner')
const crumbInput = document.getElementById('crumb-value')

const REDIRECT_DELAY_MS = 3000

const elementsPresent = deleteBtn && dialog && confirmBtn && cancelBtn

if (elementsPresent && successBanner && errorBanner && crumbInput) {
  deleteBtn.addEventListener('click', () => {
    dialog.showModal()
  })

  cancelBtn.addEventListener('click', () => {
    dialog.close()
  })

  dialog.addEventListener('close', () => {
    deleteBtn.focus()
  })

  confirmBtn.addEventListener('click', async () => {
    const referenceNumber = deleteBtn.dataset.referenceNumber
    const crumb = crumbInput.value

    try {
      const response = await fetch(`/notification-delete/${referenceNumber}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': crumb
        }
      })

      dialog.close()

      if (response.ok) {
        successBanner.hidden = false
        setTimeout(() => {
          window.location.href = '/'
        }, REDIRECT_DELAY_MS)
      } else {
        errorBanner.hidden = false
      }
    } catch {
      dialog.close()
      errorBanner.hidden = false
    }
  })
}
