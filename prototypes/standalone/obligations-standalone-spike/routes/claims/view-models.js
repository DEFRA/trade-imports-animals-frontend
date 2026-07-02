import { pagePath } from '../../journey/index.js'
import {
  amountEntry,
  flow,
  isBlank,
  page,
  typeEntry,
  typeLabel
} from './page-model.js'

/**
 * View-models for the claims loop: the manage-list summary rows and the
 * hand-built add-form fields, both pure over an evaluation.
 */

/** 'Claim N' summary rows with 'Remove claim N' accessible names. A
 * typeless claim still counts (spike-a parity) as 'Not provided'. */
export const claimRows = (evaluation) => {
  const { listCopy } = page
  const claims = evaluation.obligations[typeEntry.obligation].fulfilments
  return claims.map(({ fulfilmentId }, index) => {
    const stored = evaluation.fulfilments
    const type = stored[typeEntry.obligation]?.[fulfilmentId]?.value
    const amount = stored[amountEntry.obligation]?.[fulfilmentId]?.value
    const label = typeLabel(type) ?? flow.checkYourAnswers.notProvidedText
    const nth = String(index + 1)
    return {
      key: { text: listCopy.rowKey.replace('{index}', nth) },
      value: { text: isBlank(amount) ? label : `${label} — £${amount}` },
      actions: {
        items: [
          {
            href: pagePath(`claims/${index}/remove`),
            text: listCopy.removeActionText,
            visuallyHiddenText: listCopy.removeHiddenText.replace(
              '{index}',
              nth
            )
          }
        ]
      }
    }
  })
}

// Bespoke (graft 9): a fresh claim has no fulfilment id yet, so the
// generic pageViewModel expansion (one slot per EXISTING fulfilment)
// cannot project the add form. The two FieldViewItems are hand-built
// from the Flow entries' copy, named plainly the way addFulfilment's
// values expect — the model has no list-management vocabulary (TOOL-14).
export const addFields = () => [
  {
    type: 'radios',
    args: {
      name: 'claimType',
      fieldset: {
        legend: { text: typeEntry.label, classes: 'govuk-fieldset__legend--m' }
      },
      items: (typeEntry.options ?? []).map(({ value, label }) => ({
        value,
        text: label
      }))
    }
  },
  {
    type: 'input',
    args: {
      id: 'claimAmount',
      name: 'claimAmount',
      label: { text: amountEntry.label },
      inputmode: 'numeric',
      prefix: { text: '£' },
      classes: 'govuk-input--width-5'
    }
  }
]
