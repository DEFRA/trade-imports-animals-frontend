import { readFileSync } from 'node:fs'
import { expect } from '@playwright/test'

import {
  addUtcMonths,
  formatDateText
} from '../src/server/app/lib/validate/calendar.js'
import { COUNTRY_LABELS } from '../src/server/app/services/countries/stub.js'
import { STUB_BOOK } from '../src/server/app/services/address-book/stub/index.js'
import { PORTS } from '../src/server/app/services/ports/stub.js'
import { copy as sharedAppCopy } from '../src/server/app/shared/copy.en.js'

export { signIn } from './sign-in.js'

const stubNameById = new Map(STUB_BOOK.map(({ id, name }) => [id, name]))

/** Happy-path parties may be inline ({ name }) or picker refs ({ addressId }). */
export const partyPickerName = (party) =>
  party?.name ?? stubNameById.get(party?.addressId)

export const BASE = ''

export const journeyIdFromPage = (page) => {
  const match = new URL(page.url()).pathname.match(/\/notifications\/([^/]+)/)
  if (!match) throw new Error(`No journey id in URL: ${page.url()}`)
  return match[1]
}

export const journeyUrl = (page, slug = '') =>
  `${BASE}/notifications/${journeyIdFromPage(page)}${slug ? `/${slug}` : ''}`

export const chooseTodayFromDatePicker = async (page, label) => {
  const expected = await page.evaluate(() => {
    const date = new Date()
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ]
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ]
    return {
      accessibleName: `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`,
      inputValue: `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
    }
  })
  const picker = page.locator('.moj-datepicker', {
    has: page.getByLabel(label)
  })
  await picker.getByRole('button', { name: 'Choose date' }).click()
  const dialog = picker.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog
    .getByRole('button', { name: expected.accessibleName, exact: true })
    .click()
  return expected.inputValue
}

export const { values } = JSON.parse(
  readFileSync(
    new URL(
      '../src/server/app/sets/live-animals/journeys/linear/flow/fixtures/happy-path.json',
      import.meta.url
    ),
    'utf8'
  )
)

// The arrival-date window moves with the wall clock, so the driver computes a
// date inside it rather than reading the fixed value out of the fixture.
const arrivalDate = addUtcMonths(new Date(), 1)
export const ARRIVAL_DATE_IN_WINDOW = formatDateText(arrivalDate)

// Spelled out rather than routed through `formatDisplayDate`: that is the
// function rendering the cell this value is asserted against, so sharing it
// would move expectation and actual together and hide a format regression.
const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]
export const ARRIVAL_DATE_IN_WINDOW_DISPLAY = `${arrivalDate.getUTCDate()} ${SHORT_MONTHS[arrivalDate.getUTCMonth()]} ${arrivalDate.getUTCFullYear()}`

const FIXTURE_COUNTRY = COUNTRY_LABELS[values.countryOfOrigin]

// The origin page fills the country in as a fixed prefix and asks only for the
// part after it, so the fixture's whole code is split the same way here.
const REGION_CODE_SEPARATOR = '-'
const FIXTURE_REGION_CODE_SUFFIX = values.regionOfOriginCode.slice(
  values.countryOfOrigin.length + REGION_CODE_SEPARATOR.length
)

// Country of origin is a type-ahead (accessible-autocomplete) enhancing a
// native <select>. With JavaScript the field resolved by its label is the
// enhanced input; without it the field is still the select. Ask the element
// what it is — one round trip, no timeout. Mirrors `choosePort` in
// src/server/app/sets/live-animals/journeys/linear/features/transport/fit/arrival-transit.fit.spec.js.
export const chooseCountryOfOrigin = async (page, name = FIXTURE_COUNTRY) => {
  // The enhancement is a module script, so it has run by DOMContentLoaded.
  // Waiting for that event settles which element the label resolves to before
  // the probe reads it — without it the probe can catch the page mid-load,
  // read the not-yet-enhanced select and then act on the enhanced input.
  // With JavaScript off the event has already fired, so this costs nothing.
  await page.waitForLoadState('domcontentloaded')
  const field = page.getByLabel('Country of origin', { exact: true })
  if ((await field.evaluate((el) => el.tagName)) === 'SELECT') {
    await field.selectOption({ label: name })
    return
  }
  await field.click()
  await field.fill(name)
  await page.getByRole('option', { name, exact: true }).click()
}

export const answerOriginEntry = async (page) => {
  await chooseCountryOfOrigin(page)
  await page.getByRole('radio', { name: 'No' }).check()
  await save(page)
}

/** Origin is the journey's entry page: the entry guard holds a notification
 * there until it is answered, so reaching the hub means answering it. */
export const startNotification = async (page) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start a new notification' }).click()
  await expect(
    page.getByRole('heading', { name: 'Origin of the import' })
  ).toBeVisible()
  await answerOriginEntry(page)
  await page.goto(journeyUrl(page))
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
}

const FIXTURE_PORT = PORTS.find((port) => port.code === values.portOfEntry)
const FIXTURE_PORT_OPTION = `${FIXTURE_PORT.name} (${FIXTURE_PORT.code})`

// Port of entry is a type-ahead (accessible-autocomplete) enhancing a native
// <select>. Drive it the way a user does: type to filter, then pick the match.
export const choosePortOfEntry = async (page, option = FIXTURE_PORT_OPTION) => {
  const field = page.getByLabel('Port of entry', { exact: true })
  await field.click()
  await field.fill(option)
  await page.getByRole('option', { name: option, exact: true }).click()
}

export const answerCountryOfOrigin = async (page) => {
  await page
    .getByRole('link', { name: 'Where is this consignment coming from?' })
    .click()
  await chooseCountryOfOrigin(page)
  await page.getByRole('radio', { name: 'No' }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
}

// The commodity page lists nothing until it is searched, so a species is
// reached the way a trader reaches it: search, then tick the result.
export const searchCommodities = async (page, query) => {
  await page.getByLabel('Search for a commodity').fill(query)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
}

export const selectSpecies = async (page, speciesNames) => {
  for (const name of speciesNames) {
    await searchCommodities(page, name)
    await page.getByRole('checkbox', { name }).check()
  }
}

export const expectSpeciesSelected = async (page, name) =>
  expect(page.locator('#commodity-selection')).toContainText(name)

export const unlockSections = async (page) => {
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  await selectSpecies(page, ['Felis catus'])
  await save(page)
  await expect(
    page.getByRole('heading', { name: 'Commodity details' })
  ).toBeVisible()
  // The animal count is save-blocking, so the page will not let the journey
  // past it unanswered.
  await page.getByLabel('Number of animals').fill('1')
  await save(page)
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
}

// The enhanced file upload hides the input behind a drop-zone button, so the
// file goes to the input itself rather than to the labelled control.
const setUploadFile = (page, filename, bytes) =>
  page.locator('input[type="file"]').setInputFiles({
    name: filename,
    mimeType: 'application/pdf',
    buffer: bytes ?? Buffer.from('%PDF-1.4 test upload')
  })

export const addDocument = async (page, entry) => {
  await page
    .getByLabel('Document reference')
    .fill(entry.accompanyingDocumentReference)
  await page
    .getByLabel('Document type')
    .selectOption(entry.accompanyingDocumentType)
  const issued = entry.accompanyingDocumentDateOfIssue
  await page
    .getByLabel('Date of issue')
    .fill(`${issued.day}/${issued.month}/${issued.year}`)
  await setUploadFile(page, entry.filename)
  await page.getByRole('button', { name: 'Save and add another' }).click()
}

const save = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

// One page-answering block per question, so the same keystrokes drive the
// journey whether it is reached page by page through the opening run or one
// task at a time from the hub. Each block ends on its own save and leaves the
// landing assertion to the caller, because where a page lands is exactly what
// the two ways of walking the journey disagree about.

export const answerOriginDetails = async (page) => {
  await chooseCountryOfOrigin(page)
  await page.getByRole('radio', { name: 'Yes' }).check()
  await page
    .getByLabel('Enter the region of origin code', { exact: true })
    .fill(FIXTURE_REGION_CODE_SUFFIX)
  await page
    .getByLabel('Your internal reference for this consignment (optional)')
    .fill(values.internalReferenceNumber)
  await save(page)
}

export const answerCommodityDetails = async (page) => {
  const [line] = values.commodityLines
  await selectSpecies(page, ['Bos taurus'])
  await save(page)
  await expect(
    page.getByRole('heading', { name: 'Commodity details' })
  ).toBeVisible()
  await page.getByLabel('Number of animals').fill(line.numberOfAnimalsQuantity)
  await page
    .getByLabel('Number of packages (when required)')
    .fill(line.numberOfPackages)
  await save(page)
}

export const answerAnimalIdentification = async (page) => {
  const [unit] = values.commodityLines[0].animalIdentifiers
  await expect(
    page.getByRole('heading', { name: 'Identification details', exact: true })
  ).toBeVisible()
  await page
    .getByLabel('Ear tag', { exact: true })
    .fill(unit.animalIdentifierEarTag)
  await save(page)
}

export const answerImportReason = async (page) => {
  await page.getByRole('radio', { name: 'Internal market' }).check()
  // The purpose is a conditional reveal under the reason, so both answers go
  // in on the one submit.
  await page.getByRole('radio', { name: 'Breeding' }).check()
  await save(page)
}

export const answerAdditionalDetails = async (page) => {
  await expect(
    page.getByRole('heading', { name: 'Additional details', exact: true })
  ).toBeVisible()
  await page.getByRole('radio', { name: 'Slaughter' }).check()
  await page
    .getByRole('group', {
      name: 'Does the consignment contain any unweaned animals?'
    })
    .getByRole('radio', { name: 'No' })
    .check()
  await save(page)
}

export const answerRolesAndAddresses = async (page) => {
  const parties = [
    ['Consignor or exporter', partyPickerName(values.consignor)],
    ['Place of destination', partyPickerName(values.placeOfDestination)],
    ['Place of origin', partyPickerName(values.placeOfOrigin)],
    ['Consignee', partyPickerName(values.consignee)],
    ['Importer', partyPickerName(values.importer)]
  ]
  for (const [label, name] of parties) {
    await page
      .locator('.govuk-summary-list__row', {
        has: page.getByText(label, { exact: true })
      })
      .getByRole('link', { name: 'Add' })
      .click()
    await page.getByRole('radio', { name }).check()
    await save(page)
  }
  await save(page)
}

// The fixture holds the number in the slashed form a trader reads it in,
// which is the 2/3/4 split the page takes in three boxes.
const [FIXTURE_CPH_COUNTY, FIXTURE_CPH_PARISH, FIXTURE_CPH_HOLDING] =
  values.countyParishHoldingCph.split('/')

export const answerCphNumber = async (page) => {
  await expect(
    page.getByRole('heading', {
      name: 'Add the county parish holding number (CPH)'
    })
  ).toBeVisible()
  await page.getByLabel('County', { exact: true }).fill(FIXTURE_CPH_COUNTY)
  await page.getByLabel('Parish', { exact: true }).fill(FIXTURE_CPH_PARISH)
  await page
    .getByLabel('Holding number', { exact: true })
    .fill(FIXTURE_CPH_HOLDING)
  await save(page)
}

export const answerArrivalDetails = async (page) => {
  await page
    .getByLabel('Arrival date at port of entry')
    .fill(ARRIVAL_DATE_IN_WINDOW)
  await choosePortOfEntry(page)
  await page
    .locator('select#meansOfTransport')
    .selectOption(values.meansOfTransport)
  await page
    .getByLabel('Transport identification')
    .fill(values.transportIdentification)
  await page
    .getByLabel('Transport document reference')
    .fill(values.transportDocumentReference)
  await save(page)
}

// Transit countries are added one at a time through a type-ahead, each one
// landing in the list before the next is searched for. Mirrors
// `addTransitCountry` in
// src/server/app/sets/live-animals/journeys/linear/features/transport/fit/arrival-transit.fit.spec.js.
export const addTransitCountry = async (page, name) => {
  await page.waitForLoadState('domcontentloaded')
  const field = page.getByLabel('Enter a country', { exact: true })
  if ((await field.evaluate((el) => el.tagName)) === 'SELECT') {
    await field.selectOption({ label: name })
  } else {
    await field.click()
    await field.fill(name)
    await page.getByRole('option', { name, exact: true }).click()
  }
  await page.getByRole('button', { name: 'Add country', exact: true }).click()
  // The row landing is the post-condition — a refused add re-renders this page
  // with the button still on it, so without this the journey quietly saves a
  // different answer.
  await expect(page.getByRole('cell', { name, exact: true })).toBeVisible()
}

export const answerTransitCountries = async (page) => {
  await addTransitCountry(page, 'France')
  await addTransitCountry(page, 'Belgium')
  await save(page)
}

export const answerTransporter = async (page) => {
  await page
    .getByRole('radio', { name: values.transporterType, exact: true })
    .check()
  await save(page)
  await page
    .getByRole('radio', { name: values.commercialTransporter.name })
    .check()
  await save(page)
}

export const answerContactAddress = async (page) => {
  await page
    .getByRole('radio', { name: partyPickerName(values.contactAddress) })
    .check()
  await save(page)
}

/** Answers the whole notification one task row at a time, the way a returning
 * user works once the opening run is over. */
export const completeAnswerSections = async (page) => {
  const task = (name) => page.getByRole('link', { name }).click()
  const overview = () =>
    expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

  await task('Where is this consignment coming from?')
  await answerOriginDetails(page)

  await task('What are you importing?')
  await answerCommodityDetails(page)
  await overview()

  await task('Animal identification details')
  await answerAnimalIdentification(page)
  await overview()

  await task('Main reason for importing')
  await answerImportReason(page)
  await answerAdditionalDetails(page)

  await task('Roles and addresses')
  await answerRolesAndAddresses(page)
  await answerCphNumber(page)

  await task('Arrival details')
  await answerArrivalDetails(page)
  await answerTransitCountries(page)
  await answerTransporter(page)

  await task('Contact address')
  await answerContactAddress(page)
}

/**
 * A page reached from another page ends with the primary alone: the shared
 * saveActions macro emits no "Save and return to overview" button and no
 * "Cancel and return to overview" link.
 */
export const expectPageEndsWithPrimaryAlone = async (page) => {
  await expect(
    page.getByRole('button', {
      name: sharedAppCopy.saveActions.saveAndContinue,
      exact: true
    })
  ).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: sharedAppCopy.saveActions.saveAndReturnToHub
    })
  ).toHaveCount(0)
  await expect(
    page.getByRole('link', {
      name: sharedAppCopy.saveActions.cancelAndReturnToHub
    })
  ).toHaveCount(0)
}
