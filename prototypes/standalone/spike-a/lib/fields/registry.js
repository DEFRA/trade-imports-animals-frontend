import {
  textInputView,
  emailInputView,
  telInputView,
  numberInputView,
  currencyInputView,
  postcodeInputView
} from './input-views.js'
import { textareaView, dateView } from './block-views.js'
import { radiosView, checkboxesView, selectView } from './choice-views.js'

const viewBuilders = {
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

export const fieldToView = (field, answers) =>
  (viewBuilders[field.kind] ?? viewBuilders.text)(field, answers[field.name])
