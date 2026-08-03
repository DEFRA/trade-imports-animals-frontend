import { AMEND, DRAFT, SUBMITTED } from '../../../../../../../engine/index.js'

export const STATUS_VOCABULARY = Object.freeze({
  [DRAFT]: Object.freeze({
    copyKey: 'draft',
    tagClass: 'govuk-tag--grey'
  }),
  [SUBMITTED]: Object.freeze({
    copyKey: 'submitted',
    tagClass: 'govuk-tag--blue'
  }),
  [AMEND]: Object.freeze({
    copyKey: 'amend',
    tagClass: 'govuk-tag--yellow'
  })
})

export const statusView = (status, copy) => {
  const vocabulary = STATUS_VOCABULARY[status]
  return vocabulary
    ? {
        label: copy.statuses[vocabulary.copyKey],
        tagClass: vocabulary.tagClass
      }
    : { label: '', tagClass: '' }
}

export const statusFilterOptions = (copy) => [
  { value: '', text: copy.filters.status.all },
  ...Object.entries(STATUS_VOCABULARY).map(([value, vocabulary]) => ({
    value,
    text: copy.statuses[vocabulary.copyKey]
  }))
]
