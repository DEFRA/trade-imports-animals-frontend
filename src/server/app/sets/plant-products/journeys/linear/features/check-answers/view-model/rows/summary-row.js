import { isBlank } from '../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { copy as en } from '../../copy/copy.en.js'
import { changeAction, changeHref } from './change-link.js'
import { escapeHtml, valueText } from './value-text.js'

const copy = copyFor({ en, cy })

export const row = ({
  label,
  value,
  obligationName,
  journeyId,
  scope,
  visuallyHiddenText = label
}) => {
  if (!scope.has(obligationName)) return null

  if (isBlank(value)) {
    const href = changeHref(obligationName, journeyId)
    return {
      key: { text: label },
      value: {
        html: `<a class="govuk-link" href="${escapeHtml(href)}">${escapeHtml(copy.missingAnswer)}<span class="govuk-visually-hidden"> for ${escapeHtml(label.toLowerCase())}</span></a>`
      }
    }
  }

  return {
    key: { text: label },
    value: { text: valueText(value) },
    actions: changeAction(obligationName, journeyId, visuallyHiddenText)
  }
}

export const readOnlyRow = (label, value) => ({
  key: { text: label },
  value: { text: valueText(value) }
})
