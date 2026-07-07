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
import { commodityLineValue } from '../commodities/list.controller.js'
import { documentValue } from '../documents/list.controller.js'
import { REASON_FOR_IMPORT_LABEL } from '../import-reason/controller.js'
import { PURPOSE_IN_INTERNAL_MARKET_LABEL } from '../import-purpose/controller.js'
import { OVERLAND_MEANS } from '../transport/transport-details.controller.js'

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

// Change links to the commodities LOOP HUB — per-line edits live there.
const commodityRows = (answers) =>
  state.collectionView(answers, ['commodityLines']).map(({ index, entry }) => ({
    key: { text: `Commodity ${index + 1}` },
    value: { text: commodityLineValue(entry) },
    actions: {
      items: [
        {
          href: pagePath(slugOfPage(pageOfObligation('commodityLines'))),
          text: 'Change',
          visuallyHiddenText: `commodity ${index + 1}`
        }
      ]
    }
  }))

// Change links to the documents LOOP HUB — per-document edits live there.
const documentRows = (answers) =>
  state.collectionView(answers, ['documents']).map(({ index, entry }) => ({
    key: { text: `Document ${index + 1}` },
    value: { text: documentValue(entry) },
    actions: {
      items: [
        {
          href: pagePath(slugOfPage(pageOfObligation('documents'))),
          text: 'Change',
          visuallyHiddenText: `document ${index + 1}`
        }
      ]
    }
  }))

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
    ...commodityRows(answers),
    row(
      'Reason for import',
      REASON_FOR_IMPORT_LABEL[answerOf('reasonForImport')] ?? '',
      'reasonForImport'
    ),
    ...(answerOf('reasonForImport') === 'internal-market'
      ? [
          row(
            'Purpose in the internal market',
            PURPOSE_IN_INTERNAL_MARKET_LABEL[
              answerOf('purposeInInternalMarket')
            ] ?? '',
            'purposeInInternalMarket'
          )
        ]
      : []),
    ...documentRows(answers),
    // Each stored party is a copied { name, address } object (c-020); the
    // Change link resolves to the addresses landing page, which owns the
    // collects and links out to the select spokes.
    row('Place of origin', answerOf('placeOfOrigin')?.name, 'placeOfOrigin'),
    row('Consignor', answerOf('consignor')?.name, 'consignor'),
    row('Consignee', answerOf('consignee')?.name, 'consignee'),
    row('Importer', answerOf('importer')?.name, 'importer'),
    row(
      'Place of destination',
      answerOf('placeOfDestination')?.name,
      'placeOfDestination'
    ),
    row('Port of entry', answerOf('portOfEntry'), 'portOfEntry'),
    row(
      'Arrival date at port of entry',
      dateText(answerOf('arrivalDateAtPort')),
      'arrivalDateAtPort'
    ),
    // The stored means IS the V4 label (no code lookup needed).
    row('Means of transport', answerOf('meansOfTransport'), 'meansOfTransport'),
    row(
      'Transport identification',
      answerOf('transportIdentification'),
      'transportIdentification'
    ),
    row(
      'Transport document reference',
      answerOf('transportDocumentReference'),
      'transportDocumentReference'
    ),
    ...(OVERLAND_MEANS.includes(answerOf('meansOfTransport'))
      ? [
          row(
            'Transited countries',
            []
              .concat(answerOf('transitedCountries') ?? [])
              .map((code) => COUNTRY_OF_ORIGIN_LABEL[code] ?? code)
              .join(', '),
            'transitedCountries'
          )
        ]
      : []),
    // The stored type IS the V4 label (no code lookup needed).
    row('Transporter type', answerOf('transporterType'), 'transporterType'),
    // The stored transporter is a copied { name, address, approvalNumber }
    // object (c-020), owed only on the commercial branch of the type split.
    ...(answerOf('transporterType') === 'Commercial transporter'
      ? [
          row(
            'Commercial transporter',
            answerOf('commercialTransporter')?.name,
            'commercialTransporter'
          )
        ]
      : []),
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
