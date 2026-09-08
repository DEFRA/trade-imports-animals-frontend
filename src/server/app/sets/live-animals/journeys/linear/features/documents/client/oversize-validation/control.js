const WRAPPER = '.govuk-file-upload-wrapper'
const BUTTON = '.govuk-file-upload-button'
const INPUT = 'input[type="file"]'

// The enhanced file upload hides the input inside a wrapper and puts a button
// in front of it that takes over the field's id. An error therefore has to
// point at, and describe, the button — while the error class and the file
// itself still belong to the input. Unenhanced, the two are the same element.

export const uploadControl = (input) =>
  input.closest(WRAPPER)?.querySelector(BUTTON) ?? input

export const uploadInput = (control) =>
  control.closest(WRAPPER)?.querySelector(INPUT) ?? control

// The error message goes above the whole drop zone, not inside it.
export const uploadAnchor = (input) => input.closest(WRAPPER) ?? input
