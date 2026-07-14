import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

/**
 * Cross-journey persistence equivalence.
 *
 * Drives BOTH notification journeys that this frontend serves against the SAME
 * real backend (LIVE_ANIMALS_MODE=real, persisting to http://localhost:8085 /
 * Mongo) and compares the two persisted notifications field-by-field:
 *
 *   - the production SKELETON journey (src/server routes, from `/`), and
 *   - the live-animals PROTOTYPE journey (`/prototype-standalone/live-animals`).
 *
 * Both notifications stay DRAFT — the prototype in the default Mapper A mode
 * cannot reach final submit, so we compare the persisted DATA, not the submit.
 * Volatile fields (referenceNumber, id, status, created, updated, submittedAt)
 * are stripped before the compare, then `expect(prototype).toEqual(skeleton)`.
 *
 * Runs under the dedicated parity config (`npm run test:prototype:parity`),
 * which reuses a running `npm run prototype:real` server or starts one.
 */

const BACKEND =
  process.env.TRADE_IMPORTS_ANIMALS_BACKEND_URL ?? 'http://localhost:8085'
const PROTO = '/prototype-standalone/live-animals'

const VOLATILE = [
  'referenceNumber',
  'id',
  'status',
  'created',
  'updated',
  'submittedAt',
  'accompanyingDocuments'
]

const strip = (doc) => {
  const copy = { ...doc }
  for (const key of VOLATILE) delete copy[key]
  return copy
}

const { values } = JSON.parse(
  readFileSync(
    new URL(
      '../standalone/live-animals/spec/fixtures/happy-path.json',
      import.meta.url
    ),
    'utf8'
  )
)

// Values chosen to be identical across both journeys wherever each journey's
// stub data allows it (country, region requirement, internal reference, animal
// counts, ear tag, passport, arrival date, CPH digits, certified-for).
const shared = {
  internalReference: 'Imports456GB',
  numberOfAnimals: '25',
  numberOfPackages: '5',
  earTag: 'UK123456789012',
  passport: 'UK123456789',
  cph: '123456789',
  arrival: { day: '12', month: '12', year: '2026' }
}

const listRefs = async (request) => {
  const response = await request.get(`${BACKEND}/notifications`)
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  return new Set(body.content.map((n) => n.referenceNumber))
}

const fetchNotification = async (request, ref) => {
  const response = await request.get(`${BACKEND}/notifications/${ref}`)
  expect(response.ok()).toBeTruthy()
  return response.json()
}

// ---------------------------------------------------------------------------
// PROTOTYPE journey — every answer-gathering section, left DRAFT on the hub.
// Mirrors prototypes/e2e/live-animals.spec.js `completeAnswerSections`.
// ---------------------------------------------------------------------------
const drivePrototype = async (page) => {
  const save = () =>
    page.getByRole('button', { name: 'Save and continue' }).click()
  const task = (name) => page.getByRole('link', { name }).click()

  await page.goto(`${PROTO}/home`)
  await page.getByRole('button', { name: 'Start a new notification' }).click()
  await expect(
    page.getByRole('heading', { name: 'Import notification service' })
  ).toBeVisible()

  // Origin — France, no region code required, internal reference. The
  // country-of-origin select is enhanced by accessible-autocomplete (inc-058):
  // type the name, pick the suggestion, and the hidden select carries 'FR'.
  await task('Origin of the import')
  await page.getByRole('combobox', { name: 'Country of origin' }).fill('France')
  await page.getByRole('option', { name: 'France', exact: true }).click()
  await page
    .getByRole('group', {
      name: 'Does the consignment have a region of origin code?'
    })
    .getByRole('radio', { name: 'No' })
    .check()
  await page
    .getByLabel('Your internal reference for this consignment (optional)')
    .fill(shared.internalReference)
  await save()

  // Commodities — one cattle line, one animal identifier unit.
  await task('Commodities')
  await page.getByRole('button', { name: 'Add a commodity' }).click()
  await page.getByLabel('Commodity', { exact: true }).selectOption('Cow')
  await page.getByRole('radio', { name: 'Domestic' }).check()
  await page.getByRole('checkbox', { name: 'Bos taurus' }).check()
  await save()
  await page.getByLabel('Number of animals').fill(shared.numberOfAnimals)
  await page
    .getByLabel('Number of packages (optional)')
    .fill(shared.numberOfPackages)
  await save()
  await page
    .locator('.govuk-summary-list__row', { hasText: 'Commodity 1' })
    .getByRole('link', { name: /Animal identifiers/ })
    .click()
  await page.getByRole('button', { name: /Add an(other)? animal/ }).click()
  await page.getByLabel('Ear tag number').fill(shared.earTag)
  await page.getByLabel('Passport number').fill(shared.passport)
  await page.getByRole('button', { name: 'Add animal' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()

  // About the consignment — internal market, purpose, additional details.
  await task('About the consignment')
  await page.getByRole('radio', { name: 'Internal market' }).check()
  await save()
  await page.getByRole('radio', { name: 'Breeding' }).check()
  await save()
  await expect(
    page.getByRole('heading', { name: 'Additional animal details' })
  ).toBeVisible()
  await page.getByRole('radio', { name: 'Slaughter' }).check()
  await page
    .getByRole('group', {
      name: 'Does the consignment contain any unweaned animals?'
    })
    .getByRole('radio', { name: 'No' })
    .check()
  await save()

  // Addresses — five parties copy-commit, then the cattle CPH tail page.
  await task('Addresses')
  const parties = [
    ['Consignor', values.consignor.name],
    ['Place of destination', values.placeOfDestination.name],
    ['Place of origin', values.placeOfOrigin.name],
    ['Consignee', values.consignee.name],
    ['Importer', values.importer.name]
  ]
  for (const [label, name] of parties) {
    await page
      .locator('.govuk-summary-list__row', { hasText: label })
      .getByRole('link', { name: 'Add' })
      .click()
    await page.getByRole('radio', { name }).check()
    await save()
  }
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(
    page.getByRole('heading', { name: 'County Parish Holding (CPH)' })
  ).toBeVisible()
  await page.getByLabel('County Parish Holding (CPH)').fill(shared.cph)
  await save()

  // Transport — port, arrival date, travel details, transit countries,
  // transporter.
  await task('Transport')
  await page
    .getByLabel('Port of entry', { exact: true })
    .selectOption(values.portOfEntry)
  await page.getByLabel('Day').fill(shared.arrival.day)
  await page.getByLabel('Month').fill(shared.arrival.month)
  await page.getByLabel('Year').fill(shared.arrival.year)
  await save()
  await page
    .getByRole('radio', { name: values.meansOfTransport, exact: true })
    .check()
  await page
    .getByLabel('Transport identification')
    .fill(values.transportIdentification)
  await page
    .getByLabel('Transport document reference')
    .fill(values.transportDocumentReference)
  await save()
  // One country in a single save: Mapper A (the skeleton-exact parity pin)
  // does not round-trip meansOfTransport/transitedCountries between requests,
  // so the add-another round-trip cannot retain a selection in real mode —
  // and the skeleton-shape compare never includes transited countries anyway.
  await page.getByLabel('Enter all countries').selectOption({ label: 'France' })
  await save()
  await page
    .getByRole('radio', { name: values.transporterType, exact: true })
    .check()
  await save()
  await page
    .getByRole('radio', { name: values.commercialTransporter.name })
    .check()
  await save()

  // Contact address.
  await task('Contact address')
  await page.getByRole('radio', { name: values.contactAddress.name }).check()
  await save()
}

// ---------------------------------------------------------------------------
// SKELETON journey — src/server routes from `/`, left DRAFT on the review page.
// Field `name` attributes are the backend payload keys and are the most stable
// selectors here. Returns the referenceNumber, which the skeleton exposes in
// the /notification-view/{ref} URL.
// ---------------------------------------------------------------------------
const driveSkeleton = async (page) => {
  const submit = () =>
    page.locator('main button[type="submit"]').first().click()

  await page.goto('/')
  await page
    .getByRole('button', { name: 'Create an import notification' })
    .click()

  // Origin.
  await expect(page).toHaveURL(/\/origin$/)
  await page.locator('select[name="countryCode"]').selectOption('FR')
  await page.locator('input[name="requiresRegionCode"][value="no"]').check()
  await page
    .locator('input[name="internalReference"]')
    .fill(shared.internalReference)
  await submit()

  // Commodity + species + type.
  await expect(page).toHaveURL(/\/commodities$/)
  await page.locator('select[name="commodity"]').selectOption('Cow')
  await submit()
  await expect(page).toHaveURL(/\/commodities\/select$/)
  await page.locator('select[name="typeOfCommodity"]').selectOption('Domestic')
  await page.locator('input[name="species"][value="1148346"]').check()
  await submit()

  // Reason for import.
  await expect(page).toHaveURL(/\/import-reason$/)
  await page
    .locator('input[name="reasonForImport"][value="internalMarket"]')
    .check()
  await submit()

  // Commodity numbers (per-species field names).
  await expect(page).toHaveURL(/\/commodities\/details$/)
  await page
    .locator('input[name="noOfAnimals-1148346"]')
    .fill(shared.numberOfAnimals)
  await page
    .locator('input[name="noOfPackages-1148346"]')
    .fill(shared.numberOfPackages)
  await submit()

  // Animal identification (per-species field names).
  await expect(page).toHaveURL(/\/commodities\/identification$/)
  await page.locator('input[name="earTag-1148346"]').fill(shared.earTag)
  await page.locator('input[name="passport-1148346"]').fill(shared.passport)
  await submit()

  // Additional details.
  await expect(page).toHaveURL(/\/additional-details$/)
  await page.locator('input[name="certifiedFor"][value="slaughter"]').check()
  await page.locator('input[name="unweanedAnimals"][value="no"]').check()
  await submit()

  // Accompanying documents — skip straight to addresses (no upload).
  await expect(page).toHaveURL(/\/accompanying-documents$/)
  await page.goto('/addresses')

  // Address sub-pages — each selects the first canned party (value 0) and
  // returns to /addresses.
  const selectFirst = async (path, name) => {
    await page.goto(path)
    await page.locator(`input[name="${name}"][value="0"]`).check()
    await submit()
    await expect(page).toHaveURL(/\/addresses$/)
  }
  await selectFirst('/place-of-origin/select', 'placeOfOrigin')
  await selectFirst('/consignors/select', 'consignor')
  await selectFirst('/consignees/select', 'consignee')
  await selectFirst('/importers/select', 'importer')
  await selectFirst('/destinations/select', 'destination')

  // CPH.
  await page.goto('/cph-number')
  await page.locator('input[name="cphNumber"]').fill(shared.cph)
  await submit()
  await expect(page).toHaveURL(/\/addresses$/)

  // Port of entry + arrival date. Save and continue → /transporters.
  await page.goto('/addresses')
  await submit()
  await expect(page).toHaveURL(/\/port-of-entry$/)
  // 'GB ABD' (Aberdeen Harbour) is the port code in the backend reference data.
  await page.locator('select[name="portOfEntry"]').selectOption('GB ABD')
  await page.locator('input[name="arrivalDate-day"]').fill(shared.arrival.day)
  await page
    .locator('input[name="arrivalDate-month"]')
    .fill(shared.arrival.month)
  await page.locator('input[name="arrivalDate-year"]').fill(shared.arrival.year)
  await submit()

  // Transporter — pick the first canned transporter, then continue.
  await expect(page).toHaveURL(/\/transporters$/)
  await page.goto('/transporters/select')
  await page.getByRole('link', { name: 'Select' }).first().click()
  await expect(page).toHaveURL(/\/transporters/)
  await page.goto('/transporters')
  await submit()

  // Consignment contact — POST lands on /notification-view/{ref} (DRAFT).
  await expect(page).toHaveURL(/\/consignment\/contact\/select$/)
  await page.locator('input[name="contactAddress"][value="0"]').check()
  await submit()
  await expect(page).toHaveURL(/\/notification-view\//)
  const url = new URL(page.url())
  return url.pathname.split('/').filter(Boolean).pop()
}

test.describe('skeleton vs prototype — same persisted notification', () => {
  test('both journeys persist an equivalent DRAFT notification', async ({
    page,
    request
  }) => {
    test.slow()

    // Snapshot existing refs so the prototype's (URL-less) referenceNumber can
    // be recovered as the one new notification after its journey runs.
    const before = await listRefs(request)
    await drivePrototype(page)
    const after = await listRefs(request)
    const newRefs = [...after].filter((ref) => !before.has(ref))
    expect(newRefs).toHaveLength(1)
    const prototypeRef = newRefs[0]

    const skeletonRef = await driveSkeleton(page)

    const prototypeDoc = strip(await fetchNotification(request, prototypeRef))
    const skeletonDoc = strip(await fetchNotification(request, skeletonRef))

    expect(prototypeDoc).toEqual(skeletonDoc)
  })
})
