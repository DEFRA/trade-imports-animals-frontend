import {
  textInputView,
  emailInputView,
  telInputView,
  numberInputView,
  currencyInputView,
  postcodeInputView,
  textareaView
} from './input-views.js'
import {
  dateView,
  radiosView,
  checkboxesView,
  selectView
} from './choice-views.js'

const VIEW_BUILDERS = {
  text: textInputView,
  email: emailInputView,
  tel: telInputView,
  number: numberInputView,
  currency: currencyInputView,
  postcode: postcodeInputView,
  textarea: textareaView,
  date: dateView,
  radios: radiosView,
  checkboxes: checkboxesView,
  select: selectView
}

export const fieldToView = (field, answers) => {
  const builder = VIEW_BUILDERS[field.kind] ?? textInputView
  return builder(field, answers[field.name])
}
