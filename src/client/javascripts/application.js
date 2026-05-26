import {
  createAll,
  Button,
  Checkboxes,
  ErrorSummary,
  Radios,
  SkipLink
} from 'govuk-frontend'

createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Radios)
createAll(SkipLink)

document.querySelectorAll('[data-module="dashboard-sort"]').forEach((form) => {
  form.addEventListener('change', (event) => {
    if (event.target.matches('select')) {
      form.submit()
    }
  })
})
