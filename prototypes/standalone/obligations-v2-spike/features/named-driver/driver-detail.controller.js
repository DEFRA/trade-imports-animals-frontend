import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'
import { CLAIM_TYPE_LABEL } from '../claims/entry.controller.js'
import { RELATIONSHIP_OPTIONS } from './driver-entry.controller.js'

const view = `${TEMPLATES}/features/named-driver/driver-detail`

const RELATIONSHIP_LABEL = Object.fromEntries(
  RELATIONSHIP_OPTIONS.map((option) => [option.value, option.text])
)

const claimValue = (entry) => {
  const label = CLAIM_TYPE_LABEL[entry.claimType] ?? 'Not provided'
  const amount = (entry.claimAmount ?? '').toString().trim()
  return amount ? `${label} — £${amount}` : label
}

const driverIndexOf = (request, answers) => {
  const index = Number(request.params.driver)
  const drivers = answers.drivers ?? []
  return Number.isInteger(index) && index >= 0 && index < drivers.length
    ? index
    : null
}

const get = (request, h) => {
  const { answers } = state.get(request, h)
  const driverIndex = driverIndexOf(request, answers)
  if (driverIndex === null) return h.redirect(pagePath('addons/named-driver'))
  const driver = answers.drivers[driverIndex]

  const claimRows = state
    .collectionView(answers, ['drivers', driverIndex, 'claims'])
    .map(({ index, entry }) => ({
      key: { text: `Claim ${index + 1}` },
      value: { text: claimValue(entry) },
      actions: {
        items: [
          {
            href: pagePath(
              `addons/named-driver/${driverIndex}/claims/${index}/remove`
            ),
            text: 'Remove',
            visuallyHiddenText: `claim ${index + 1}`
          }
        ]
      }
    }))

  return h.view(view, {
    ...kit.base('Named driver', {
      backLink: pagePath('addons/named-driver')
    }),
    heading: (driver.driverName ?? '').trim() || `Driver ${driverIndex + 1}`,
    detailRows: [
      {
        key: { text: 'Full name' },
        value: { text: driver.driverName || 'Not provided' }
      },
      {
        key: { text: 'Relationship' },
        value: {
          text: RELATIONSHIP_LABEL[driver.relationship] ?? 'Not provided'
        }
      }
    ],
    claimRows,
    hasClaims: claimRows.length > 0,
    addClaimHref: pagePath(`addons/named-driver/${driverIndex}/claims/add`),
    addClaimText: claimRows.length ? 'Add another claim' : 'Add a claim',
    emptyClaimsText: 'You have not added any claims for this driver yet.'
  })
}

const post = (request, h) => {
  return h.redirect(pagePath('addons/named-driver'))
}

export const routes = [
  {
    method: 'GET',
    path: pagePath('addons/named-driver/{driver}'),
    options: open,
    handler: get
  },
  {
    method: 'POST',
    path: pagePath('addons/named-driver/{driver}'),
    options: open,
    handler: post
  }
]
