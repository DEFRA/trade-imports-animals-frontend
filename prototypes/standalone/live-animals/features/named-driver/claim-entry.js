import { compose, currency, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'

/**
 * The nested driver-claim entry form: options, labels, view-model, payload
 * parser and validator. Moved here from the removed top-level claims feature
 * (inc-023) — the named-driver feature is now the only consumer, until its
 * own removal increment.
 */

export const CLAIM_TYPE_OPTIONS = [
  { value: 'accident', text: 'Accident' },
  { value: 'theft', text: 'Theft' },
  { value: 'windscreen', text: 'Windscreen' },
  { value: 'other', text: 'Something else' }
]
export const CLAIM_TYPE_LABEL = Object.fromEntries(
  CLAIM_TYPE_OPTIONS.map((option) => [option.value, option.text])
)

export const WINDSCREEN_PROVIDER_OPTIONS = [
  { value: 'autoglass', text: 'Autoglass' },
  { value: 'national-windscreens', text: 'National Windscreens' },
  { value: 'nationwide', text: 'Nationwide Windscreen Services' }
]
export const WINDSCREEN_PROVIDER_LABEL = Object.fromEntries(
  WINDSCREEN_PROVIDER_OPTIONS.map((option) => [option.value, option.text])
)

const fields = compose(
  oneOf(
    'claimType',
    CLAIM_TYPE_OPTIONS.map((option) => option.value)
  ),
  currency('claimAmount'),
  oneOf(
    'windscreenProvider',
    WINDSCREEN_PROVIDER_OPTIONS.map((option) => option.value)
  )
)

export const claimEntryModel = (values, errors = {}) => ({
  heading: 'Add a claim',
  buttonText: 'Add claim',
  values,
  windscreenOptions: WINDSCREEN_PROVIDER_OPTIONS.map((option) => ({
    ...option,
    checked: option.value === values.windscreenProvider
  })),
  errors,
  errorSummary: kit.errorSummary(errors)
})

export const claimFromPayload = (payload) => ({
  claimType: payload.claimType ?? '',
  claimAmount: (payload.claimAmount ?? '').trim(),
  windscreenProvider: payload.windscreenProvider ?? ''
})

export const validateClaim = (payload) => validate(fields, payload)
