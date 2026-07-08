/**
 * Presentation — per-obligation human copy for the browsable prototype.
 *
 * Keyed by obligation id. Each entry may carry:
 *   pageTitle:   the <h1> and browser-tab title for a page whose sole
 *                presented obligation is this one.
 *   legend:      the fieldset legend for radios / checkboxes / date, or
 *                the input label for text / date.
 *   hint:        under-the-legend guidance text.
 *
 * The domain entry's `labels` map (attached by the factory helpers) is
 * the source of truth for enum option copy; presentation.js does not
 * duplicate them.
 *
 * When no entry exists for an obligation, `humaniseId` is the fallback:
 *   'internal-market' → 'Internal market'
 *   'reasonForImport' → 'Reason for import'
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
import { certifiedForOptionsLookup } from '../domain/index.js'

export const presentation = new Map([
  [
    countryOfOrigin.id,
    {
      pageTitle: 'Country of origin',
      legend: 'Which country are the animals coming from?',
      hint: 'The country the animals were kept in before this consignment.'
    }
  ],
  [
    reasonForImport.id,
    {
      pageTitle: 'Reason for import',
      legend: 'Why are the animals being imported?',
      hint: null
    }
  ],
  [
    purposeInInternalMarket.id,
    {
      pageTitle: 'Purpose in the internal market',
      legend: 'What is the purpose of the internal-market movement?',
      hint: 'Only shown when the reason for import is Internal market.'
    }
  ],
  [
    transporterType.id,
    {
      pageTitle: 'Type of transporter',
      legend: 'What kind of transporter is bringing the animals?',
      hint: null
    }
  ],
  [
    commercialTransporter.id,
    {
      pageTitle: 'Commercial transporter',
      legend: 'Commercial transporter details',
      hint: 'The approved commercial carrier used for this consignment.'
    }
  ],
  [
    privateTransporter.id,
    {
      pageTitle: 'Private transporter',
      legend: 'Private transporter details',
      hint: 'The private-transporter contact details for this consignment.'
    }
  ],
  [
    meansOfTransport.id,
    {
      pageTitle: 'Means of transport',
      legend: 'How are the animals being transported?',
      hint: null
    }
  ],
  [
    transportIdentification.id,
    {
      pageTitle: 'Transport identification',
      legend: 'Transport identification',
      hint: 'Vehicle registration, vessel name, flight number, or similar.'
    }
  ],
  [
    transportDocumentReference.id,
    {
      pageTitle: 'Transport document reference',
      legend: 'Transport document reference',
      hint: 'A CMR, bill of lading, or equivalent document reference.'
    }
  ],
  [
    transitedCountries.id,
    {
      pageTitle: 'Transited countries',
      legend: 'Which countries have the animals travelled through?',
      hint: 'Select up to 12 countries.'
    }
  ],
  [
    arrivalDateAtPort.id,
    {
      pageTitle: 'Arrival at port',
      legend: 'Expected arrival date at the port of entry',
      hint: 'DD/MM/YYYY.'
    }
  ],
  [
    portOfEntry.id,
    {
      pageTitle: 'Port of entry',
      legend: 'Port of entry',
      hint: null
    }
  ],
  [
    animalsCertifiedFor.id,
    {
      pageTitle: 'Animals certified for',
      legend: 'What are the animals certified for?',
      hint: 'Options are loaded from the certificate.'
    }
  ],
  [
    containsUnweanedAnimals.id,
    {
      pageTitle: 'Contains unweaned animals',
      legend: 'Are there any unweaned animals in this consignment?',
      hint: 'An unweaned animal is still dependent on its mother for milk.'
    }
  ],
  [
    regionCodeRequirement.id,
    {
      pageTitle: 'Region of origin code',
      legend: 'Does the country of origin require a region code?',
      hint: 'Some countries require an ISO region code alongside the country code.'
    }
  ],
  [
    regionCode.id,
    {
      pageTitle: 'Region code',
      legend: 'Enter the region of origin code',
      hint: 'Up to 5 characters. For example, FR-75.'
    }
  ],
  [
    certifiedForOptionsLookup.id,
    {
      pageTitle: 'Loading options',
      legend: 'Loading',
      hint: 'The system is looking up the certified-for options.'
    }
  ],
  [
    internalReferenceNumber.id,
    {
      pageTitle: 'Your reference',
      legend: 'Your reference for this consignment (optional)',
      hint: 'A trader reference (max 58 characters).'
    }
  ],
  [
    commodityCode.id,
    {
      pageTitle: 'Commodity code',
      legend: 'Commodity code',
      hint: 'The V4 commodity code for this line.'
    }
  ],
  [
    species.id,
    {
      pageTitle: 'Species',
      legend: 'Which species are on this line?',
      hint: 'Select all that apply.'
    }
  ],
  [
    numberOfAnimals.id,
    {
      pageTitle: 'Number of animals',
      legend: 'How many animals are on this line?',
      hint: null
    }
  ],
  [
    numberOfPackages.id,
    {
      pageTitle: 'Number of packages',
      legend: 'Number of packages (optional)',
      hint: null
    }
  ],
  [
    cph.id,
    {
      pageTitle: 'County Parish Holding (CPH)',
      legend: 'CPH',
      hint: 'Required for cattle, pigs, sheep and goats. Max 11 characters.'
    }
  ]
])

const PAGE_COPY = new Map([
  [
    'commodity-lines-intro',
    {
      pageTitle: 'Commodity lines',
      lead: 'You need to add at least one commodity line. Each line captures a commodity code, the type, species and count.'
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
  return PAGE_COPY.get(pageName) ?? { pageTitle: humaniseId(pageName) }
}

export function forObligation(obligation) {
  return (
    presentation.get(obligation.id) ?? {
      pageTitle: humaniseId(obligation.name),
      legend: humaniseId(obligation.name),
      hint: null
    }
  )
}
