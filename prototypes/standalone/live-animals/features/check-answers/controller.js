import { breadcrumbs, pagePath, TEMPLATES } from '../../config.js'
import { pageOfObligation, slugOfPage } from '../../flow/dispatch.js'
import * as state from '../../engine/index.js'
import { calculatePremium } from '../../lib/quote.js'
import { isBlank } from '../../lib/answered.js'
import { open } from '../../shared/kit.js'
import {
  CLAIM_TYPE_LABEL,
  WINDSCREEN_PROVIDER_LABEL
} from '../claims/entry.controller.js'
import { COUNTRY_OF_ORIGIN_LABEL } from '../origin/controller.js'

const view = `${TEMPLATES}/features/check-answers/template`
const NOT_PROVIDED = 'Not provided'

const COUNTRY_LABEL = {
  england: 'England',
  scotland: 'Scotland',
  wales: 'Wales',
  'northern-ireland': 'Northern Ireland'
}
const COVER_LABEL = {
  comprehensive: 'Comprehensive',
  'third-party-fire-theft': 'Third party, fire and theft',
  'third-party': 'Third party only'
}
const EXTRA_LABEL = {
  breakdown: 'Breakdown cover',
  'courtesy-car': 'Courtesy car',
  legal: 'Motor legal protection',
  windscreen: 'Windscreen cover'
}
const YES_NO_LABEL = { yes: 'Yes', no: 'No' }
const ADDON_LABEL = {
  'named-driver': 'Add a named driver',
  modifications: 'Declare vehicle modifications',
  'protected-ncd': 'Protect your no-claims discount'
}

const changeHref = (obligationId) =>
  `${pagePath(slugOfPage(pageOfObligation(obligationId)))}?change=1`

const dateText = (value) =>
  isBlank(value) ? NOT_PROVIDED : `${value.day}/${value.month}/${value.year}`
const currency = (value) => (isBlank(value) ? NOT_PROVIDED : `£${value}`)

const buildRows = (answers) => {
  const answerOf = (id) => answers[id]
  const row = (key, value, obligationId) => ({
    key: { text: key },
    value: { text: isBlank(value) ? NOT_PROVIDED : value },
    actions: {
      items: [
        {
          href: changeHref(obligationId),
          text: 'Change',
          visuallyHiddenText: key.toLowerCase()
        }
      ]
    }
  })

  const vehicle = ['make', 'model', 'year']
    .map(answerOf)
    .filter((part) => !isBlank(part))
    .join(' ')
  const rows = [
    row(
      'Country of origin',
      COUNTRY_OF_ORIGIN_LABEL[answerOf('countryOfOrigin')] ?? '',
      'countryOfOrigin'
    ),
    row(
      'Region of origin code required',
      YES_NO_LABEL[answerOf('regionOfOriginCodeRequirement')] ?? '',
      'regionOfOriginCodeRequirement'
    ),
    ...(answerOf('regionOfOriginCodeRequirement') === 'yes'
      ? [
          row(
            'Region of origin code',
            answerOf('regionOfOriginCode'),
            'regionOfOriginCode'
          )
        ]
      : []),
    row(
      'Internal reference number',
      answerOf('internalReferenceNumber'),
      'internalReferenceNumber'
    ),
    row('Email', answerOf('email'), 'email'),
    row('Name', answerOf('fullName'), 'fullName'),
    row('Preferred name', answerOf('preferredName'), 'preferredName'),
    row('Telephone', answerOf('phone'), 'phone'),
    row('Postcode', answerOf('postcode'), 'postcode'),
    row('Country', COUNTRY_LABEL[answerOf('country')] ?? '', 'country'),
    row('Date of birth', dateText(answerOf('dateOfBirth')), 'dateOfBirth'),
    row('Registration', answerOf('registration'), 'registration'),
    row('Vehicle', vehicle, 'make'),
    row(
      'Estimated value',
      currency(answerOf('estimatedValue')),
      'estimatedValue'
    ),
    row('Years no claims', answerOf('yearsNoClaims'), 'yearsNoClaims'),
    row(
      'Recent claims',
      answerOf('hadClaims') === 'yes' ? 'Yes' : 'No',
      'hadClaims'
    )
  ]

  const claimsChangeHref = pagePath(slugOfPage(pageOfObligation('claims')))
  const claims =
    answerOf('hadClaims') === 'yes'
      ? state.collectionView(answers, ['claims'])
      : []
  claims.forEach(({ index, entry }) => {
    const label = CLAIM_TYPE_LABEL[entry.claimType] ?? NOT_PROVIDED
    const amount = (entry.claimAmount ?? '').toString().trim()
    const base = amount ? `${label} — £${amount}` : label
    const provider =
      entry.claimType === 'windscreen' && entry.windscreenProvider
        ? ` (${WINDSCREEN_PROVIDER_LABEL[entry.windscreenProvider] ?? entry.windscreenProvider})`
        : ''
    rows.push({
      key: { text: `Claim ${index + 1}` },
      value: { text: `${base}${provider}` },
      actions: {
        items: [
          {
            href: claimsChangeHref,
            text: 'Change',
            visuallyHiddenText: `claim ${index + 1}`
          }
        ]
      }
    })
  })

  const excess =
    answerOf('voluntaryExcess') === 'yes'
      ? `£${answerOf('excessAmount') || '0'}`
      : 'None'
  const extras = []
    .concat(answerOf('extras') ?? [])
    .map((extra) => EXTRA_LABEL[extra] ?? extra)
  const addons = []
    .concat(answerOf('addons') ?? [])
    .map((addon) => ADDON_LABEL[addon] ?? addon)

  rows.push(
    row('Penalty points', answerOf('penaltyPoints') || '0', 'penaltyPoints'),
    row('Cover', COVER_LABEL[answerOf('coverType')] ?? '', 'coverType'),
    row('Voluntary excess', excess, 'voluntaryExcess'),
    row(
      'Optional extras',
      extras.length ? extras.join(', ') : 'None',
      'extras'
    ),
    row('Added to policy', addons.length ? addons.join(', ') : 'None', 'addons')
  )
  return rows
}

const renderCya = (h, answers) =>
  h.view(view, {
    pageTitle: 'Check your answers',
    heading: 'Check your answers',
    rows: buildRows(answers),
    premium: calculatePremium(answers),
    backLink: pagePath('quote-summary'),
    breadcrumbs: breadcrumbs('Check your answers')
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return renderCya(h, answers)
}

const post = (request, h) => {
  const result = state.submitJourney(request, h)
  if (result.ok) return h.redirect(pagePath('confirmation'))
  return renderCya(h, result.journey.answers)
}

export const routes = [
  {
    method: 'GET',
    path: pagePath('check-answers'),
    options: open,
    handler: get
  },
  {
    method: 'POST',
    path: pagePath('check-answers'),
    options: open,
    handler: post
  }
]
