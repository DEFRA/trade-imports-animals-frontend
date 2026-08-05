import { isBlank } from '../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { copy as en } from '../../copy/copy.en.js'
import { changeAction, changeHref, editableActions } from './change-link.js'
import { escapeHtml, valueText } from './value-text.js'

const copy = copyFor({ en, cy })

export const row = ({
  label,
  value,
  obligationName,
  journeyId,
  scope,
  visuallyHiddenText = label,
  localeCopy = copy,
  changeLinkHref,
  readOnly = false
}) => {
  if (!scope.has(obligationName)) {
    return null
  }

  if (isBlank(value)) {
    if (readOnly) {
      return {
        key: { text: label },
        value: { text: localeCopy.notProvided }
      }
    }
    const href = changeLinkHref ?? changeHref(obligationName, journeyId)
    return {
      key: { text: label },
      value: {
        html: `<a class="govuk-link" href="${escapeHtml(href)}">${escapeHtml(localeCopy.missingAnswer)}<span class="govuk-visually-hidden"> ${escapeHtml(localeCopy.missingAnswerContext(label))}</span></a>`
      }
    }
  }

  return {
    key: { text: label },
    value: { text: valueText(value) },
    ...editableActions(
      readOnly,
      changeAction(
        obligationName,
        journeyId,
        visuallyHiddenText,
        localeCopy,
        changeLinkHref
      )
    )
  }
}

export const readOnlyRow = (label, value) => ({
  key: { text: label },
  value: { text: valueText(value) }
})
