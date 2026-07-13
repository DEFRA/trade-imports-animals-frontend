/**
 * Shared helpers for the EUDPA-249 flow-layer spike's Playwright suite.
 *
 * The suite is data-driven: every spec walks each entry in `JOURNEYS`,
 * so multiple variants of the same journey (should any land in future
 * — e.g. a Joi-adopted rerun, or a comparison against the pre-P0
 * status alphabet) can be exercised without spec churn. Today there's
 * one variant.
 *
 * `fill*` helpers know how to fill and submit a single page. They do
 * NOT navigate — the spec drives navigation via /start's redirect
 * chain (matching the vitest e2e-walk suite's shape).
 */

import { expect } from '@playwright/test'

export const JOURNEYS = [
  {
    id: 'v4-flow-layer',
    label: 'EUDPA-249 V4 flow-layer spike',
    base: '/prototype/eudpa-249'
  }
]

// A representative fully-populated commercial-transporter address.
// Reused across the transporter and trader-details walks so a change
// to the address widget is caught once, not per-page.
export const ADDRESS = {
  addressLine1: '1 Farm Lane',
  town: 'Exeter',
  postcode: 'EX1 1AA',
  country: 'GB',
  telephone: '+44 1234 567890',
  email: 'contact@example.com'
}

// ---------------------------------------------------------------------
// Small primitives shared by every fill helper.
// ---------------------------------------------------------------------

async function submit(page) {
  await page.getByRole('button', { name: 'Save and continue' }).click()
}

async function expectPageTitle(page, title) {
  // Titles for flow-driven pages are rendered as an h1 with the same
  // text as the browser tab title (spike convention). We assert the
  // heading rather than the tab to keep the fixture readable.
  await expect(
    page.getByRole('heading', { name: title, level: 1 })
  ).toBeVisible()
}

// Address widgets present 9 sub-inputs keyed `${obligation}__${sub}`.
// Only `name` and `addressLine1` are strictly required at the CYA
// "structural completeness" level; the walk fills a representative set
// so the composite shows a rich value on CYA.
async function fillAddress(page, obligation, { name, ...rest }) {
  const values = { name, ...ADDRESS, ...rest }
  for (const [sub, value] of Object.entries(values)) {
    if (value === undefined) continue
    await page.locator(`[name="${obligation}__${sub}"]`).fill(String(value))
  }
}

// ---------------------------------------------------------------------
// One helper per page (or per small cluster of pages) — matches the
// shape of the parent-layouts branch's fillEmail / fillAboutYou etc.
// ---------------------------------------------------------------------

export async function goToStart(page, journey) {
  await page.goto(`${journey.base}/start`)
}

export async function resetSession(page, journey) {
  // Ensures every test starts from a clean yar session. Same primitive
  // the reset-controller exposes at the app level; here we hit it as a
  // POST via a same-origin form to trigger the CSRF token exchange.
  await page.request.post(`${journey.base}/reset`, {
    form: {}
  })
}

export async function fillCountryOfOrigin(page, { country = 'FR' } = {}) {
  await expectPageTitle(page, 'Country of origin')
  await page.getByLabel('Country of origin').selectOption(country)
  await submit(page)
}

export async function fillRegionCodeRequirement(page, { answer = 'no' } = {}) {
  await expectPageTitle(page, 'Do you know the region code?')
  await page
    .getByRole('radio', { name: answer === 'yes' ? 'Yes' : 'No' })
    .check()
  await submit(page)
}

export async function fillReasonForImport(page, { reason }) {
  await expectPageTitle(page, 'Reason for import')
  const label =
    reason === 'internal-market'
      ? 'Movement to the internal market'
      : reason === 'transit'
        ? 'Transit through the EU'
        : reason
  await page.getByRole('radio', { name: label, exact: true }).check()
  await submit(page)
}

export async function fillPurposeInInternalMarket(page, { purpose }) {
  await expectPageTitle(page, 'Purpose in the internal market')
  await page.getByLabel('Purpose in the internal market').selectOption(purpose)
  await submit(page)
}

export async function fillTransporterType(page, { transporterType }) {
  await expectPageTitle(page, 'Transporter type')
  await page
    .getByRole('radio', {
      name: transporterType === 'commercial' ? 'Commercial' : 'Private'
    })
    .check()
  await submit(page)
}

export async function fillCommercialTransporterDetails(page) {
  await expectPageTitle(page, 'Transporter details')
  await fillAddress(page, 'commercialTransporter', {
    name: 'ACME Transport Ltd',
    transporterAuthorisationNumber: 'UK/AUTH/2026/001'
  })
  await submit(page)
}

export async function fillMeansOfTransport(
  page,
  { means = 'road-vehicle' } = {}
) {
  await expectPageTitle(page, 'Means of transport')
  await page.getByLabel('Means of transport').selectOption(means)
  await submit(page)
}

export async function fillTransportIdentification(page) {
  await expectPageTitle(page, 'Transport identification')
  await page.getByLabel('Transport identification').fill('REG-123')
  await page.getByLabel('Transport document reference').fill('DOC-456')
  await submit(page)
}

export async function fillArrivalDetails(
  page,
  { arrivalDate = '12/12/2026', portOfEntry = 'DVR' } = {}
) {
  await expectPageTitle(page, 'Arrival details')
  await page.getByLabel('Arrival date at port').fill(arrivalDate)
  await page.getByLabel('Port of entry').selectOption(portOfEntry)
  await submit(page)
}

export async function fillContainsUnweanedAnimals(
  page,
  { answer = 'no' } = {}
) {
  await expectPageTitle(page, 'Contains unweaned animals')
  await page
    .getByRole('radio', { name: answer === 'yes' ? 'Yes' : 'No' })
    .check()
  await submit(page)
}

export async function fillAnimalsCertifiedFor(
  page,
  { certifiedFor = 'slaughter' } = {}
) {
  await expectPageTitle(page, 'Animals certified for')
  await page.getByLabel('Animals certified for').selectOption(certifiedFor)
  await submit(page)
}

const TRADER_ADDRESS_TITLES = {
  placeOfOrigin: 'Place of origin',
  consignor: 'Consignor',
  consignee: 'Consignee',
  importer: 'Importer',
  placeOfDestination: 'Place of destination',
  contactAddress: 'Contact address'
}

export async function fillTraderAddress(page, obligation, { name }) {
  await expectPageTitle(page, TRADER_ADDRESS_TITLES[obligation])
  await fillAddress(page, obligation, { name })
  await submit(page)
}

export async function fillAccompanyingDocuments(
  page,
  {
    documentType = 'health-certificate',
    attachmentType = 'physical-original',
    reference = 'HC-2026-00042',
    dateOfIssue = '01/06/2026'
  } = {}
) {
  await expectPageTitle(page, 'Accompanying documents')
  await page.getByLabel('Accompanying document type').selectOption(documentType)
  await page
    .getByLabel('Accompanying document attachment type')
    .selectOption(attachmentType)
  await page.getByLabel('Accompanying document reference').fill(reference)
  await page.getByLabel('Accompanying document date of issue').fill(dateOfIssue)
  await submit(page)
}

// ---------------------------------------------------------------------
// Commodity-line UX — bespoke Add-another flow at /lines.
// ---------------------------------------------------------------------

export async function addCommodityLine(page, journey) {
  // The /lines page has a single "Add a commodity line" button that
  // mints a line, seeds `commodityCode`, and redirects to the first
  // per-line page.
  await page.goto(`${journey.base}/lines`)
  await page.getByRole('button', { name: 'Add a commodity line' }).click()
}

export async function fillCommodityCode(page, { code = '0102' } = {}) {
  await expectPageTitle(page, 'Commodity code')
  await page.getByLabel('Commodity code').selectOption(code)
  await submit(page)
}

export async function fillCommodityType(
  page,
  { commodityType = 'meat-producing' } = {}
) {
  await expectPageTitle(page, 'Commodity type')
  await page.getByLabel('Commodity type').selectOption(commodityType)
  await submit(page)
}

export async function fillSpecies(page, { species = 'cattle' } = {}) {
  await expectPageTitle(page, 'Species')
  await page.getByRole('checkbox', { name: 'Cattle' }).check()
  await submit(page)
}

export async function fillNumberOfAnimals(page, { count = 25 } = {}) {
  await expectPageTitle(page, 'Number of animals')
  await page.getByLabel('Number of animals').fill(String(count))
  await submit(page)
}
