import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

import { COUNTRY_LABELS } from '../standalone/live-animals/services/countries/stub.js'
import { PORTS } from '../standalone/live-animals/services/ports/stub.js'
import { copy as transportCopy } from '../standalone/live-animals/features/transport/copy.en.js'
import { copy as documentsCopy } from '../standalone/live-animals/features/documents/copy.en.js'

/**
 * Happy-path walk of the live-animals journey. Grows one leg per increment
 * as pages land, driven by the values in
 * `prototypes/standalone/live-animals/flow/fixtures/happy-path.json`.
 * As of inc-028 no car-domain feature remains — every leg walks the
 * live-animals journey end to end (dashboard -> tasks -> declaration ->
 * submit -> confirmation).
 */
const BASE = '/prototype-standalone/live-animals'
const GBN_REFERENCE = /GBN-AG-\d{2}-[0-9A-HJKMNP-TV-Z]{6}/

const { values } = JSON.parse(
  readFileSync(
    new URL(
      '../standalone/live-animals/flow/fixtures/happy-path.json',
      import.meta.url
    ),
    'utf8'
  )
)

// The fixture stores the notification enum; the radios are labelled with the
// display copy.
const meansOfTransportLabel =
  transportCopy.portOfEntry.means.options[values.meansOfTransport]

const startNotification = async (page) => {
  await page.goto(`${BASE}/home`)
  await page.getByRole('button', { name: 'Start a new notification' }).click()
  // inc-060: Start enters the service filter, and a live-animals answer
  // opens the linear run at origin. These specs drive tasks from the hub,
  // so end the run by navigating there — reaching the hub by any route
  // ends run mode, and a journey that has passed the filter deep-links
  // normally. The dedicated linear-run spec covers the run itself.
  await expect(
    page.getByRole('heading', { name: 'What are you importing?' })
  ).toBeVisible()
  await page
    .getByRole('radio', { name: 'Live animals or germinal products' })
    .check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(
    page.getByRole('heading', { name: 'Origin of the import' })
  ).toBeVisible()
  await page.goto(`${BASE}/hub`)
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
}

// inc-058: accessible-autocomplete enhances the country-of-origin select as a
// progressive enhancement. With JS on, the label points at the combobox input
// and picking a suggestion syncs the underlying select (renamed
// #countryOfOrigin-select), which is the control that submits. The autocomplete
// searches by country NAME, so the walk types the label for the fixture's code.
//
// The interaction targets input#countryOfOrigin, which exists only once the
// enhancement has mounted (the server renders select#countryOfOrigin). A role
// query would race hydration at test speed: a plain select's implicit role is
// also combobox, so it can resolve to the raw select while the module bundle
// is still in flight, and fill() on a select fails without retrying. The
// input-scoped locator makes fill auto-wait for the mount instead.
const FIXTURE_COUNTRY = COUNTRY_LABELS[values.countryOfOrigin]

const chooseCountryOfOrigin = async (page, name) => {
  const combo = page.locator('input#countryOfOrigin')
  await combo.fill(name)
  await page.getByRole('option', { name, exact: true }).click()
}

// inc-059 rolls the inc-058 enhancement out to the port-of-entry select. Its
// option text is 'Name (CODE)', so the default substring source matches by
// port name or code with no custom source; picking a suggestion syncs the
// hidden #portOfEntry-select, which carries the CODE (the stored value). The
// same input-scoped locator rule applies: input#portOfEntry exists only once
// the enhancement has mounted.
const FIXTURE_PORT = PORTS.find((port) => port.code === values.portOfEntry)
const FIXTURE_PORT_OPTION = `${FIXTURE_PORT.name} (${FIXTURE_PORT.code})`

const choosePortOfEntry = async (page, query = FIXTURE_PORT.name) => {
  const combo = page.locator('input#portOfEntry')
  await combo.fill(query)
  await page
    .getByRole('option', { name: FIXTURE_PORT_OPTION, exact: true })
    .click()
}

// inc-065 layers the same enhancement onto the transit-countries add-another
// select rows. Each row's select is enhanced in place: the post-mount input
// takes the row's id (input#transitedCountries, input#transitedCountries-2,
// ...) and the renamed hidden select (#transitedCountries-select, ...) stays
// the control that submits the country CODE. The same input-scoped locator
// rule applies: target input#<id> so interactions wait for the mount.
const chooseTransitCountry = async (page, comboId, name) => {
  const combo = page.locator(`input#${comboId}`)
  await combo.fill(name)
  await page.getByRole('option', { name, exact: true }).click()
}

// countryOfOrigin is enforcedAt=continue, so answering it unlocks the
// Commodities section (RULE 1 flow sequencing). Answer the origin section's
// minimum from the hub and return to it. Region requirement 'No' keeps the save
// clean without needing a region code.
const answerCountryOfOrigin = async (page) => {
  await page
    .getByRole('link', { name: 'Where is this consignment coming from?' })
    .click()
  await chooseCountryOfOrigin(page, FIXTURE_COUNTRY)
  await page.getByRole('radio', { name: 'No' }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
}

// inc-062: commodities are added on the batch search page — a server
// round-trip search, then species checkboxes grouped by commodity code.
// Species scientific names are unique across the stub commodities, so a bare
// checkbox-name locator resolves inside the right group. Fills only; the
// caller drives the save.
const SEARCH_LABEL =
  'Search for a common name, commodity code or scientific name'

const searchAndSelect = async (page, query, speciesNames) => {
  await page.getByLabel(SEARCH_LABEL).fill(query)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  for (const name of speciesNames) {
    await page.getByRole('checkbox', { name }).check()
  }
}

// commoditySelection is item-level and enforcedAt=continue, so it unlocks every
// post-commodities section (RULE 1) once ANY line fills it. Answer the country,
// then batch-create one commodity line. A NON-triggering commodity (Cats) is
// used so the line does not pull the notification-level anyItem obligations
// (unweaned animals, CPH) into scope and disturb a section the caller is about
// to assert. Returns to the hub.
const unlockSections = async (page) => {
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  await searchAndSelect(page, 'Cat', ['Felis catus'])
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(
    page.getByRole('heading', { name: 'Consignment details' })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
}

// Documents are added by uploading a real file (inc-064): the attachment type
// is derived server-side from the filename's extension, and the stub scan
// lifecycle answers Checking on every render until the refresh link's
// ?attempt=N GET settles the upload by filename convention (a name containing
// "virus" settles REJECTED).
const setUploadFile = (page, filename, bytes) =>
  page.getByLabel('Upload a file').setInputFiles({
    name: filename,
    mimeType: 'application/pdf',
    buffer: bytes ?? Buffer.from('%PDF-1.4 prototype upload')
  })

// There is no type field: `accompanyingDocumentType` on an entry is the
// enum code its filename should DERIVE; the read-back table row shows the
// code's display label.
const addDocument = async (page, entry) => {
  await page
    .getByLabel('Document reference')
    .fill(entry.accompanyingDocumentReference)
  await page.getByLabel('Day').fill(entry.accompanyingDocumentDateOfIssue.day)
  await page
    .getByLabel('Month')
    .fill(entry.accompanyingDocumentDateOfIssue.month)
  await page.getByLabel('Year').fill(entry.accompanyingDocumentDateOfIssue.year)
  await setUploadFile(page, entry.filename)
  await page.getByRole('button', { name: 'Save and add another' }).click()
}

// Walk every answer-gathering section in the real gated order (documents stays
// optional), leaving the journey on the hub with the review section unlocked
// (RULE 2 submit-readiness). Uses the fixture's cattle line, which triggers the
// notification-level unweaned-animals and CPH tail pages.
const completeAnswerSections = async (page) => {
  const [line] = values.commodityLines
  const arrival = values.arrivalDateAtPort
  const save = () =>
    page.getByRole('button', { name: 'Save and continue' }).click()
  const task = (name) => page.getByRole('link', { name }).click()

  // Origin.
  await task('Where is this consignment coming from?')
  await chooseCountryOfOrigin(page, FIXTURE_COUNTRY)
  await page.getByRole('radio', { name: 'Yes' }).check()
  await page
    .getByLabel('Region of origin code', { exact: true })
    .fill(values.regionOfOriginCode)
  await page
    .getByLabel('Your internal reference for this consignment (optional)')
    .fill(values.internalReferenceNumber)
  await save()

  // Commodities: the batch search creates the fixture's cattle line, the
  // consolidated details page takes its per-species counts (inc-062), then
  // the single identification surface takes one identifier unit (inc-063).
  await task('What are you importing?')
  await searchAndSelect(page, line.commoditySelection, ['Bos taurus'])
  await save()
  await expect(
    page.getByRole('heading', { name: 'Consignment details' })
  ).toBeVisible()
  await page.getByLabel('Number of animals').fill(line.numberOfAnimalsQuantity)
  await page
    .getByLabel('Number of packages (optional)')
    .fill(line.numberOfPackages)
  await save()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  const [unit] = line.animalIdentifiers
  await task('Animal identification details')
  await expect(
    page.getByRole('heading', { name: 'Animal identification details' })
  ).toBeVisible()
  await page.getByLabel('Ear tag number').fill(unit.animalIdentifierEarTag)
  await page.getByRole('button', { name: 'Save and finish' }).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

  // About the consignment: internal market walks reason -> purpose -> details.
  await task('Main reason for importing')
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

  // Addresses: the five party spokes copy-commit, then the cattle line's CPH
  // tail page.
  await task('Roles and addresses')
  const parties = [
    ['Consignor or exporter', values.consignor.name],
    ['Place of destination', values.placeOfDestination.name],
    ['Place of origin', values.placeOfOrigin.name],
    ['Consignee', values.consignee.name],
    ['Importer', values.importer.name]
  ]
  for (const [label, name] of parties) {
    await page
      .locator('.govuk-summary-list__row', {
        has: page.getByText(label, { exact: true })
      })
      .getByRole('link', { name: 'Add' })
      .click()
    await page.getByRole('radio', { name }).check()
    await save()
  }
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(
    page.getByRole('heading', { name: 'County Parish Holding (CPH)' })
  ).toBeVisible()
  await page
    .getByLabel('County Parish Holding (CPH)')
    .fill(values.countyParishHoldingCph)
  await save()

  // Transport: the merged arrival-details page takes the date, port, means
  // and both transport references in one save (inc-065), then transit
  // countries, transporter type, commercial select.
  await task('Arrival details')
  await page.getByLabel('Day').fill(arrival.day)
  await page.getByLabel('Month').fill(arrival.month)
  await page.getByLabel('Year').fill(arrival.year)
  await choosePortOfEntry(page)
  await page
    .getByRole('radio', { name: meansOfTransportLabel, exact: true })
    .check()
  await page
    .getByLabel('Transport identification')
    .fill(values.transportIdentification)
  await page
    .getByLabel('Transport document reference')
    .fill(values.transportDocumentReference)
  await save()
  await chooseTransitCountry(page, 'transitedCountries', 'France')
  await page.getByRole('button', { name: 'Add another country' }).click()
  await chooseTransitCountry(page, 'transitedCountries-2', 'Belgium')
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

test.describe('live-animals (page-owned spine)', () => {
  test('dashboard — a fresh session lists nothing; a started notification lists as a Draft whose Resume re-enters it, and a second start keeps it listed', async ({
    page
  }) => {
    await page.goto(`${BASE}/home`)
    await expect(
      page.getByRole('heading', { name: 'Import notification service' })
    ).toBeVisible()
    await expect(
      page.getByText('You have not started any notifications in this session.')
    ).toBeVisible()

    await startNotification(page)
    const stripText = await page.locator('.app-journey-strip').textContent()
    const [reference] = stripText.match(GBN_REFERENCE)

    // The draft is listed with its Draft tag, created date and a Resume action.
    await page.goto(`${BASE}/home`)
    const row = page.getByRole('row', { name: new RegExp(reference) })
    await expect(row.getByText('Draft')).toBeVisible()
    await expect(row.getByText('Not submitted')).toBeVisible()
    await row
      .getByRole('link', { name: `Resume notification ${reference}` })
      .click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(page.locator('.app-journey-strip')).toContainText(reference)

    // Starting again creates a NEW notification — the old draft stays listed.
    await startNotification(page)
    await expect(page.locator('.app-journey-strip')).not.toContainText(
      reference
    )
    await page.goto(`${BASE}/home`)
    await expect(page.getByRole('row', { name: GBN_REFERENCE })).toHaveCount(2)
    await expect(
      page.getByRole('row', { name: new RegExp(reference) })
    ).toBeVisible()
  })

  test('import type — a blank answer blocks Continue, a non-live-animals answer routes to the holding page, live animals opens the run', async ({
    page
  }) => {
    // The entry filter is the service front door (c-032): Start a new
    // notification lands straight on it (inc-060).
    await page.goto(`${BASE}/home`)
    await page.getByRole('button', { name: 'Start a new notification' }).click()
    await expect(
      page.getByRole('heading', { name: 'What are you importing?' })
    ).toBeVisible()

    // importType is required to enter the service — a blank Continue fails.
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Select what you are importing' })
    ).toBeVisible()

    // A non-live-animals type routes to the not-available holding page.
    await page
      .getByRole('radio', {
        name: 'Products of animal origin or animal by-products'
      })
      .check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'You cannot use this service' })
    ).toBeVisible()

    // The holding page offers a way back to change the answer.
    await page
      .getByRole('link', { name: 'Go back and change your answer' })
      .click()
    await expect(
      page.getByRole('heading', { name: 'What are you importing?' })
    ).toBeVisible()

    // Live animals opens the linear run at origin (inc-060), and the
    // answer persists on return to the filter.
    await page
      .getByRole('radio', { name: 'Live animals or germinal products' })
      .check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Origin of the import' })
    ).toBeVisible()

    await page.goto(`${BASE}/import-type`)
    await expect(
      page.getByRole('radio', { name: 'Live animals or germinal products' })
    ).toBeChecked()
  })

  test('linear opening run — start walks filter, origin, commodity, reason, purpose, identification and additional details in order, then rests on the hub', async ({
    page
  }) => {
    const heading = (name) => page.getByRole('heading', { name })
    const save = () =>
      page.getByRole('button', { name: 'Save and continue' }).click()

    await page.goto(`${BASE}/home`)
    await page.getByRole('button', { name: 'Start a new notification' }).click()
    await expect(heading('What are you importing?')).toBeVisible()

    // Deep-link guard (D10): a fresh journey — nothing committed, filter
    // not yet passed — is sent back to the filter from any journey page.
    await page.goto(`${BASE}/origin`)
    await expect(heading('What are you importing?')).toBeVisible()
    await page.goto(`${BASE}/hub`)
    await expect(heading('What are you importing?')).toBeVisible()

    // Filter → origin.
    await page
      .getByRole('radio', { name: 'Live animals or germinal products' })
      .check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(heading('Origin of the import')).toBeVisible()

    // Origin → the commodity search page (the run's inc-062 commodity leg).
    await chooseCountryOfOrigin(page, FIXTURE_COUNTRY)
    await page.getByRole('radio', { name: 'No' }).check()
    await save()
    await expect(heading('What are you importing?')).toBeVisible()
    await expect(page.getByLabel(SEARCH_LABEL)).toBeVisible()

    // Search → batch select one species → the consolidated details page.
    await searchAndSelect(page, 'Cat', ['Felis catus'])
    await save()
    await expect(heading('Consignment details')).toBeVisible()

    // Details → import reason (run sequence, not the hub).
    await page.getByLabel('Number of animals').fill('2')
    await save()
    await expect(
      heading('What is the main reason for importing the animals?')
    ).toBeVisible()

    // Reason → conditional purpose (internal market pulls it into scope).
    await page.getByRole('radio', { name: 'Internal market' }).check()
    await save()
    await expect(heading('Purpose in the internal market')).toBeVisible()

    // Purpose → the single identification surface (inc-063).
    await page.getByRole('radio', { name: 'Breeding' }).check()
    await save()
    await expect(heading('Animal identification details')).toBeVisible()

    // A zero-record identification pass does NOT block the run.
    await page.getByRole('button', { name: 'Save and finish' }).click()
    await expect(heading('Additional animal details')).toBeVisible()

    // Additional details ends the run on the hub — the resting state.
    await page.getByRole('radio', { name: 'Slaughter' }).check()
    await save()
    await expect(heading('Overview')).toBeVisible()

    // Deep links behave normally on a started journey, and a later save
    // follows the ordinary section flow back to the hub (run mode is over).
    await page.goto(`${BASE}/origin`)
    await expect(heading('Origin of the import')).toBeVisible()
    await save()
    await expect(heading('Overview')).toBeVisible()
  })

  test('hub — the Overview page renders six numbered groups of page-level rows with the design chrome', async ({
    page
  }) => {
    await startNotification(page)

    // h1 and the six numbered group headings (inc-061, c-035).
    await expect(
      page.getByRole('heading', { name: 'Overview', level: 1 })
    ).toBeVisible()
    for (const caption of [
      '1. About the consignment',
      '2. Commodity details',
      '3. Movement',
      '4. Addresses',
      '5. Documents',
      '6. Check and submit'
    ]) {
      await expect(
        page.getByRole('heading', { name: caption, level: 2 })
      ).toBeVisible()
    }

    // Blank journey: origin is the only live link; every other row is
    // gated with the GDS Cannot-start-yet status, the conditional transit
    // row is absent, and there is no progress line (D12).
    const row = (name) =>
      page.locator('.govuk-task-list__item', { hasText: name })
    await expect(
      row('Where is this consignment coming from?').getByRole('link')
    ).toBeVisible()
    await expect(row('Where is this consignment coming from?')).toContainText(
      'Not yet started'
    )
    await expect(row('What are you importing?')).toContainText(
      'Cannot start yet'
    )
    await expect(row('Animal identification details')).toContainText(
      'Cannot start yet'
    )
    await expect(row('Uploaded documents')).toContainText('Cannot start yet')
    await expect(row('Check and submit')).toContainText('Cannot start yet')
    await expect(row('Transit countries')).toHaveCount(0)
    await expect(
      page.getByText(/You have completed \d+ of \d+ tasks/)
    ).toHaveCount(0)

    // Chrome (D13): a back link and a Return-to-dashboard secondary button
    // replace the breadcrumbs; there is no Review-and-submit primary button.
    await expect(page.locator('.govuk-breadcrumbs')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Back' })).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Review and submit' })
    ).toHaveCount(0)
    await page.getByRole('button', { name: 'Return to dashboard' }).click()
    await expect(
      page.getByRole('heading', { name: 'Import notification service' })
    ).toBeVisible()
  })

  test('origin — blank country blocks Save and Continue, then the happy path completes the task', async ({
    page
  }) => {
    await startNotification(page)

    await page
      .getByRole('link', { name: 'Where is this consignment coming from?' })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Origin of the import' })
    ).toBeVisible()

    // countryOfOrigin is enforcedAt=continue — saving without it must fail.
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', {
        name: 'Select the country where the animal originates from'
      })
    ).toBeVisible()

    // Happy path from the shared fixture; 'Yes' reveals the region code.
    await chooseCountryOfOrigin(page, FIXTURE_COUNTRY)
    await page.getByRole('radio', { name: 'Yes' }).check()
    await page
      .getByLabel('Region of origin code', { exact: true })
      .fill(values.regionOfOriginCode)
    await page
      .getByLabel('Your internal reference for this consignment (optional)')
      .fill(values.internalReferenceNumber)
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // One-page section: saving returns to the hub with the task completed.
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    const originRow = page.locator('.govuk-task-list__item', {
      hasText: 'Where is this consignment coming from?'
    })
    await expect(originRow).toContainText('Completed')
  })

  test('country of origin — accessible-autocomplete enhancement: combobox renders, typing filters, selection submits and persists', async ({
    page
  }) => {
    await startNotification(page)
    await page
      .getByRole('link', { name: 'Where is this consignment coming from?' })
      .click()

    // The enhancement swaps the visible affordance to a combobox input while
    // the select stays in the DOM (renamed) as the control that submits. The
    // input-scoped locator waits for the mount; the role and accessible-name
    // pins then assert the a11y contract the raw select used to provide.
    const combo = page.locator('input#countryOfOrigin')
    await expect(combo).toBeVisible()
    await expect(combo).toHaveRole('combobox')
    await expect(combo).toHaveAccessibleName('Country of origin')
    const select = page.locator('select#countryOfOrigin-select')
    await expect(select).toBeAttached()
    await expect(select).toBeHidden()

    // Typing filters the country list mid-word; non-matches drop out.
    await combo.fill('ran')
    await expect(page.getByRole('option', { name: 'France' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Belgium' })).toHaveCount(0)

    // The select's placeholder and divider rows never surface as suggestions.
    await combo.fill('')
    await combo.press('ArrowDown')
    await expect(page.getByRole('option', { name: 'Austria' })).toBeVisible()
    await expect(
      page.getByRole('option', { name: 'Select a country' })
    ).toHaveCount(0)
    await expect(page.getByRole('option', { name: '──────────' })).toHaveCount(
      0
    )

    // Selecting a suggestion syncs the select; the save round-trips it.
    await chooseCountryOfOrigin(page, 'France')
    await expect(select).toHaveValue('FR')
    await page.getByRole('radio', { name: 'No' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page
      .getByRole('link', { name: 'Where is this consignment coming from?' })
      .click()
    await expect(combo).toHaveValue('France')
    await expect(select).toHaveValue('FR')
  })

  test('reference strip — Draft tag and GBN-AG reference on the hub and task pages, absent on pre-origin surfaces', async ({
    page
  }) => {
    const strip = page.locator('.app-journey-strip')
    const reference = /GBN-AG-\d{2}-[0-9A-HJKMNP-TV-Z]{6}/

    // The dashboard precedes any journey — no strip.
    await page.goto(`${BASE}/home`)
    await expect(
      page.getByRole('heading', { name: 'Import notification service' })
    ).toBeVisible()
    await expect(strip).toHaveCount(0)

    await startNotification(page)

    // The hub carries the strip: blue Draft tag + GBN-AG-shaped reference
    // (inc-048: the stub mints the canonical format).
    await expect(strip).toBeVisible()
    await expect(strip.locator('.govuk-tag')).toHaveText('Draft')
    await expect(strip).toContainText(reference)

    // The import-type filter is a pre-origin surface — never a strip.
    await page.goto(`${BASE}/import-type`)
    await expect(
      page.getByRole('heading', { name: 'What are you importing?' })
    ).toBeVisible()
    await expect(strip).toHaveCount(0)

    // Origin shows nothing while the journey has no notification answers —
    // the service-routing importType saved by the filter does not count
    // (inc-060): the reference is minted at the origin POST...
    await page.goto(`${BASE}/hub`)
    await page
      .getByRole('link', { name: 'Where is this consignment coming from?' })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Origin of the import' })
    ).toBeVisible()
    await expect(strip).toHaveCount(0)

    // ...and carries the strip once its first save has committed answers.
    await chooseCountryOfOrigin(page, FIXTURE_COUNTRY)
    await page.getByRole('radio', { name: 'No' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page
      .getByRole('link', { name: 'Where is this consignment coming from?' })
      .click()
    await expect(strip).toBeVisible()
    await expect(strip).toContainText(reference)

    // Every post-origin task page inherits the strip from the shared layout.
    await page.goto(`${BASE}/hub`)
    await page.getByRole('link', { name: 'What are you importing?' }).click()
    await expect(page.getByLabel(SEARCH_LABEL)).toBeVisible()
    await expect(strip).toBeVisible()
    await expect(strip.locator('.govuk-tag')).toHaveText('Draft')
    await expect(strip).toContainText(reference)
  })

  test('task-page exits — Cancel and return to hub discards typed input; Save and return to hub commits and lands on the hub', async ({
    page
  }) => {
    await startNotification(page)
    const originRow = page.locator('.govuk-task-list__item', {
      hasText: 'Where is this consignment coming from?'
    })

    // Cancel leg: choose a country, cancel — nothing is written.
    await page
      .getByRole('link', { name: 'Where is this consignment coming from?' })
      .click()
    await chooseCountryOfOrigin(page, 'Belgium')
    await page.getByRole('link', { name: 'Cancel and return to hub' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(originRow).toContainText('Not yet started')
    await page
      .getByRole('link', { name: 'Where is this consignment coming from?' })
      .click()
    // Unselected state: the enhancement seeds the visible input from the
    // selected option's text — the placeholder — while the hidden select
    // (the data truth) stays empty: nothing was committed.
    await expect(page.locator('input#countryOfOrigin')).toHaveValue(
      'Select a country'
    )
    await expect(page.locator('#countryOfOrigin-select')).toHaveValue('')

    // Save-and-return leg: the named secondary submit commits the page and
    // redirects to the hub instead of the next flow target.
    await chooseCountryOfOrigin(page, FIXTURE_COUNTRY)
    await page.getByRole('button', { name: 'Save and return to hub' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(originRow).toContainText('In progress')

    // The committed value is there on re-entry: the autocomplete input shows
    // the country name, the underlying select holds the stored code.
    await page
      .getByRole('link', { name: 'Where is this consignment coming from?' })
      .click()
    await expect(page.locator('input#countryOfOrigin')).toHaveValue(
      FIXTURE_COUNTRY
    )
    await expect(page.locator('#countryOfOrigin-select')).toHaveValue(
      values.countryOfOrigin
    )
  })

  test('commodities — the batch search multi-selects species across codes, the details page takes per-species counts, then the hub row completes', async ({
    page
  }) => {
    await startNotification(page)
    const [line] = values.commodityLines

    // Commodities is gated on countryOfOrigin (RULE 1) — answer it first.
    await answerCountryOfOrigin(page)

    // No commodity lines yet, so the hub shows no derived stat cards.
    await expect(
      page.getByRole('heading', { name: 'Your commodities' })
    ).toBeHidden()

    await page.getByRole('link', { name: 'What are you importing?' }).click()
    await expect(page.getByLabel(SEARCH_LABEL)).toBeVisible()

    // commoditySelection is enforcedAt=continue — saving with nothing
    // selected must fail.
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Select a commodity' })
    ).toBeVisible()

    // Search matches by commodity code and renders the commodity's species
    // as checkboxes grouped under its code heading.
    await page.getByLabel(SEARCH_LABEL).fill('0102')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(page.getByRole('group', { name: 'Cow (0102)' })).toBeVisible()
    await page.getByRole('checkbox', { name: 'Bos taurus' }).check()
    await page.getByRole('checkbox', { name: 'Bison bison' }).check()

    // A second search (by scientific name) carries the ticked species into
    // the selection summary while the results move to the Cat group —
    // multi-select across commodity codes.
    await searchAndSelect(page, 'Felis catus', ['Felis catus'])
    await expect(
      page.getByRole('heading', { name: '2 selected' })
    ).toBeVisible()

    // The remove affordance recomputes the selection on its round-trip: the
    // checked Cat species joins it, the removed Cow species leaves it.
    await page
      .getByRole('button', { name: 'Remove Cow (0102) — Bison bison' })
      .click()
    await expect(
      page.getByRole('heading', { name: '2 selected' })
    ).toBeVisible()
    await expect(page.getByText('Cat (01061900) — Felis catus')).toBeVisible()
    await expect(page.getByText('Cow (0102) — Bison bison')).toHaveCount(0)
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // The consolidated details page (design 01-14/15): one table row per
    // commodity, one quantity block per species line.
    await expect(
      page.getByRole('heading', { name: 'Consignment details' })
    ).toBeVisible()
    const table = page.locator('.govuk-table')
    await expect(table).toContainText('0102')
    await expect(table).toContainText('Cow')
    await expect(table).toContainText('01061900')
    await expect(table).toContainText('Cat')
    await expect(
      page.getByRole('heading', { name: 'Cow (0102)' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Bos taurus' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Cat (01061900)' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Felis catus' })
    ).toBeVisible()

    // Per-species counts: each line takes its own quantities (the input ids
    // are indexed by line, in canonical commodity-then-species order).
    await page
      .locator('#numberOfAnimalsQuantity-0')
      .fill(line.numberOfAnimalsQuantity)
    await page.locator('#numberOfPackages-0').fill(line.numberOfPackages)
    await page.locator('#numberOfAnimalsQuantity-1').fill('2')
    await page.locator('#numberOfPackages-1').fill('1')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // The hub row completes on line data alone (the identification row is
    // its own facet), and the stat cards sum over the per-species lines
    // (the fixture line's counts plus the 2 animals / 1 package typed above).
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    const commoditiesRow = page.locator('.govuk-task-list__item', {
      hasText: 'What are you importing?'
    })
    await expect(commoditiesRow).toContainText('Completed')
    await expect(
      page.getByRole('heading', { name: 'Your commodities' })
    ).toBeVisible()
    const statCard = (title) =>
      page.locator('.govuk-summary-card', {
        has: page.getByRole('heading', { name: title, exact: true })
      })
    await expect(statCard('Animals')).toContainText(
      'Total number of animals in this consignment'
    )
    await expect(
      statCard('Animals').locator('.govuk-summary-list__value')
    ).toHaveText(String(Number(line.numberOfAnimalsQuantity) + 2))
    await expect(statCard('Packages/boxes')).toContainText(
      'Total number of packages in this consignment'
    )
    await expect(
      statCard('Packages/boxes').locator('.govuk-summary-list__value')
    ).toHaveText(String(Number(line.numberOfPackages) + 1))

    // Remove-line leg: the hub row re-enters at the search page with the
    // stored selection summarised; the details table's Remove drops every
    // line of that commodity while the kept line's counts survive (c-017).
    await page.getByRole('link', { name: 'What are you importing?' }).click()
    await expect(
      page.getByRole('heading', { name: '2 selected' })
    ).toBeVisible()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Consignment details' })
    ).toBeVisible()
    await page.getByRole('link', { name: 'Remove Cat' }).click()
    await expect(table).not.toContainText('Cat')
    await expect(
      page.getByRole('heading', { name: 'Felis catus' })
    ).toHaveCount(0)
    await expect(page.locator('#numberOfAnimalsQuantity-0')).toHaveValue(
      line.numberOfAnimalsQuantity
    )

    // Add-another leg: back to the search (the kept line stays selected),
    // pick a species from a third commodity, and the new line appears on the
    // details page with empty counts — a deselected-then-readded species
    // never resurrects wiped data.
    await page.getByRole('link', { name: 'Add another commodity' }).click()
    await expect(
      page.getByRole('heading', { name: '1 selected' })
    ).toBeVisible()
    await searchAndSelect(page, 'Dog', ['Canis lupus familiaris'])
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Consignment details' })
    ).toBeVisible()
    await expect(table).toContainText('Dog')
    await expect(page.locator('#numberOfAnimalsQuantity-0')).toHaveValue(
      line.numberOfAnimalsQuantity
    )
    await expect(page.locator('#numberOfAnimalsQuantity-1')).toHaveValue('')
    await page.locator('#numberOfAnimalsQuantity-1').fill('3')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(
      statCard('Animals').locator('.govuk-summary-list__value')
    ).toHaveText(String(Number(line.numberOfAnimalsQuantity) + 3))
  })

  test('animal identifiers — a unit form shows only the identifier types the commodity requires, plus the permanent address for cats and dogs', async ({
    page
  }) => {
    await startNotification(page)

    // Commodities is gated on countryOfOrigin (RULE 1) — answer it first.
    await answerCountryOfOrigin(page)

    // Batch-create a Cats commodity line (the counts are submit-enforced, so
    // the details page can be left blank).
    await page.getByRole('link', { name: 'What are you importing?' }).click()
    await searchAndSelect(page, 'Cat', ['Felis catus'])
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Consignment details' })
    ).toBeVisible()

    // Enter the identification surface from its hub row. The counter carries
    // no 'of M' while the count is unanswered — blank count = no cap (inc-063).
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page
      .getByRole('link', { name: 'Animal identification details' })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Animal identification details' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Enter details for Felis catus' })
    ).toBeVisible()

    // Cats gates passport + tattoo + permanent address on; ear tag + horse
    // name are hidden (they belong to other commodities), and the free-text
    // fallbacks are hidden too — a typed commodity is in the notInUnionOf
    // union (inc-040).
    await expect(page.getByLabel('Passport number')).toBeVisible()
    await expect(page.getByLabel('Tattoo')).toBeVisible()
    await expect(page.getByLabel('Ear tag number')).toBeHidden()
    await expect(page.getByLabel('Horse name')).toBeHidden()
    await expect(page.getByLabel('Identification details')).toBeHidden()
    await expect(page.getByLabel('Animal description')).toBeHidden()
    await expect(page.getByLabel('Name or organisation name')).toBeVisible()

    // A partial permanent address blocks the add (the fieldGroup mandates apply
    // once the record is provided) — the same blank-vs-partial rule as the
    // private transporter form.
    await page.getByLabel('Passport number').fill('UK123456789')
    await page.getByLabel('Name or organisation name').fill('Pet Owner')
    await page.getByRole('button', { name: 'Save and add another' }).click()
    await expect(
      page.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Enter address line 1' })
    ).toBeVisible()

    // Completing the mandatory address fields commits the unit with its
    // { name, address } permanent address; Save and add another stays on the
    // surface with the record in the card's table.
    await page.getByLabel('Address line 1').fill('1 Farm Lane')
    await page.getByLabel('Town or city').fill('Skipton')
    await page.getByLabel('Postal or zip code').fill('BD23 1UD')
    await page.getByLabel('Country').selectOption('United Kingdom')
    await page.getByLabel('Telephone number').fill('+44 1756 555 0192')
    await page.getByLabel('Email address').fill('owner@example.co.uk')
    await page.getByRole('button', { name: 'Save and add another' }).click()

    await expect(
      page.getByRole('heading', { name: 'Animal identification details' })
    ).toBeVisible()
    const unitRow = page.locator('.govuk-summary-list__row', {
      hasText: 'Animal 1'
    })
    await expect(unitRow).toContainText('Passport: UK123456789')
    await expect(unitRow).toContainText('Permanent address: Pet Owner')
  })

  test('animal identifiers — a commodity with no typed identifier shows only the free-text fallbacks, and one satisfies the group', async ({
    page
  }) => {
    await startNotification(page)
    await answerCountryOfOrigin(page)

    // Fish is in no typed-identifier list, so the notInUnionOf gate (inc-040)
    // turns the free-text fallbacks ON and every typed input OFF.
    await page.getByRole('link', { name: 'What are you importing?' }).click()
    await searchAndSelect(page, 'Fish', ['Salmo salar'])
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Consignment details' })
    ).toBeVisible()

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page
      .getByRole('link', { name: 'Animal identification details' })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Animal identification details' })
    ).toBeVisible()

    await expect(page.getByLabel('Identification details')).toBeVisible()
    await expect(page.getByLabel('Animal description')).toBeVisible()
    await expect(page.getByLabel('Passport number')).toBeHidden()
    await expect(page.getByLabel('Tattoo')).toBeHidden()
    await expect(page.getByLabel('Ear tag number')).toBeHidden()
    await expect(page.getByLabel('Horse name')).toBeHidden()

    // A fallback alone satisfies the at-least-one identifier group.
    await page.getByLabel('Identification details').fill('Tank mark TM-77')
    await page.getByRole('button', { name: 'Save and add another' }).click()
    await expect(
      page.getByRole('heading', { name: 'Animal identification details' })
    ).toBeVisible()
    await expect(
      page.locator('.govuk-summary-list__row', { hasText: 'Animal 1' })
    ).toContainText('Identification details: Tank mark TM-77')
  })

  test('animal identification — the N-of-M counter caps records at the declared count, remove frees a slot, and a count drop is blocked with an error naming the species', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await answerCountryOfOrigin(page)

    // A cattle line with a declared count of 2 (M = 2).
    await page.getByRole('link', { name: 'What are you importing?' }).click()
    await searchAndSelect(page, 'Cow', ['Bos taurus'])
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Consignment details' })
    ).toBeVisible()
    await page.getByLabel('Number of animals').fill('2')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    // Counter progression: 1 of 2, then Save and add another moves to 2 of 2
    // with the first record in the card's table.
    await page
      .getByRole('link', { name: 'Animal identification details' })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Enter details for Bos taurus 1 of 2' })
    ).toBeVisible()
    await page.getByLabel('Ear tag number').fill('UK000000000001')
    await page.getByRole('button', { name: 'Save and add another' }).click()
    await expect(
      page.getByRole('heading', { name: 'Enter details for Bos taurus 2 of 2' })
    ).toBeVisible()
    await expect(
      page.locator('.govuk-summary-list__row', { hasText: 'Animal 1' })
    ).toContainText('Ear tag: UK000000000001')

    // At N = M the maximum-reached state replaces the entry form; the saved
    // records stay removable.
    await page.getByLabel('Ear tag number').fill('UK000000000002')
    await page.getByRole('button', { name: 'Save and add another' }).click()
    await expect(
      page.getByText('You have entered details for all 2 Bos taurus animals', {
        exact: false
      })
    ).toBeVisible()
    await expect(page.getByLabel('Ear tag number')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Save and add another' })
    ).toHaveCount(0)

    // Count-drop guard: lowering the count below the record count blocks the
    // details-page save with an error NAMING the species whose summary link
    // goes straight to this species' identifier card — the records are never
    // silently trimmed.
    await page.getByRole('button', { name: 'Save and finish' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page.getByRole('link', { name: 'What are you importing?' }).click()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Consignment details' })
    ).toBeVisible()
    await page.getByLabel('Number of animals').fill('1')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()
    const dropError = page.getByRole('link', {
      name: 'You have 2 identifier records for Bos taurus but entered 1 animal. Remove identifier records or keep the higher count.'
    })
    await expect(dropError).toBeVisible()
    await dropError.click()
    await expect(
      page.getByRole('heading', { name: 'Animal identification details' })
    ).toBeVisible()
    await expect(
      page.locator('.govuk-summary-list__row', { hasText: 'Animal 2' })
    ).toBeVisible()

    // Remove frees a slot: the entry form reopens at 2 of 2.
    await page
      .locator('.govuk-summary-list__row', { hasText: 'Animal 2' })
      .getByRole('link', { name: 'Remove' })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Enter details for Bos taurus 2 of 2' })
    ).toBeVisible()

    // With one record left the drop no longer applies — a count of 1 saves.
    await page.getByRole('button', { name: 'Save and finish' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page.getByRole('link', { name: 'What are you importing?' }).click()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Consignment details' })
    ).toBeVisible()
    await page.getByLabel('Number of animals').fill('1')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('import reason — blank saves without error (enforcedAt=submit), then the happy path completes the task', async ({
    page
  }) => {
    await startNotification(page)

    // The consignment section sits after commodities (RULE 1) — unlock it by
    // answering countryOfOrigin and adding one commodity line first.
    await unlockSections(page)

    await page.getByRole('link', { name: 'Main reason for importing' }).click()
    await expect(
      page.getByRole('heading', {
        name: 'What is the main reason for importing the animals?'
      })
    ).toBeVisible()

    // reasonForImport is enforcedAt=submit — a blank save is not an error; the
    // section walks on to its tail, the additional-details page.
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Additional animal details' })
    ).toBeVisible()

    // A blank save there is not an error either (both fields are
    // enforcedAt=submit); the section returns to the hub with both its rows
    // still open — reasonForImport and animalsCertifiedFor are required and
    // unanswered.
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    const reasonRow = page.locator('.govuk-task-list__item', {
      hasText: 'Main reason for importing'
    })
    const additionalDetailsRow = page.locator('.govuk-task-list__item', {
      hasText: 'Additional commodity details'
    })
    await expect(reasonRow).not.toContainText('Completed')
    await expect(additionalDetailsRow).not.toContainText('Completed')

    // Happy path from the shared fixture. Choosing the internal market
    // activates purposeInInternalMarket, so the section walks reason ->
    // purpose -> additional details; the reason and purpose complete the
    // reason row, the certified-for answer completes the additional-details
    // row.
    await page.getByRole('link', { name: 'Main reason for importing' }).click()
    await page.getByRole('radio', { name: 'Internal market' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(
      page.getByRole('heading', { name: 'Purpose in the internal market' })
    ).toBeVisible()
    await page.getByRole('radio', { name: 'Breeding' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(
      page.getByRole('heading', { name: 'Additional animal details' })
    ).toBeVisible()
    await page.getByRole('radio', { name: 'Slaughter' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(reasonRow).toContainText('Completed')
    await expect(additionalDetailsRow).toContainText('Completed')
  })

  test('accompanying documents — the optional collection starts Optional; the single-page loop uploads two documents, removes one and completes the task', async ({
    page
  }) => {
    await startNotification(page)
    const [doc] = values.documents
    const issued = doc.accompanyingDocumentDateOfIssue
    const secondDoc = {
      accompanyingDocumentType: 'COMMERCIAL_INVOICE',
      accompanyingDocumentReference: 'INV-2026-0042',
      accompanyingDocumentDateOfIssue: { day: '3', month: '1', year: '2026' },
      filename: 'commercial-invoice.pdf'
    }

    // The documents section sits after commodities (RULE 1) — unlock it first.
    await unlockSections(page)

    // documents is the journey's optional section (nothing required until an
    // entry exists), so once unlocked and untouched it reads Optional — NOT
    // Completed, and it does not count towards the completed-tasks total.
    const documentsRow = page.locator('.govuk-task-list__item', {
      hasText: 'Uploaded documents'
    })
    await expect(documentsRow).toContainText('Optional')

    await page.getByRole('link', { name: 'Uploaded documents' }).click()
    await expect(
      page.getByRole('heading', { name: 'Upload documents' })
    ).toBeVisible()
    await expect(
      page.getByText('You have not added any documents yet.')
    ).toBeVisible()

    // A partial date of issue is malformed, not merely blank — it blocks the
    // add (dateParts validation), and an add without a file names that too.
    await page.getByLabel('Day').fill(issued.day)
    await page.getByRole('button', { name: 'Save and add another' }).click()
    await expect(
      page.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Enter a real date of issue' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Select a file to upload' })
    ).toBeVisible()

    // Happy path from the shared fixture — the upload posts a real file.
    // Adding stays on the same page: the read-back table gains a row with
    // reference / type / date plus a Checking scan-status tag, and the
    // entry form resets for the next one.
    await addDocument(page, doc)
    await expect(
      page.getByRole('heading', { name: 'Upload documents' })
    ).toBeVisible()
    const firstRow = page.locator('.govuk-table__row', {
      hasText: doc.accompanyingDocumentReference
    })
    await expect(firstRow).toContainText(
      documentsCopy.types[doc.accompanyingDocumentType]
    )
    await expect(firstRow).toContainText(
      `${issued.day}/${issued.month}/${issued.year}`
    )
    await expect(firstRow).toContainText('Checking')
    await expect(page.getByLabel('Document reference')).toHaveValue('')

    // Continue is blocked while a scan is PENDING.
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Upload documents' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', {
        name: 'You cannot continue until all documents have been scanned or removed'
      })
    ).toBeVisible()

    // The stock refresh affordance settles the scan — page reload, no JS.
    await page.getByRole('link', { name: 'Refresh virus scan status' }).click()
    await expect(firstRow).toContainText('Safe')

    await addDocument(page, secondDoc)
    const secondRow = page.locator('.govuk-table__row', {
      hasText: secondDoc.accompanyingDocumentReference
    })
    await expect(secondRow).toContainText(
      documentsCopy.types[secondDoc.accompanyingDocumentType]
    )
    await expect(secondRow).toContainText('Checking')

    // Removing the second document leaves the first row intact — and with
    // only the settled Safe document left, Continue is free again.
    await secondRow
      .getByRole('link', { name: 'Remove document 2', exact: true })
      .click()
    await expect(
      page.locator('.govuk-table__row', {
        hasText: secondDoc.accompanyingDocumentReference
      })
    ).toHaveCount(0)
    await expect(firstRow).toBeVisible()

    // Continue returns to the hub; a complete document makes the optional task
    // Completed (Optional -> Completed once a full entry exists).
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(documentsRow).toContainText('Completed')
  })

  test('documents upload — file-type and oversize picks are refused, and a rejected scan blocks Continue until removed', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await unlockSections(page)
    await page.getByRole('link', { name: 'Uploaded documents' }).click()
    await expect(
      page.getByRole('heading', { name: 'Upload documents' })
    ).toBeVisible()

    const virusDoc = {
      accompanyingDocumentType: 'COMMERCIAL_INVOICE',
      accompanyingDocumentReference: 'INV-VIRUS-0001',
      accompanyingDocumentDateOfIssue: { day: '3', month: '1', year: '2026' },
      filename: 'virus-invoice.pdf'
    }

    // A file type outside the allow-list is refused.
    await page.getByLabel('Upload a file').setInputFiles({
      name: 'notes.zip',
      mimeType: 'application/zip',
      buffer: Buffer.from('zip-bytes')
    })
    await page.getByRole('button', { name: 'Save and add another' }).click()
    await expect(
      page.getByRole('link', {
        name: 'The selected file must be a PDF, DOC, DOCX, JPEG, PNG, XLS or XLSX'
      })
    ).toBeVisible()

    // A file over the 50MB limit is refused: this one blows the route-level
    // payload cap, exercising the 413 safety net that re-renders the page
    // with the friendly oversize error instead of a bare 413.
    await setUploadFile(page, 'oversize.pdf', Buffer.alloc(50_100_000, 1))
    await page.getByRole('button', { name: 'Save and add another' }).click()
    await expect(
      page.getByRole('link', {
        name: 'The selected file must be smaller than 50MB'
      })
    ).toBeVisible()

    // Neither refused pick added a document.
    await expect(
      page.getByText('You have not added any documents yet.')
    ).toBeVisible()

    // The virus-convention filename walks PENDING -> REJECTED.
    await addDocument(page, virusDoc)
    const virusRow = page.locator('.govuk-table__row', {
      hasText: virusDoc.accompanyingDocumentReference
    })
    await expect(virusRow).toContainText('Checking')
    await page.getByRole('link', { name: 'Refresh virus scan status' }).click()
    await expect(virusRow).toContainText('Virus found')

    // A rejected document blocks Continue with the per-file error...
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Upload documents' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', {
        name: 'virus-invoice.pdf contains a virus. Remove it and try again with a different file.'
      })
    ).toBeVisible()

    // ...until it is removed, after which Continue reaches the hub.
    await virusRow
      .getByRole('link', { name: 'Remove document 1', exact: true })
      .click()
    await expect(
      page.locator('.govuk-table__row', {
        hasText: virusDoc.accompanyingDocumentReference
      })
    ).toHaveCount(0)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('addresses — selecting a consignor, a place of destination, a place of origin, a consignee and an importer copies each party onto the landing page and completes the task', async ({
    page
  }) => {
    await startNotification(page)

    // The addresses section sits after commodities (RULE 1) — unlock it first.
    await unlockSections(page)

    // All five parties are required obligations owned by the addresses
    // landing page, so once unlocked and untouched the task reads Not yet started.
    const addressesRow = page.locator('.govuk-task-list__item', {
      hasText: 'Roles and addresses'
    })
    await expect(addressesRow).toContainText('Not yet started')

    await page.getByRole('link', { name: 'Roles and addresses' }).click()
    await expect(
      page.getByRole('heading', { name: 'Consignment addresses' })
    ).toBeVisible()
    await expect(
      page.getByText('Providing a false address is an act of fraud.')
    ).toBeVisible()

    // The consignor spoke exists: its row offers Add.
    const consignorRow = page.locator('.govuk-summary-list__row', {
      has: page.getByText('Consignor or exporter', { exact: true })
    })
    await expect(consignorRow).toContainText('Not added yet')
    await consignorRow.getByRole('link', { name: 'Add' }).click()
    await expect(
      page.getByRole('heading', {
        name: 'Consignor or exporter'
      })
    ).toBeVisible()

    // Selecting a party COPIES its name and address into the answer and
    // returns to the landing page, which now shows the copied name.
    await page.getByRole('radio', { name: values.consignor.name }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Consignment addresses' })
    ).toBeVisible()
    await expect(consignorRow).toContainText(values.consignor.name)
    await expect(
      consignorRow.getByRole('link', { name: 'Change' })
    ).toBeVisible()

    // The destination spoke works the same way — its own copy-commit.
    const destinationRow = page.locator('.govuk-summary-list__row', {
      has: page.getByText('Place of destination', { exact: true })
    })
    await expect(destinationRow).toContainText('Not added yet')
    await destinationRow.getByRole('link', { name: 'Add' }).click()
    await expect(
      page.getByRole('heading', { name: 'Place of destination' })
    ).toBeVisible()

    await page
      .getByRole('radio', { name: values.placeOfDestination.name })
      .check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Consignment addresses' })
    ).toBeVisible()
    await expect(destinationRow).toContainText(values.placeOfDestination.name)
    await expect(
      destinationRow.getByRole('link', { name: 'Change' })
    ).toBeVisible()

    // The place of origin spoke works the same way — its own copy-commit.
    const originRow = page.locator('.govuk-summary-list__row', {
      has: page.getByText('Place of origin', { exact: true })
    })
    await expect(originRow).toContainText('Not added yet')
    await originRow.getByRole('link', { name: 'Add' }).click()
    await expect(
      page.getByRole('heading', { name: 'Place of origin' })
    ).toBeVisible()

    await page.getByRole('radio', { name: values.placeOfOrigin.name }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Consignment addresses' })
    ).toBeVisible()
    await expect(originRow).toContainText(values.placeOfOrigin.name)
    await expect(originRow.getByRole('link', { name: 'Change' })).toBeVisible()

    // The consignee spoke works the same way — its own copy-commit.
    const consigneeRow = page.locator('.govuk-summary-list__row', {
      has: page.getByText('Consignee', { exact: true })
    })
    await expect(consigneeRow).toContainText('Not added yet')
    await consigneeRow.getByRole('link', { name: 'Add' }).click()
    await expect(page.getByRole('heading', { name: 'Consignee' })).toBeVisible()

    await page.getByRole('radio', { name: values.consignee.name }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Consignment addresses' })
    ).toBeVisible()
    await expect(consigneeRow).toContainText(values.consignee.name)
    await expect(
      consigneeRow.getByRole('link', { name: 'Change' })
    ).toBeVisible()

    // The importer spoke works the same way — its own copy-commit.
    const importerRow = page.locator('.govuk-summary-list__row', {
      has: page.getByText('Importer', { exact: true })
    })
    await expect(importerRow).toContainText('Not added yet')
    await importerRow.getByRole('link', { name: 'Add' }).click()
    await expect(page.getByRole('heading', { name: 'Importer' })).toBeVisible()

    await page.getByRole('radio', { name: values.importer.name }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Consignment addresses' })
    ).toBeVisible()
    await expect(importerRow).toContainText(values.importer.name)
    await expect(
      importerRow.getByRole('link', { name: 'Change' })
    ).toBeVisible()

    // The fraud warning stays on the filled landing page too.
    await expect(
      page.getByText('Providing a false address is an act of fraud.')
    ).toBeVisible()

    // Continue returns to the hub with all five owed parties answered.
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(addressesRow).toContainText('Completed')
  })

  // inc-066: the five spokes are ONE address-book picker — a server-round-trip
  // search over the role's 40-record book, results paginated 5 to a page with a
  // radio per row and an expandable View details, and an Add a new address way
  // out. The radio's value is the record's stable id, so a row picked on page 3
  // saves the same record it would from page 1: selection is resolved against
  // the whole book, carried across search round-trips in a hidden field and
  // across pages in the pagination links' query — no client JS anywhere.
  test('addresses — the picker searches and pages the address book, and the row selected on a later page is the one that saves', async ({
    page
  }) => {
    await startNotification(page)
    await unlockSections(page)

    await page.getByRole('link', { name: 'Roles and addresses' }).click()
    const consignorRow = page.locator('.govuk-summary-list__row', {
      has: page.getByText('Consignor or exporter', { exact: true })
    })
    await consignorRow.getByRole('link', { name: 'Add' }).click()

    // The book opens on page 1 — five of its ~forty records. It is a shared,
    // mutable server book: the create-address spec (and repeated runs against a
    // persistent stack) append records to its END, so both the total and the
    // page count are matched from what the page actually shows, never a literal.
    const showingFive = /Showing 5 of \d+ addresses/
    await expect(page.getByText(showingFive)).toBeVisible()
    await expect(
      page.getByRole('radio', { name: values.consignor.name })
    ).toBeVisible()

    // View details expands the row in place (no navigation, so nothing the user
    // has typed or ticked is lost) and shows the rest of the record.
    const danishRow = page.locator('tr', { hasText: 'Danish Meat Export ApS' })
    const danishDetails = danishRow.locator('details')
    await expect(danishDetails.locator('.govuk-details__text')).toBeHidden()
    await danishDetails.locator('summary').click()
    await expect(danishDetails.locator('.govuk-details__text')).toBeVisible()
    await expect(danishDetails).toContainText('Copenhagen')

    // Search is a server round-trip over the whole book — name, address or
    // country — and narrows it to a single page of results.
    await page.getByLabel('Search').fill('Denmark')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(page.getByText('Showing 2 of 2 addresses')).toBeVisible()
    await expect(
      page.getByRole('radio', { name: 'Jutland Swine ApS' })
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Page 2' })).toHaveCount(0)

    // Clearing the search restores the whole book and its pagination.
    await page.getByLabel('Search').fill('')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(page.getByText(showingFive)).toBeVisible()

    // GDS pagination renders a WINDOW, not every page: from page 1 that is
    // 1, 2, an ellipsis and the last page — so page 3 is reached by stepping
    // through the neighbours the component actually offers. The last page is
    // derived from the current total (5 per page), not a fixed 8, because the
    // book grows as records are appended.
    const showingText = await page.getByText(showingFive).textContent()
    const lastPage = Math.ceil(Number(showingText.match(/of (\d+)/)[1]) / 5)
    await expect(
      page.getByRole('link', { name: `Page ${lastPage}` })
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Page 3' })).toHaveCount(0)
    await page.getByRole('link', { name: 'Page 2' }).click()

    // Page three holds records that page one never rendered.
    await page.getByRole('link', { name: 'Page 3' }).click()
    await expect(
      page.getByRole('radio', { name: 'Irish Beef Traders Ltd' })
    ).toBeVisible()
    await expect(
      page.getByRole('radio', { name: values.consignor.name })
    ).toHaveCount(0)

    // Selecting there and saving copies THAT record onto the consignor.
    await page.getByRole('radio', { name: 'Iberian Swine SA' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Consignment addresses' })
    ).toBeVisible()
    await expect(consignorRow).toContainText('Iberian Swine SA')

    // Re-entering opens on page one, where the chosen record is not rendered —
    // the picker still knows it (carried, not re-ticked), and a save from this
    // page keeps it. That is the no-JS selection-across-pagination guarantee.
    await consignorRow.getByRole('link', { name: 'Change' }).click()
    await expect(
      page.getByText('Selected address: Iberian Swine SA')
    ).toBeVisible()
    await expect(
      page.getByRole('radio', { name: 'Iberian Swine SA' })
    ).toHaveCount(0)
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Consignment addresses' })
    ).toBeVisible()
    await expect(consignorRow).toContainText('Iberian Swine SA')
  })

  test('addresses — adding a new address from the consignor spoke copies it into the consignor and the spoke then offers it', async ({
    page
  }) => {
    await startNotification(page)
    await unlockSections(page)

    await page.getByRole('link', { name: 'Roles and addresses' }).click()
    const consignorRow = page.locator('.govuk-summary-list__row', {
      has: page.getByText('Consignor or exporter', { exact: true })
    })
    await consignorRow.getByRole('link', { name: 'Add' }).click()

    // The spoke offers a way out of the canned book: the create-address form.
    await page.getByRole('button', { name: 'Add a new address' }).click()
    await expect(
      page.getByRole('heading', { name: 'Add a new address' })
    ).toBeVisible()

    // A blank save is rejected with the mandatory Standard Address Block set.
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()

    await page.getByLabel('Name or organisation name').fill('Created Farm Ltd')
    await page.getByLabel('Address line 1').fill('99 New Lane')
    await page.getByLabel('Town or city').fill('Carlisle')
    await page.getByLabel('Postal or zip code').fill('CA1 1AA')
    await page.getByLabel('Country').selectOption('United Kingdom')
    await page.getByLabel('Telephone number').fill('01228 555 0101')
    await page.getByLabel('Email address').fill('farm@example.co.uk')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // Saved by copy into the launching party, back on the landing page.
    await expect(
      page.getByRole('heading', { name: 'Consignment addresses' })
    ).toBeVisible()
    await expect(consignorRow).toContainText('Created Farm Ltd')

    // The created address joined the address book. It is minted at the end of a
    // 41-record book, so it is not on the picker's first page — but it IS the
    // committed consignor, so the picker carries it as the selection, and
    // searching the book surfaces its row already checked.
    await consignorRow.getByRole('link', { name: 'Change' }).click()
    await expect(
      page.getByText('Selected address: Created Farm Ltd')
    ).toBeVisible()
    await page.getByLabel('Search').fill('Created Farm')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(
      page.getByRole('radio', { name: 'Created Farm Ltd' })
    ).toBeChecked()
  })

  test('transport — a partial arrival date blocks the save; the merged arrival-details page takes all five fields in one save, then transit, transporter type and commercial transporter complete the movement rows', async ({
    page
  }) => {
    await startNotification(page)
    const arrival = values.arrivalDateAtPort

    // The transport section sits after commodities (RULE 1) — unlock it first.
    await unlockSections(page)

    // All the section's fields are required (enforcedAt=submit), so once
    // unlocked and untouched the movement rows read Not yet started — and
    // the conditional transit row is absent until an overland means is
    // chosen (inc-061).
    const arrivalRow = page.locator('.govuk-task-list__item', {
      hasText: 'Arrival details'
    })
    const transitRow = page.locator('.govuk-task-list__item', {
      hasText: 'Transit countries'
    })
    const transporterRow = page.locator('.govuk-task-list__item', {
      hasText: 'Transporter'
    })
    await expect(arrivalRow).toContainText('Not yet started')
    await expect(transporterRow).toContainText('Not yet started')
    await expect(transitRow).toHaveCount(0)

    await page.getByRole('link', { name: 'Arrival details' }).click()
    await expect(
      page.getByRole('heading', { name: 'Arrival details' })
    ).toBeVisible()

    // A partial arrival date is malformed, not merely blank — it blocks the
    // save (dateParts validation), unlike a fully blank submit-enforced field.
    await page.getByLabel('Day').fill(arrival.day)
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Enter a real arrival date' })
    ).toBeVisible()

    // Happy path from the shared fixture: the merged page (inc-065) carries
    // the date, port, means radios and both transport references, in the
    // design's order, and one save commits all five.
    await page.getByLabel('Day').fill(arrival.day)
    await page.getByLabel('Month').fill(arrival.month)
    await page.getByLabel('Year').fill(arrival.year)
    await choosePortOfEntry(page)
    await page
      .getByRole('radio', { name: meansOfTransportLabel, exact: true })
      .check()
    await page
      .getByLabel('Transport identification')
      .fill(values.transportIdentification)
    await page
      .getByLabel('Transport document reference')
      .fill(values.transportDocumentReference)
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // Road Vehicle routes the section through the transit-countries page;
    // its add-another select rows carry the autocomplete enhancement
    // (inc-065), and the fixture's FR and BE codes render as country names.
    await expect(
      page.getByRole('heading', {
        name: 'Which countries will the consignment travel through?'
      })
    ).toBeVisible()
    await chooseTransitCountry(page, 'transitedCountries', 'France')
    await page.getByRole('button', { name: 'Add another country' }).click()
    await chooseTransitCountry(page, 'transitedCountries-2', 'Belgium')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // Saving walks on to the transporter-type page.
    await expect(
      page.getByRole('heading', {
        name: 'What type of transporter will move the animals?'
      })
    ).toBeVisible()
    await page
      .getByRole('radio', { name: values.transporterType, exact: true })
      .check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // Commercial transporter puts the select page in scope, so the section
    // walks on to it; selecting a transporter copies its details (c-020).
    await expect(
      page.getByRole('heading', {
        name: 'Search for an approved commercial transporter'
      })
    ).toBeVisible()
    await page
      .getByRole('radio', { name: values.commercialTransporter.name })
      .check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // Last page of the section: saving returns to the hub. All three
    // movement rows are complete, and the Road Vehicle means keeps the
    // conditional transit row on the list.
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(arrivalRow).toContainText('Completed')
    await expect(transitRow).toContainText('Completed')
    await expect(transporterRow).toContainText('Completed')
  })

  test('port of entry — accessible-autocomplete enhancement: name and code search both suggest, selection persists the code', async ({
    page
  }) => {
    await startNotification(page)

    // The transport section sits after commodities (RULE 1) — unlock it first.
    await unlockSections(page)
    await page.getByRole('link', { name: 'Arrival details' }).click()

    // The enhancement swaps the visible affordance to a combobox input while
    // the select stays in the DOM (renamed) as the control that submits.
    const combo = page.locator('input#portOfEntry')
    await expect(combo).toBeVisible()
    await expect(combo).toHaveRole('combobox')
    await expect(combo).toHaveAccessibleName('Port of entry')
    const select = page.locator('select#portOfEntry-select')
    await expect(select).toBeAttached()
    await expect(select).toBeHidden()

    // Unselected state: the visible input carries the placeholder text while
    // the hidden select — the data truth — stays empty.
    await expect(combo).toHaveValue('Select port of entry')
    await expect(select).toHaveValue('')

    // Name search: option text is 'Name (CODE)', so typing part of a port
    // name filters the list case-insensitively; non-matches drop out.
    await combo.fill('aberdeen')
    await expect(
      page.getByRole('option', { name: 'Aberdeen Harbour (GB ABD)' })
    ).toBeVisible()
    await expect(
      page.getByRole('option', { name: 'Aberdeen Airport (GB DYC)' })
    ).toBeVisible()
    await expect(
      page.getByRole('option', { name: 'Port of Dover (GB DVR)' })
    ).toHaveCount(0)

    // The select's placeholder and divider rows never surface as suggestions.
    await combo.fill('')
    await combo.press('ArrowDown')
    await expect(
      page.getByRole('option', { name: 'Aberdeen Airport (GB DYC)' })
    ).toBeVisible()
    await expect(
      page.getByRole('option', { name: 'Select port of entry' })
    ).toHaveCount(0)
    await expect(page.getByRole('option', { name: '──────────' })).toHaveCount(
      0
    )

    // Code search: typing the CODE surfaces the same suggestion — the code
    // lives in the option text — and picking it syncs the hidden select to
    // the code the journey stores.
    await choosePortOfEntry(page, values.portOfEntry)
    await expect(combo).toHaveValue(FIXTURE_PORT_OPTION)
    await expect(select).toHaveValue(values.portOfEntry)

    // The save round-trips the code: re-entry shows the option text on the
    // input and the stored code on the select. The means stays blank
    // (submit-enforced), so the save skips the conditional transit page and
    // walks on to the transporter-type page.
    await page.getByLabel('Day').fill(values.arrivalDateAtPort.day)
    await page.getByLabel('Month').fill(values.arrivalDateAtPort.month)
    await page.getByLabel('Year').fill(values.arrivalDateAtPort.year)
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', {
        name: 'What type of transporter will move the animals?'
      })
    ).toBeVisible()
    await page.goto(`${BASE}/port-of-entry`)
    await expect(combo).toHaveValue(FIXTURE_PORT_OPTION)
    await expect(select).toHaveValue(values.portOfEntry)
  })

  test('transporters — reached by saving through the merged arrival-details page; the chosen type persists', async ({
    page
  }) => {
    await startNotification(page)

    // The transport section sits after commodities (RULE 1) — unlock it first.
    await unlockSections(page)

    // Every field on the merged arrival-details page is submit-enforced, so
    // one blank save walks straight through to the transporter-type page.
    const openTransporters = async () => {
      await page.getByRole('link', { name: 'Arrival details' }).click()
      await expect(
        page.getByRole('heading', { name: 'Arrival details' })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Save and continue' }).click()
      await expect(
        page.getByRole('heading', {
          name: 'What type of transporter will move the animals?'
        })
      ).toBeVisible()
    }

    await openTransporters()

    // Both V4 types are offered; nothing is pre-selected.
    const commercial = page.getByRole('radio', {
      name: 'Commercial'
    })
    const privateType = page.getByRole('radio', {
      name: 'Private'
    })
    await expect(commercial).not.toBeChecked()
    await expect(privateType).not.toBeChecked()

    // transporterType is submit-enforced too — even a blank save passes and
    // returns to the hub with the Transporter row still open.
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    const transporterRow = page.locator('.govuk-task-list__item', {
      hasText: 'Transporter'
    })
    await expect(transporterRow).toContainText('Not yet started')

    // Choosing a type saves and persists on return. The private branch owes
    // the details page next — a blank save there walks on to the hub.
    await openTransporters()
    await privateType.check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Private transporter details' })
    ).toBeVisible()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(transporterRow).toContainText('In progress')

    await openTransporters()
    await expect(privateType).toBeChecked()
    await expect(commercial).not.toBeChecked()
  })

  test('commercial transporter — owed only for the commercial type; changing the type wipes a saved transporter', async ({
    page
  }) => {
    await startNotification(page)

    // The transport section sits after commodities (RULE 1) — unlock it first.
    await unlockSections(page)

    // Every field on the merged arrival-details page is submit-enforced, so
    // one blank save walks straight through to the transporter-type page.
    const openTransporters = async () => {
      await page.getByRole('link', { name: 'Arrival details' }).click()
      await expect(
        page.getByRole('heading', { name: 'Arrival details' })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Save and continue' }).click()
      await expect(
        page.getByRole('heading', {
          name: 'What type of transporter will move the animals?'
        })
      ).toBeVisible()
    }
    const selectHeading = page.getByRole('heading', {
      name: 'Search for an approved commercial transporter'
    })

    // Commercial transporter: the select page opens; choosing a transporter
    // copies its name, address and approval number into the answer (c-020).
    await openTransporters()
    await page.getByRole('radio', { name: 'Commercial' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(selectHeading).toBeVisible()
    await page
      .getByRole('radio', { name: values.commercialTransporter.name })
      .check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    // The copy persists: walking back in re-derives the checked option from
    // the copied name.
    await openTransporters()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(selectHeading).toBeVisible()
    await expect(
      page.getByRole('radio', { name: values.commercialTransporter.name })
    ).toBeChecked()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // Private transporter: the select page is no longer owed — saving the
    // type skips it and walks on to the private details page; a blank save
    // there returns to the hub.
    await openTransporters()
    await page.getByRole('radio', { name: 'Private' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Private transporter details' })
    ).toBeVisible()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    // Back to commercial: leaving scope wiped the saved transporter — no
    // radio is pre-selected on the select page.
    await openTransporters()
    await page.getByRole('radio', { name: 'Commercial' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(selectHeading).toBeVisible()
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
  })

  test('private transporter — keyed-in details owed only for the private type; a partial fill blocks the save; changing the type wipes them', async ({
    page
  }) => {
    await startNotification(page)

    // The transport section sits after commodities (RULE 1) — unlock it first.
    await unlockSections(page)

    // Every field on the merged arrival-details page is submit-enforced, so
    // one blank save walks straight through to the transporter-type page.
    const openTransporters = async () => {
      await page.getByRole('link', { name: 'Arrival details' }).click()
      await expect(
        page.getByRole('heading', { name: 'Arrival details' })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Save and continue' }).click()
      await expect(
        page.getByRole('heading', {
          name: 'What type of transporter will move the animals?'
        })
      ).toBeVisible()
    }
    const detailsHeading = page.getByRole('heading', {
      name: 'Private transporter details'
    })
    const transporter = values.privateTransporter

    // Private transporter: the details page opens. A PARTIAL fill blocks the
    // save — the fieldGroup's mandates apply once the record is provided —
    // naming the missing mandatory fields.
    await openTransporters()
    await page.getByRole('radio', { name: 'Private' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(detailsHeading).toBeVisible()
    await page.getByLabel('Name or organisation name').fill(transporter.name)
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Enter address line 1' })
    ).toBeVisible()

    // Completing the mandatory fields commits the whole group as one
    // { name, address } object and finishes the section.
    await page
      .getByLabel('Address line 1')
      .fill(transporter.address.addressLine1)
    await page.getByLabel('Town or city').fill(transporter.address.townOrCity)
    await page
      .getByLabel('Postal or zip code')
      .fill(transporter.address.postalOrZipCode)
    await page.getByLabel('Country').selectOption(transporter.address.country)
    await page
      .getByLabel('Telephone number')
      .fill(transporter.address.telephoneNumber)
    await page
      .getByLabel('Email address')
      .fill(transporter.address.emailAddress)
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    // The record persists: walking back in flattens the saved object into
    // the form fields.
    await openTransporters()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(detailsHeading).toBeVisible()
    await expect(page.getByLabel('Name or organisation name')).toHaveValue(
      transporter.name
    )
    await expect(page.getByLabel('Country')).toHaveValue(
      transporter.address.country
    )
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // Commercial transporter: the details page is no longer owed — saving
    // the type walks to the commercial select page instead; a blank save
    // there returns to the hub.
    await openTransporters()
    await page.getByRole('radio', { name: 'Commercial' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', {
        name: 'Search for an approved commercial transporter'
      })
    ).toBeVisible()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    // Back to private: leaving scope wiped the saved details — the form
    // renders empty.
    await openTransporters()
    await page.getByRole('radio', { name: 'Private' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(detailsHeading).toBeVisible()
    await expect(page.getByLabel('Name or organisation name')).toHaveValue('')
    await expect(page.getByLabel('Country')).toHaveValue('')
  })

  test('transit countries — the page is routed only for rail or road; changing the means wipes saved countries', async ({
    page
  }) => {
    await startNotification(page)

    // The transport section sits after commodities (RULE 1) — unlock it first.
    await unlockSections(page)

    // The means radios live on the merged arrival-details page (inc-065);
    // every other field there is submit-enforced, so checking a means and
    // saving routes the section from that one page.
    const openArrivalDetails = async () => {
      await page.getByRole('link', { name: 'Arrival details' }).click()
      await expect(
        page.getByRole('heading', { name: 'Arrival details' })
      ).toBeVisible()
    }
    // A blank save on the transporter-type page (submit-enforced) returns
    // to the hub.
    const saveThroughTransporters = async () => {
      await expect(transporterHeading).toBeVisible()
      await page.getByRole('button', { name: 'Save and continue' }).click()
      await expect(
        page.getByRole('heading', { name: 'Overview' })
      ).toBeVisible()
    }
    const save = () =>
      page.getByRole('button', { name: 'Save and continue' }).click()
    const transitHeading = page.getByRole('heading', {
      name: 'Which countries will the consignment travel through?'
    })
    const transporterHeading = page.getByRole('heading', {
      name: 'What type of transporter will move the animals?'
    })
    // The transit selects carry the autocomplete enhancement (inc-065): the
    // post-mount input shows the country NAME, the renamed hidden select is
    // the submitting control that holds the stored CODE.
    const firstCountryCombo = page.locator('input#transitedCountries')
    const firstCountrySelect = page.locator('select#transitedCountries-select')
    const secondCountryCombo = page.locator('input#transitedCountries-2')
    const secondCountrySelect = page.locator(
      'select#transitedCountries-2-select'
    )
    const transitRow = page.locator('.govuk-task-list__item', {
      hasText: 'Transit countries'
    })

    // A means outside the overland set skips the transit-countries page —
    // saving walks straight on to the transporter-type page — and the hub
    // shows no Transit countries row (the conditional row, inc-061).
    await openArrivalDetails()
    await page.getByRole('radio', { name: 'Airplane' }).check()
    await save()
    await expect(transitHeading).toBeHidden()
    await saveThroughTransporters()
    await expect(transitRow).toHaveCount(0)

    // Both overland means route through the transit-countries page. A blank
    // save there is allowed and walks on; the hub row appears, reading
    // Optional — transited countries are optional when in scope.
    await openArrivalDetails()
    await page.getByRole('radio', { name: 'Railway' }).check()
    await save()
    await expect(transitHeading).toBeVisible()
    await save()
    await saveThroughTransporters()
    await expect(transitRow).toContainText('Optional')

    // Save two transited countries under Road Vehicle...
    await openArrivalDetails()
    await page.getByRole('radio', { name: 'Road Vehicle' }).check()
    await save()
    await expect(transitHeading).toBeVisible()
    await chooseTransitCountry(page, 'transitedCountries', 'France')
    await page.getByRole('button', { name: 'Add another country' }).click()
    await chooseTransitCountry(page, 'transitedCountries-2', 'Belgium')
    await save()
    await saveThroughTransporters()
    await expect(transitRow).toContainText('Completed')

    // ...and they are still selected on return: the inputs show the names,
    // the hidden selects hold the stored codes.
    await openArrivalDetails()
    await expect(
      page.getByRole('radio', { name: 'Road Vehicle' })
    ).toBeChecked()
    await save()
    await expect(firstCountryCombo).toHaveValue('France')
    await expect(firstCountrySelect).toHaveValue('FR')
    await expect(secondCountryCombo).toHaveValue('Belgium')
    await expect(secondCountrySelect).toHaveValue('BE')
    await save()
    await saveThroughTransporters()

    // A means outside the overland set takes the countries out of scope —
    // saving wipes them, skips the page and drops the hub row again.
    await openArrivalDetails()
    await page.getByRole('radio', { name: 'Vessel' }).check()
    await save()
    await saveThroughTransporters()
    await expect(transitRow).toHaveCount(0)

    // Back to Road Vehicle: leaving scope wiped the saved countries — the
    // first row shows the unselected placeholder over an empty select and
    // no second row renders.
    await openArrivalDetails()
    await page.getByRole('radio', { name: 'Road Vehicle' }).check()
    await save()
    await expect(transitHeading).toBeVisible()
    await expect(firstCountryCombo).toHaveValue('Select a country')
    await expect(firstCountrySelect).toHaveValue('')
    await expect(secondCountryCombo).toHaveCount(0)
  })

  test('contact address — a blank save leaves the task open (enforcedAt=submit); selecting a contact copies it and completes the task', async ({
    page
  }) => {
    await startNotification(page)

    // The contact section sits after commodities (RULE 1) — unlock it first.
    await unlockSections(page)

    // contactAddress is a required obligation owned by the one-page contact
    // section, so once unlocked and untouched the task reads Not yet started.
    const contactRow = page.locator('.govuk-task-list__item', {
      hasText: 'Contact address'
    })
    await expect(contactRow).toContainText('Not yet started')

    await page.getByRole('link', { name: 'Contact address' }).click()
    await expect(
      page.getByRole('heading', { name: 'Contact address for consignment' })
    ).toBeVisible()

    // contactAddress is enforcedAt=submit — a blank save is not an error;
    // the one-page section returns to the hub with the task still open.
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(contactRow).toContainText('Not yet started')

    // Happy path from the shared fixture: selecting a contact COPIES its
    // name and address into the answer (c-020) and completes the task.
    await page.getByRole('link', { name: 'Contact address' }).click()
    await page.getByRole('radio', { name: values.contactAddress.name }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(contactRow).toContainText('Completed')

    // The copy persists: walking back in re-derives the checked option from
    // the copied name.
    await page.getByRole('link', { name: 'Contact address' }).click()
    await expect(
      page.getByRole('radio', { name: values.contactAddress.name })
    ).toBeChecked()
  })

  test('import purpose — owed only for the internal market; changing the reason wipes a saved purpose', async ({
    page
  }) => {
    await startNotification(page)

    // The consignment section sits after commodities (RULE 1) — unlock it first.
    await unlockSections(page)

    const reasonRow = page.locator('.govuk-task-list__item', {
      hasText: 'Main reason for importing'
    })

    // Internal market: the purpose page opens; answering the reason and its
    // purpose completes the row (the tail page feeds its own row).
    await page.getByRole('link', { name: 'Main reason for importing' }).click()
    await page.getByRole('radio', { name: 'Internal market' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Purpose in the internal market' })
    ).toBeVisible()
    await page.getByRole('radio', { name: 'Breeding' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Additional animal details' })
    ).toBeVisible()
    await page.getByRole('radio', { name: 'Slaughter' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(reasonRow).toContainText('Completed')

    // Another reason: the purpose is no longer owed — saving skips the purpose
    // page, but Transit brings the reason-gated exit-details pages into scope
    // (destination country + port of exit; exit date stays out — it is owed
    // only for temporary admission of horses). Both are save-enforced, so the
    // walk answers them before reaching the tail page; the certified-for
    // answer persists, so a save there returns to the hub with the reason
    // task still complete.
    await page.getByRole('link', { name: 'Main reason for importing' }).click()
    await page.getByRole('radio', { name: 'Transit' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Destination country' })
    ).toBeVisible()
    await page.getByLabel('Destination country').selectOption('FR')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Port of exit' })
    ).toBeVisible()
    await page.getByLabel('Port of exit').selectOption({ index: 2 })
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Additional animal details' })
    ).toBeVisible()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(reasonRow).toContainText('Completed')

    // Back to the internal market: leaving scope wiped the saved purpose —
    // no radio is pre-selected and the task is owed (open) again.
    await page.getByRole('link', { name: 'Main reason for importing' }).click()
    await page.getByRole('radio', { name: 'Internal market' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Purpose in the internal market' })
    ).toBeVisible()
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)

    // A blank purpose save is not an error (enforcedAt=submit) but walks on to
    // the tail page; saving through it leaves the task open (purpose unowed).
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Additional animal details' })
    ).toBeVisible()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(reasonRow).not.toContainText('Completed')
  })

  test('additional details — the unweaned-animals question shows only when a triggering commodity line exists', async ({
    page
  }) => {
    await startNotification(page)

    // Commodities (used by addCommodity below) is gated on countryOfOrigin
    // (RULE 1); each added line then unlocks the consignment section it opens.
    await answerCountryOfOrigin(page)

    const certifiedFor = page.getByRole('group', {
      name: 'What are the animals certified for?'
    })
    const unweaned = page.getByRole('group', {
      name: 'Does the consignment contain any unweaned animals?'
    })

    // A commodity line for the given species, taking the fewest steps: the
    // batch search keeps earlier selections ticked (hidden carried inputs),
    // so each call ADDS a line; the counts are submit-enforced, so the
    // details page saves blank straight back to the hub.
    const addCommodity = async (query, species) => {
      await page.goto(`${BASE}/hub`)
      await page.getByRole('link', { name: 'What are you importing?' }).click()
      await searchAndSelect(page, query, [species])
      await page.getByRole('button', { name: 'Save and continue' }).click()
      await expect(
        page.getByRole('heading', { name: 'Consignment details' })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Save and continue' }).click()
      await expect(
        page.getByRole('heading', { name: 'Overview' })
      ).toBeVisible()
    }

    // A blank reason (enforcedAt=submit) walks straight to the tail page,
    // skipping the internal-market purpose page.
    const openAdditionalDetails = async () => {
      await page.goto(`${BASE}/hub`)
      await page
        .getByRole('link', { name: 'Main reason for importing' })
        .click()
      await expect(
        page.getByRole('heading', {
          name: 'What is the main reason for importing the animals?'
        })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Save and continue' }).click()
      await expect(
        page.getByRole('heading', { name: 'Additional animal details' })
      ).toBeVisible()
    }

    // A non-triggering commodity (cats): the certified-for question shows, but
    // the notification-level unweaned-animals question is out of scope.
    await addCommodity('Cat', 'Felis catus')
    await openAdditionalDetails()
    await expect(certifiedFor).toBeVisible()
    await expect(unweaned).toBeHidden()

    // Adding a triggering commodity (cattle) brings the unweaned-animals
    // question into scope across the commodity lines (frame:"anyItem").
    await addCommodity('Cow', 'Bos taurus')
    await openAdditionalDetails()
    await expect(certifiedFor).toBeVisible()
    await expect(unweaned).toBeVisible()
  })

  test('CPH number — the CPH page and addresses-hub row show only when a CPH-triggering commodity line exists', async ({
    page
  }) => {
    await startNotification(page)

    // Commodities (used by addCommodity below) is gated on countryOfOrigin
    // (RULE 1); each added line then unlocks the addresses section it opens.
    await answerCountryOfOrigin(page)

    const cphHeading = page.getByRole('heading', {
      name: 'County Parish Holding (CPH)'
    })
    const hubHeading = page.getByRole('heading', {
      name: 'Overview'
    })
    const addressesHeading = page.getByRole('heading', {
      name: 'Consignment addresses'
    })
    const cphRow = page.locator('.govuk-summary-list__row', {
      has: page.getByText('County Parish Holding number (CPH)', {
        exact: true
      })
    })

    // A commodity line for the given species, taking the fewest steps: the
    // batch search keeps earlier selections ticked (hidden carried inputs),
    // so each call ADDS a line; the counts are submit-enforced, so the
    // details page saves blank straight back to the hub.
    const addCommodity = async (query, species) => {
      await page.goto(`${BASE}/hub`)
      await page.getByRole('link', { name: 'What are you importing?' }).click()
      await searchAndSelect(page, query, [species])
      await page.getByRole('button', { name: 'Save and continue' }).click()
      await expect(
        page.getByRole('heading', { name: 'Consignment details' })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Save and continue' }).click()
      await expect(hubHeading).toBeVisible()
    }

    const openAddresses = async () => {
      await page.goto(`${BASE}/hub`)
      await page.getByRole('link', { name: 'Roles and addresses' }).click()
      await expect(addressesHeading).toBeVisible()
    }

    // A non-triggering commodity (cats): CPH is out of scope, so the addresses
    // hub shows no CPH row and Continue returns straight to the hub — no CPH
    // page (the derived gate).
    await addCommodity('Cat', 'Felis catus')
    await openAddresses()
    await expect(cphRow).toBeHidden()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(hubHeading).toBeVisible()
    await expect(cphHeading).toBeHidden()

    // Adding a triggering commodity (cattle) brings CPH into scope across the
    // commodity lines (frame:"anyItem") — the row appears on the addresses hub
    // in its empty state.
    await addCommodity('Cow', 'Bos taurus')
    await openAddresses()
    await expect(cphRow).toBeVisible()
    await expect(cphRow).toContainText('Not added yet')

    // Hub-row add flow: the Add link opens the CPH page and saving returns to
    // the addresses hub (not the sequential exit), the row showing the stored
    // slash-stripped value.
    await cphRow.getByRole('link', { name: 'Add' }).click()
    await expect(cphHeading).toBeVisible()
    await page.getByLabel('County Parish Holding (CPH)').fill('12/345/6789')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(addressesHeading).toBeVisible()
    await expect(cphRow).toContainText('123456789')

    // Filled state: the row's action reads Change, the page shows the stored
    // value, and the back link returns to the addresses hub.
    await cphRow.getByRole('link', { name: 'Change' }).click()
    await expect(page.getByLabel('County Parish Holding (CPH)')).toHaveValue(
      '123456789'
    )
    await page.getByRole('link', { name: 'Back' }).click()
    await expect(addressesHeading).toBeVisible()

    // The sequential fallback stays: Continue from the addresses landing still
    // walks to the CPH tail page.
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(cphHeading).toBeVisible()
  })

  test('check and submit — the review task is on the hub and check your answers lists the answered rows', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)

    // The review task is on the hub from the start, but RULE 2 keeps it locked
    // ("Cannot start yet", no link) until every answer section is submit-ready.
    const reviewRow = page.locator('.govuk-task-list__item', {
      hasText: 'Check and submit'
    })
    await expect(reviewRow).toBeVisible()
    await expect(reviewRow).toContainText('Cannot start yet')

    // Walk every answer section in the gated order — this satisfies
    // readyForCheckYourAnswers and unlocks the review row.
    await completeAnswerSections(page)

    // The review task now opens check your answers.
    await reviewRow.getByRole('link', { name: 'Check and submit' }).click()
    await expect(
      page.getByRole('heading', { name: 'Check your answers' })
    ).toBeVisible()
    expect(page.url()).toContain('/notification-view')

    // The review page renders the design's numbered summary-card sections
    // (inc-054). Documents stay optional and unadded, so section 4 is absent.
    await expect(
      page.getByRole('heading', { name: '1. About the consignment' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: '2. Movement' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: '3. Addresses' })
    ).toBeVisible()

    // The answered live-animals rows show the fixture values. The key match
    // is whole-cell (modulo template whitespace) so 'Region of origin code'
    // cannot also match the 'Region of origin code required' row.
    const summaryValue = (key) =>
      page
        .locator('.govuk-summary-list__row')
        .filter({
          has: page.locator('.govuk-summary-list__key', {
            hasText: new RegExp(`^\\s*${key}\\s*$`)
          })
        })
        .locator('.govuk-summary-list__value')

    await expect(summaryValue('Country of origin')).toHaveText('France')
    await expect(summaryValue('Region of origin code')).toHaveText(
      values.regionOfOriginCode
    )
    await expect(summaryValue('Internal reference number')).toHaveText(
      values.internalReferenceNumber
    )

    // The commodity line renders as a per-species card (title = commodity +
    // species, inc-062) whose read-only table lists the identifier unit
    // added during the walk.
    const speciesCard = page.locator('.govuk-summary-card', {
      has: page.getByRole('heading', { name: 'Cow (0102) — Bos taurus' })
    })
    await expect(speciesCard.locator('.govuk-table')).toContainText(
      values.commodityLines[0].animalIdentifiers[0].animalIdentifierEarTag
    )

    // The contact address expands to name plus address lines inside its card.
    const contactCard = page.locator('.govuk-summary-card', {
      has: page.getByRole('heading', {
        name: 'Contact address for this consignment'
      })
    })
    await expect(
      contactCard.locator('.govuk-summary-list__value')
    ).toContainText(values.contactAddress.name)
  })

  test('change from check your answers — collection edits thread the change context through the loop and only the exit returns to the review', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await completeAnswerSections(page)

    // The documents card only renders on the review once a document exists —
    // add the fixture document from the hub first (no change context yet).
    // Continue needs the scan settled, so refresh the canned lifecycle first.
    const [doc] = values.documents
    await page.getByRole('link', { name: 'Uploaded documents' }).click()
    await addDocument(page, doc)
    await page.getByRole('link', { name: 'Refresh virus scan status' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    // Open the review. The uploaded document's attachment type was derived
    // from the file's extension (c-034 source flip) — the card shows it.
    await page
      .locator('.govuk-task-list__item', { hasText: 'Check and submit' })
      .getByRole('link', { name: 'Check and submit' })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Check your answers' })
    ).toBeVisible()
    const documentsCard = page.locator('.govuk-summary-card', {
      hasText: 'Uploaded documents'
    })
    await expect(documentsCard).toContainText('Attachment type')
    await expect(documentsCard).toContainText('PDF')

    // Species-card leg: Change enters the identification surface with the
    // change context. The fixture line already holds its declared 1 unit, so
    // the surface is at the count-must-match ceiling and offers Remove only —
    // replace the unit: Remove threads the change context, the add form
    // returns, and the Save-and-add-another PRG cycle stays on the surface;
    // Save and finish exits back to the review with the replacement unit
    // rendered.
    await page
      .getByRole('link', { name: 'Change animal identifiers for commodity 1' })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Animal identification details' })
    ).toBeVisible()
    expect(page.url()).toContain('change=1')
    await page
      .getByRole('link', { name: 'Remove animal 1', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Animal identification details' })
    ).toBeVisible()
    expect(page.url()).toContain('change=1')
    await page.getByLabel('Ear tag number').fill('UK000000000002')
    await page.getByRole('button', { name: 'Save and add another' }).click()
    await expect(
      page.getByRole('heading', { name: 'Animal identification details' })
    ).toBeVisible()
    expect(page.url()).toContain('change=1')
    await page.getByRole('button', { name: 'Save and finish' }).click()
    await expect(
      page.getByRole('heading', { name: 'Check your answers' })
    ).toBeVisible()
    const speciesCard = page.locator('.govuk-summary-card', {
      has: page.getByRole('heading', { name: 'Cow (0102) — Bos taurus' })
    })
    await expect(speciesCard.locator('.govuk-table')).toContainText(
      'UK000000000002'
    )

    // Documents leg: the card's Change enters the single-page loop with the
    // change context; adding another document loops; the refresh affordance
    // keeps the context; Continue exits back to the review with the new
    // document rendered.
    const secondDoc = {
      accompanyingDocumentType: 'COMMERCIAL_INVOICE',
      accompanyingDocumentReference: 'INV-2026-0042',
      accompanyingDocumentDateOfIssue: { day: '3', month: '1', year: '2026' },
      filename: 'commercial-invoice.pdf'
    }
    await page.getByRole('link', { name: 'Change documents' }).click()
    await expect(
      page.getByRole('heading', { name: 'Upload documents' })
    ).toBeVisible()
    expect(page.url()).toContain('change=1')
    await addDocument(page, secondDoc)
    await expect(
      page.locator('.govuk-table__row', {
        hasText: secondDoc.accompanyingDocumentReference
      })
    ).toBeVisible()
    expect(page.url()).toContain('change=1')
    await page.getByRole('link', { name: 'Refresh virus scan status' }).click()
    expect(page.url()).toContain('change=1')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Check your answers' })
    ).toBeVisible()
    await expect(
      page.getByText(secondDoc.accompanyingDocumentReference)
    ).toBeVisible()
  })

  test('declaration — the full happy path submits from the declaration page and lands on the confirmation page', async ({
    page
  }) => {
    // The walk covers every task on the hub, so give it room.
    test.slow()
    await startNotification(page)
    const [line] = values.commodityLines
    const arrival = values.arrivalDateAtPort
    const save = () =>
      page.getByRole('button', { name: 'Save and continue' }).click()
    const task = (name) => page.getByRole('link', { name }).click()

    // Origin.
    await task('Where is this consignment coming from?')
    await chooseCountryOfOrigin(page, FIXTURE_COUNTRY)
    await page.getByRole('radio', { name: 'Yes' }).check()
    await page
      .getByLabel('Region of origin code', { exact: true })
      .fill(values.regionOfOriginCode)
    await page
      .getByLabel('Your internal reference for this consignment (optional)')
      .fill(values.internalReferenceNumber)
    await save()

    // Commodities: the batch search creates the fixture's cattle line, then
    // the consolidated details page takes its per-species counts (inc-062).
    await task('What are you importing?')
    await searchAndSelect(page, line.commoditySelection, ['Bos taurus'])
    await save()
    await expect(
      page.getByRole('heading', { name: 'Consignment details' })
    ).toBeVisible()
    await page
      .getByLabel('Number of animals')
      .fill(line.numberOfAnimalsQuantity)
    await page
      .getByLabel('Number of packages (optional)')
      .fill(line.numberOfPackages)
    await save()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    // Every line owes at least one animal identifier unit (inc-035): add one
    // on the single identification surface (inc-063). Cattle is off the
    // permanent-address gate, so an ear tag alone completes the unit.
    const [unit] = line.animalIdentifiers
    await task('Animal identification details')
    await expect(
      page.getByRole('heading', { name: 'Animal identification details' })
    ).toBeVisible()
    await page.getByLabel('Ear tag number').fill(unit.animalIdentifierEarTag)
    await page.getByRole('button', { name: 'Save and finish' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    // About the consignment: internal market walks on to the purpose page,
    // then the additional-details tail.
    await task('Main reason for importing')
    await page.getByRole('radio', { name: 'Internal market' }).check()
    await save()
    await page.getByRole('radio', { name: 'Breeding' }).check()
    await save()

    // Additional animal details: the certified-for question always shows; the
    // cattle line added above triggers the notification-level unweaned-animals
    // question across the commodity lines.
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

    // Accompanying documents are optional — the task is already Completed.

    // Addresses: all five party spokes copy-commit from the landing page.
    await task('Roles and addresses')
    const parties = [
      ['Consignor or exporter', values.consignor.name],
      ['Place of destination', values.placeOfDestination.name],
      ['Place of origin', values.placeOfOrigin.name],
      ['Consignee', values.consignee.name],
      ['Importer', values.importer.name]
    ]
    for (const [label, name] of parties) {
      await page
        .locator('.govuk-summary-list__row', {
          has: page.getByText(label, { exact: true })
        })
        .getByRole('link', { name: 'Add' })
        .click()
      await page.getByRole('radio', { name }).check()
      await save()
    }
    // The cattle line added above triggers the notification-level CPH question
    // (frame:"anyItem"), so the addresses section walks on to the CPH tail page.
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'County Parish Holding (CPH)' })
    ).toBeVisible()
    await page
      .getByLabel('County Parish Holding (CPH)')
      .fill(values.countyParishHoldingCph)
    await save()

    // Transport: the merged arrival-details page takes all five fields in
    // one save (inc-065), then transit countries, transporter type,
    // commercial select.
    await task('Arrival details')
    await page.getByLabel('Day').fill(arrival.day)
    await page.getByLabel('Month').fill(arrival.month)
    await page.getByLabel('Year').fill(arrival.year)
    await choosePortOfEntry(page)
    await page
      .getByRole('radio', { name: meansOfTransportLabel, exact: true })
      .check()
    await page
      .getByLabel('Transport identification')
      .fill(values.transportIdentification)
    await page
      .getByLabel('Transport document reference')
      .fill(values.transportDocumentReference)
    await save()
    // Road Vehicle routes the section through the transit-countries page.
    await chooseTransitCountry(page, 'transitedCountries', 'France')
    await page.getByRole('button', { name: 'Add another country' }).click()
    await chooseTransitCountry(page, 'transitedCountries-2', 'Belgium')
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

    // Check your answers walks on to the declaration (c-022 end shape).
    await task('Check and submit')
    await expect(
      page.getByRole('heading', { name: 'Check your answers' })
    ).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Declaration' })
    ).toBeVisible()
    // The declaration statements carry the design copy (07-03, f-072).
    await expect(
      page.getByRole('heading', {
        name: 'I am the contact for the authorities and located in the UK.'
      })
    ).toBeVisible()

    // The declaration is the submit-enforcement point: an unticked checkbox
    // blocks the submit with an error.
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', {
        name: 'Confirm that the information is true and correct before submitting'
      })
    ).toBeVisible()

    // Confirming submits (DRAFT to SUBMITTED) and redirects to the dedicated
    // confirmation page (c-022 superseded at M3-16): a GDS confirmation panel
    // carrying the notification's reference number.
    await page
      .getByRole('checkbox', { name: /I confirm that I have reviewed/ })
      .check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Import notification submitted' })
    ).toBeVisible()
    expect(page.url()).toContain('/confirmation')
    await expect(page.getByText('Your reference number')).toBeVisible()
    await expect(page.locator('.govuk-panel')).toContainText(
      /GBN-AG-\d{2}-[0-9A-HJKMNP-TV-Z]{6}/
    )
    // The panel is the confirmation page's reference display — the strip
    // does not double-render above it.
    await expect(page.locator('.app-journey-strip')).toHaveCount(0)
    const today = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    await expect(page.getByText(`Date of declaration: ${today}`)).toBeVisible()

    // Per the c-029 amend-and-resubmit ruling the page carries dashboard
    // guidance, never an outstanding-items checklist.
    await expect(
      page.getByRole('link', { name: 'Return to your dashboard' })
    ).toBeVisible()

    // A revisit to the declaration of a submitted notification lands back on
    // the confirmation page.
    await page.goto(page.url().replace('/confirmation', '/declaration'))
    await expect(
      page.getByRole('heading', { name: 'Import notification submitted' })
    ).toBeVisible()
    expect(page.url()).toContain('/confirmation')
  })

  test('dashboard amend — a submitted row offers View and Amend; Amend re-enters an editable journey and the resubmission passes the same gate', async ({
    page
  }) => {
    // Completing every task and submitting twice is the longest walk here.
    test.slow()
    await startNotification(page)
    await completeAnswerSections(page)

    // Submit through check your answers and the declaration.
    await page.getByRole('link', { name: 'Check and submit' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Declaration' })
    ).toBeVisible()
    await page
      .getByRole('checkbox', { name: /I confirm that I have reviewed/ })
      .check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Import notification submitted' })
    ).toBeVisible()
    const panelText = await page.locator('.govuk-panel').textContent()
    const [reference] = panelText.match(GBN_REFERENCE)

    // The dashboard row has flipped to Submitted with View + Amend actions.
    await page.goto(`${BASE}/home`)
    const row = page.getByRole('row', { name: new RegExp(reference) })
    await expect(row.getByText('Submitted')).toBeVisible()

    // View opens the read view of the submitted notification.
    await row
      .getByRole('link', { name: `View notification ${reference}` })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Check your answers' })
    ).toBeVisible()
    await expect(page.locator('.app-journey-strip')).toContainText('Submitted')
    await expect(page.locator('.app-journey-strip')).toContainText(reference)

    // Amend transitions the notification back to editable and re-enters the
    // journey at the hub — the strip shows Draft again (the pinned amending
    // status; the backend AMEND tag is not surfaced as its own strip status).
    await page.goto(`${BASE}/home`)
    await row
      .getByRole('button', { name: `Amend notification ${reference}` })
      .click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(page.locator('.app-journey-strip')).toContainText('Draft')
    await expect(page.locator('.app-journey-strip')).toContainText(reference)

    // The journey really is writable again: change an answer and save.
    await page
      .getByRole('link', { name: 'Where is this consignment coming from?' })
      .click()
    await page
      .getByLabel('Your internal reference for this consignment (optional)')
      .fill('AmendedRef99')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    // Resubmission goes through declaration and the same submit gate.
    await page.getByRole('link', { name: 'Check and submit' }).click()
    await expect(
      page.getByRole('heading', { name: 'Check your answers' })
    ).toBeVisible()
    await expect(page.getByText('AmendedRef99')).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Declaration' })
    ).toBeVisible()
    await page
      .getByRole('checkbox', { name: /I confirm that I have reviewed/ })
      .check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Import notification submitted' })
    ).toBeVisible()

    // And the row reads Submitted once more.
    await page.goto(`${BASE}/home`)
    await expect(row.getByText('Submitted')).toBeVisible()
  })
})

// inc-058 degradation leg: with JavaScript off the autocomplete never mounts
// and the plain server-rendered select still submits (graceful degradation).
test.describe('live-animals — country of origin without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('the plain select still submits and persists', async ({ page }) => {
    await startNotification(page)
    await page
      .getByRole('link', { name: 'Where is this consignment coming from?' })
      .click()

    // No enhancement: the select keeps its id and no autocomplete input mounts.
    await expect(page.locator('.autocomplete__input')).toHaveCount(0)
    const select = page.getByLabel('Country of origin')
    await select.selectOption(values.countryOfOrigin)
    await page.getByRole('radio', { name: 'No' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    // The committed value is on the select on re-entry.
    await page
      .getByRole('link', { name: 'Where is this consignment coming from?' })
      .click()
    await expect(page.getByLabel('Country of origin')).toHaveValue(
      values.countryOfOrigin
    )
  })
})
