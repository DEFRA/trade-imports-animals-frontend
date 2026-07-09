/**
 * Presentation — per-obligation human copy for the browsable prototype.
 *
 * The map values below store MESSAGE KEYS resolved via `lib/i18n.js`
 * (`t(key)` → `locales/en.json`). `forObligation()` / `pageCopy()`
 * return resolved English strings, so consumers don't have to know
 * about keys. See NEXT.md P0.5 for the roadmap to Welsh support.
 *
 * When no entry exists for an obligation, `humaniseId` is the fallback:
 *   'internal-market' → 'Internal market'
 *   'reasonForImport' → 'Reason for import'
 *
 * Entries omit `hintKey` when there's genuinely no hint (rather than
 * carrying a null key that would need a null-valued en.json entry).
 */

import {
  reasonForImport,
  purposeInInternalMarket,
  transporterType,
  commercialTransporter,
  privateTransporter,
  meansOfTransport,
  transportIdentification,
  transportDocumentReference,
  transitedCountries,
  arrivalDateAtPort,
  portOfEntry,
  animalsCertifiedFor,
  internalReferenceNumber,
  countryOfOrigin,
  commodityCode,
  species,
  numberOfAnimals,
  numberOfPackages,
  cph,
  containsUnweanedAnimals,
  regionCodeRequirement,
  regionCode
} from '../obligations/obligations.js'
import { t } from './i18n.js'

/**
 * Registry of message keys keyed by obligation id. Every entry has a
 * `pageTitleKey` and a `legendKey`; `hintKey` is optional (present only
 * for obligations that have a hint).
 *
 * Coverage test in `i18n-coverage.test.js` walks this map and asserts
 * every key resolves in `locales/en.json`.
 */
export const OBLIGATION_KEYS = new Map([
  [
    countryOfOrigin.id,
    {
      pageTitleKey: 'presentation.countryOfOrigin.pageTitle',
      legendKey: 'presentation.countryOfOrigin.legend',
      hintKey: 'presentation.countryOfOrigin.hint'
    }
  ],
  [
    reasonForImport.id,
    {
      pageTitleKey: 'presentation.reasonForImport.pageTitle',
      legendKey: 'presentation.reasonForImport.legend'
    }
  ],
  [
    purposeInInternalMarket.id,
    {
      pageTitleKey: 'presentation.purposeInInternalMarket.pageTitle',
      legendKey: 'presentation.purposeInInternalMarket.legend',
      hintKey: 'presentation.purposeInInternalMarket.hint'
    }
  ],
  [
    transporterType.id,
    {
      pageTitleKey: 'presentation.transporterType.pageTitle',
      legendKey: 'presentation.transporterType.legend'
    }
  ],
  [
    commercialTransporter.id,
    {
      pageTitleKey: 'presentation.commercialTransporter.pageTitle',
      legendKey: 'presentation.commercialTransporter.legend',
      hintKey: 'presentation.commercialTransporter.hint'
    }
  ],
  [
    privateTransporter.id,
    {
      pageTitleKey: 'presentation.privateTransporter.pageTitle',
      legendKey: 'presentation.privateTransporter.legend',
      hintKey: 'presentation.privateTransporter.hint'
    }
  ],
  [
    meansOfTransport.id,
    {
      pageTitleKey: 'presentation.meansOfTransport.pageTitle',
      legendKey: 'presentation.meansOfTransport.legend'
    }
  ],
  [
    transportIdentification.id,
    {
      pageTitleKey: 'presentation.transportIdentification.pageTitle',
      legendKey: 'presentation.transportIdentification.legend',
      hintKey: 'presentation.transportIdentification.hint'
    }
  ],
  [
    transportDocumentReference.id,
    {
      pageTitleKey: 'presentation.transportDocumentReference.pageTitle',
      legendKey: 'presentation.transportDocumentReference.legend',
      hintKey: 'presentation.transportDocumentReference.hint'
    }
  ],
  [
    transitedCountries.id,
    {
      pageTitleKey: 'presentation.transitedCountries.pageTitle',
      legendKey: 'presentation.transitedCountries.legend',
      hintKey: 'presentation.transitedCountries.hint'
    }
  ],
  [
    arrivalDateAtPort.id,
    {
      pageTitleKey: 'presentation.arrivalDateAtPort.pageTitle',
      legendKey: 'presentation.arrivalDateAtPort.legend',
      hintKey: 'presentation.arrivalDateAtPort.hint'
    }
  ],
  [
    portOfEntry.id,
    {
      pageTitleKey: 'presentation.portOfEntry.pageTitle',
      legendKey: 'presentation.portOfEntry.legend',
      hintKey: 'presentation.portOfEntry.hint'
    }
  ],
  [
    animalsCertifiedFor.id,
    {
      pageTitleKey: 'presentation.animalsCertifiedFor.pageTitle',
      legendKey: 'presentation.animalsCertifiedFor.legend',
      hintKey: 'presentation.animalsCertifiedFor.hint'
    }
  ],
  [
    containsUnweanedAnimals.id,
    {
      pageTitleKey: 'presentation.containsUnweanedAnimals.pageTitle',
      legendKey: 'presentation.containsUnweanedAnimals.legend',
      hintKey: 'presentation.containsUnweanedAnimals.hint'
    }
  ],
  [
    regionCodeRequirement.id,
    {
      pageTitleKey: 'presentation.regionCodeRequirement.pageTitle',
      legendKey: 'presentation.regionCodeRequirement.legend',
      hintKey: 'presentation.regionCodeRequirement.hint'
    }
  ],
  [
    regionCode.id,
    {
      pageTitleKey: 'presentation.regionCode.pageTitle',
      legendKey: 'presentation.regionCode.legend',
      hintKey: 'presentation.regionCode.hint'
    }
  ],
  [
    internalReferenceNumber.id,
    {
      pageTitleKey: 'presentation.internalReferenceNumber.pageTitle',
      legendKey: 'presentation.internalReferenceNumber.legend',
      hintKey: 'presentation.internalReferenceNumber.hint'
    }
  ],
  [
    commodityCode.id,
    {
      pageTitleKey: 'presentation.commodityCode.pageTitle',
      legendKey: 'presentation.commodityCode.legend',
      hintKey: 'presentation.commodityCode.hint'
    }
  ],
  [
    species.id,
    {
      pageTitleKey: 'presentation.species.pageTitle',
      legendKey: 'presentation.species.legend',
      hintKey: 'presentation.species.hint'
    }
  ],
  [
    numberOfAnimals.id,
    {
      pageTitleKey: 'presentation.numberOfAnimals.pageTitle',
      legendKey: 'presentation.numberOfAnimals.legend'
    }
  ],
  [
    numberOfPackages.id,
    {
      pageTitleKey: 'presentation.numberOfPackages.pageTitle',
      legendKey: 'presentation.numberOfPackages.legend'
    }
  ],
  [
    cph.id,
    {
      pageTitleKey: 'presentation.cph.pageTitle',
      legendKey: 'presentation.cph.legend',
      hintKey: 'presentation.cph.hint'
    }
  ]
])

/**
 * PAGE_COPY — copy for non-obligation-driven pages (currently just the
 * read-only commodity-lines intro).
 */
export const PAGE_KEYS = new Map([
  [
    'commodity-lines-intro',
    {
      pageTitleKey: 'pageCopy.commodity-lines-intro.pageTitle',
      leadKey: 'pageCopy.commodity-lines-intro.lead'
    }
  ]
])

export function humaniseId(id) {
  if (!id) return ''
  return id
    .replace(/([A-Z])/g, ' $1')
    .replace(/-/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
}

export function pageCopy(pageName) {
  const entry = PAGE_KEYS.get(pageName)
  if (!entry) return { pageTitle: humaniseId(pageName) }
  return {
    pageTitle: t(entry.pageTitleKey),
    lead: t(entry.leadKey)
  }
}

export function forObligation(obligation) {
  const entry = OBLIGATION_KEYS.get(obligation.id)
  if (!entry) {
    return {
      pageTitle: humaniseId(obligation.name),
      legend: humaniseId(obligation.name),
      hint: null
    }
  }
  return {
    pageTitle: t(entry.pageTitleKey),
    legend: t(entry.legendKey),
    hint: entry.hintKey ? t(entry.hintKey) : null
  }
}
