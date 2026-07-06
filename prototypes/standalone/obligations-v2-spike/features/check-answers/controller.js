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

/**
 * Check your answers — bespoke summary composition (v1's "bespoke bypass"
 * is the NORM in v2). It owns its row order, its composed rows (Vehicle,
 * Claim N, add-on status) and its exact "Change <key>" accessible names.
 * The POST is the one soft gate: submit re-checks readiness server-side,
 * flips to submitted, and moves on to confirmation.
 */
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
const ADDON_LABEL = {
  'named-driver': 'Add a named driver',
  modifications: 'Declare vehicle modifications',
  'protected-ncd': 'Protect your no-claims discount'
}

/** ?change=1 return-to-CYA edit target for the page that owns an obligation. */
const changeHref = (obligationId) =>
  `${pagePath(slugOfPage(pageOfObligation(obligationId)))}?change=1`

const dateText = (value) =>
  isBlank(value) ? NOT_PROVIDED : `${value.day}/${value.month}/${value.year}`
const currency = (value) => (isBlank(value) ? NOT_PROVIDED : `£${value}`)

const buildRows = (answers) => {
  const val = (id) => answers[id]
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
    .map(val)
    .filter((v) => !isBlank(v))
    .join(' ')
  const rows = [
    row('Email', val('email'), 'email'),
    row('Name', val('fullName'), 'fullName'),
    row('Preferred name', val('preferredName'), 'preferredName'),
    row('Telephone', val('phone'), 'phone'),
    row('Postcode', val('postcode'), 'postcode'),
    row('Country', COUNTRY_LABEL[val('country')] ?? '', 'country'),
    row('Date of birth', dateText(val('dateOfBirth')), 'dateOfBirth'),
    row('Registration', val('registration'), 'registration'),
    row('Vehicle', vehicle, 'make'),
    row('Estimated value', currency(val('estimatedValue')), 'estimatedValue'),
    row('Years no claims', val('yearsNoClaims'), 'yearsNoClaims'),
    row('Recent claims', val('hadClaims') === 'yes' ? 'Yes' : 'No', 'hadClaims')
  ]

  // Claim N rows — bespoke composition over the loop library's instance facts,
  // only when the collection is in scope. The change target is DERIVED through
  // the dispatch seam (the page that owns `claims`) rather than a hardcoded slug.
  const claimsChangeHref = pagePath(slugOfPage(pageOfObligation('claims')))
  const claims =
    val('hadClaims') === 'yes' ? state.collectionView(answers, ['claims']) : []
  claims.forEach(({ index, entry }) => {
    const label = CLAIM_TYPE_LABEL[entry.claimType] ?? NOT_PROVIDED
    const amount = (entry.claimAmount ?? '').toString().trim()
    const base = amount ? `${label} — £${amount}` : label
    // A windscreen claim carries its approved repairer (item-scoped, 6c).
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
    val('voluntaryExcess') === 'yes' ? `£${val('excessAmount') || '0'}` : 'None'
  const extras = [].concat(val('extras') ?? []).map((v) => EXTRA_LABEL[v] ?? v)
  const addons = [].concat(val('addons') ?? []).map((v) => ADDON_LABEL[v] ?? v)

  rows.push(
    row('Penalty points', val('penaltyPoints') || '0', 'penaltyPoints'),
    row('Cover', COVER_LABEL[val('coverType')] ?? '', 'coverType'),
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
