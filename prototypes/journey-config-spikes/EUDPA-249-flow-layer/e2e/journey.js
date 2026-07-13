/**
 * Shared helpers for the EUDPA-249 flow-layer spike's Playwright suite.
 *
 * The suite is data-driven: every spec walks each entry in `JOURNEYS`,
 * so multiple variants of the same journey (should any land in future
 * — e.g. a Joi-adopted rerun, or a comparison against the pre-P0
 * status alphabet) can be exercised without spec churn. Today there's
 * one variant.
 *
 * Selector strategy: `fill*` helpers target inputs by their stable
 * `name` attribute (which is `obligation.name` for singletons or
 * `${obligation.name}-${path}` for line-scoped obligations). This is
 * more robust than `getByLabel` — page-copy churn (renamed legends,
 * changed pageTitles) doesn't touch the harness. The `name` attribute
 * is derived from `obligation.name` in
 * `lib/build-field-descriptors.js#fieldId` and won't change unless the
 * obligation itself is renamed.
 *
 * The vitest e2e-walk suite proves each page renders correctly; this
 * suite proves the browser can fill, submit, and navigate.
 */

export const JOURNEYS = [
  {
    id: 'v4-flow-layer',
    label: 'EUDPA-249 V4 flow-layer spike',
    base: '/prototype/eudpa-249'
  }
]

// A representative fully-populated address. Sub-field values are keyed
// by the same keys build-field-descriptors uses for the composite
// widget's per-sub-input `name` attribute (`${obligation}__${sub}`).
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

async function selectValue(page, name, value) {
  await page.locator(`select[name="${name}"]`).selectOption(value)
}

async function pickRadio(page, name, value) {
  await page
    .locator(`input[type="radio"][name="${name}"][value="${value}"]`)
    .check()
}

async function checkBox(page, name, value) {
  await page
    .locator(`input[type="checkbox"][name="${name}"][value="${value}"]`)
    .check()
}

async function fillInput(page, name, value) {
  await page
    .locator(`input[name="${name}"], textarea[name="${name}"]`)
    .fill(String(value))
}

// Address widgets emit 9 sub-inputs keyed `${obligation}__${sub}`.
// Fills every provided sub-field, ignoring undefined values.
async function fillAddressBlock(page, obligation, values) {
  for (const [sub, value] of Object.entries(values)) {
    if (value === undefined) continue
    // Country is a select; every other sub-field is an input.
    const selector = `[name="${obligation}__${sub}"]`
    const el = page.locator(selector).first()
    const tag = await el.evaluate((node) => node.tagName)
    if (tag === 'SELECT') {
      await el.selectOption(String(value))
    } else {
      await el.fill(String(value))
    }
  }
}

// ---------------------------------------------------------------------
// One helper per page (or per small cluster of pages).
// ---------------------------------------------------------------------

export async function goToStart(page, journey) {
  await page.goto(`${journey.base}/start`)
}

// After every subsection is done, `nextAfter` returns to the task
// list rather than jumping straight into the next subsection's first
// page. So chained fills would need to navigate through the task list
// each time. Simpler: each fill helper navigates to its own page URL
// directly. The URL for a flow-driven page is `/pages/{name}`.
async function goToPage(page, journey, name) {
  await page.goto(`${journey.base}/pages/${name}`)
}

async function goToLinePage(page, journey, lineId, name) {
  await page.goto(`${journey.base}/lines/${lineId}/${name}`)
}

export async function resetSession(page, journey) {
  // Guarantees every test starts from a clean yar session by hitting
  // the reset controller via the page's request context (which carries
  // the cookie jar Playwright allocates per test).
  await page.request.post(`${journey.base}/reset`, { form: {} })
}

// -- Section 1 — origin + reason -------------------------------------

export async function fillCountryOfOrigin(
  page,
  journey,
  { country = 'FR' } = {}
) {
  await goToPage(page, journey, 'country-of-origin')
  await selectValue(page, 'countryOfOrigin', country)
  await submit(page)
}

export async function fillRegionCodeRequirement(
  page,
  journey,
  { answer = 'no' } = {}
) {
  await goToPage(page, journey, 'region-code-requirement')
  await pickRadio(page, 'regionCodeRequirement', answer)
  await submit(page)
}

export async function fillReasonForImport(page, journey, { reason }) {
  await goToPage(page, journey, 'reason-for-import')
  await pickRadio(page, 'reasonForImport', reason)
  await submit(page)
}

export async function fillPurposeInInternalMarket(page, journey, { purpose }) {
  await goToPage(page, journey, 'purpose-details')
  await selectValue(page, 'purposeInInternalMarket', purpose)
  await submit(page)
}

// -- Section 2 — transporter + transport -----------------------------

export async function fillTransporterType(page, journey, { transporterType }) {
  await goToPage(page, journey, 'transporter-type')
  await pickRadio(page, 'transporterType', transporterType)
  await submit(page)
}

export async function fillCommercialTransporterDetails(page, journey) {
  await goToPage(page, journey, 'transporter-details')
  await fillAddressBlock(page, 'commercialTransporter', {
    name: 'ACME Transport Ltd',
    transporterAuthorisationNumber: 'UK/AUTH/2026/001',
    ...ADDRESS
  })
  await submit(page)
}

export async function fillMeansOfTransport(
  page,
  journey,
  { means = 'road-vehicle' } = {}
) {
  await goToPage(page, journey, 'means-of-transport')
  await pickRadio(page, 'meansOfTransport', means)
  await submit(page)
}

export async function fillTransportIdentification(page, journey) {
  await goToPage(page, journey, 'transport-identification')
  await fillInput(page, 'transportIdentification', 'REG-123')
  await fillInput(page, 'transportDocumentReference', 'DOC-456')
  await submit(page)
}

// -- Section 3 — arrival ---------------------------------------------

export async function fillArrivalDetails(
  page,
  journey,
  { arrivalDate = '12/12/2026', portOfEntry = 'DVR' } = {}
) {
  await goToPage(page, journey, 'arrival-details')
  await fillInput(page, 'arrivalDateAtPort', arrivalDate)
  await selectValue(page, 'portOfEntry', portOfEntry)
  await submit(page)
}

export async function fillContainsUnweanedAnimals(
  page,
  journey,
  { answer = 'no' } = {}
) {
  await goToPage(page, journey, 'contains-unweaned-animals')
  await pickRadio(page, 'containsUnweanedAnimals', answer)
  await submit(page)
}

export async function fillAnimalsCertifiedFor(
  page,
  journey,
  { certifiedFor = ['slaughter'] } = {}
) {
  // animalsCertifiedFor is one of three multi-select obligations
  // (OBLIGATION_MULTI in field-widgets.js), so it renders as
  // checkboxes not a single select.
  await goToPage(page, journey, 'animals-certified-for')
  for (const value of certifiedFor) {
    await checkBox(page, 'animalsCertifiedFor', value)
  }
  await submit(page)
}

// -- Section 4 — trader details --------------------------------------

// obligation → page-name map. Trader addresses each live on their own
// page; the URL slug is a dashed transform of the obligation name.
const TRADER_ADDRESS_PAGES = {
  placeOfOrigin: 'place-of-origin',
  consignor: 'consignor',
  consignee: 'consignee',
  importer: 'importer',
  placeOfDestination: 'place-of-destination',
  contactAddress: 'contact-address'
}

export async function fillTraderAddress(page, journey, obligation, { name }) {
  await goToPage(page, journey, TRADER_ADDRESS_PAGES[obligation])
  await fillAddressBlock(page, obligation, { name, ...ADDRESS })
  await submit(page)
}

// -- Section 5 — accompanying documents ------------------------------

export async function fillAccompanyingDocuments(
  page,
  journey,
  {
    documentType = 'health-certificate',
    attachmentType = 'physical-original',
    reference = 'HC-2026-00042',
    dateOfIssue = '01/06/2026'
  } = {}
) {
  await goToPage(page, journey, 'accompanying-documents')
  await pickRadio(page, 'accompanyingDocumentType', documentType)
  await pickRadio(page, 'accompanyingDocumentAttachmentType', attachmentType)
  await fillInput(page, 'accompanyingDocumentReference', reference)
  await fillInput(page, 'accompanyingDocumentDateOfIssue', dateOfIssue)
  await submit(page)
}

// ---------------------------------------------------------------------
// Commodity-line UX — bespoke Add-another flow at /lines. Line-scoped
// obligations have input names keyed `${obligation.name}-${lineId}`.
// ---------------------------------------------------------------------

export async function addCommodityLine(page, journey) {
  await page.goto(`${journey.base}/lines`)
  // The list template renders a submit button on the add form. Copy is
  // stable enough to target by role+name.
  await page.getByRole('button', { name: /Add.*commodity.*line/i }).click()
}

export async function fillCommodityCode(
  page,
  journey,
  { lineId = 'line1', code = '0102' } = {}
) {
  await goToLinePage(page, journey, lineId, 'commodity-details')
  await selectValue(page, `commodityCode-${lineId}`, code)
  await submit(page)
}

export async function fillCommodityType(
  page,
  journey,
  { lineId = 'line1', commodityType = 'meat-producing' } = {}
) {
  await goToLinePage(page, journey, lineId, 'commodity-type')
  await pickRadio(page, `commodityType-${lineId}`, commodityType)
  await submit(page)
}

export async function fillSpecies(
  page,
  journey,
  { lineId = 'line1', species = ['cattle'] } = {}
) {
  await goToLinePage(page, journey, lineId, 'species-details')
  for (const value of species) {
    await checkBox(page, `species-${lineId}`, value)
  }
  await submit(page)
}

export async function fillNumberOfAnimals(
  page,
  journey,
  { lineId = 'line1', count = 25 } = {}
) {
  await goToLinePage(page, journey, lineId, 'number-of-animals')
  await fillInput(page, `numberOfAnimals-${lineId}`, count)
  await submit(page)
}
