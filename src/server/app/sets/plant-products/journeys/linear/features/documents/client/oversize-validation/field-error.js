import { createEl } from '../dom.js'
import { ARIA_DESCRIBEDBY, CLIENT_ERROR_MARKER } from './markers.js'

const buildErrorMessageEl = (id, message, hiddenPrefix) => {
  const errorMessage = createEl('p', {
    attrs: { id },
    className: 'govuk-error-message',
    dataset: { clientError: `${CLIENT_ERROR_MARKER}-message` },
    children: [
      createEl('span', {
        className: 'govuk-visually-hidden',
        text: hiddenPrefix
      })
    ]
  })
  errorMessage.appendChild(document.createTextNode(` ${message}`))
  return errorMessage
}

// Strip the error id token: any server-rendered error element with the same
// id was removed above, so keeping the token would duplicate the join and
// leave a dangling idref once the client error clears. Every other id —
// the hint's in particular — is carried through untouched.
const applyInputErrorState = (input, errorId) => {
  const previousDescribedby = (input.getAttribute(ARIA_DESCRIBEDBY) ?? '')
    .split(/\s+/)
    .filter((token) => token && token !== errorId)
    .join(' ')
  input.dataset.clientErrorPrevDescribedby = previousDescribedby
  input.dataset.clientError = `${CLIENT_ERROR_MARKER}-input`
  input.setAttribute(
    ARIA_DESCRIBEDBY,
    [previousDescribedby, errorId].filter(Boolean).join(' ')
  )
  input.classList.add('govuk-file-upload--error')
}

export const renderFieldError = (input, message, hiddenPrefix) => {
  const group = input.closest('.govuk-form-group')
  if (!group) {
    return
  }
  group.classList.add('govuk-form-group--error')
  group.dataset.clientError = `${CLIENT_ERROR_MARKER}-group`
  group.querySelector(`#${input.id}-error`)?.remove()
  const errorMessage = buildErrorMessageEl(
    `${input.id}-error`,
    message,
    hiddenPrefix
  )
  input.parentNode.insertBefore(errorMessage, input)
  applyInputErrorState(input, errorMessage.id)
}
