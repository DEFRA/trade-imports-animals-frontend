import { readFileSync } from 'node:fs'
import { expect } from '@playwright/test'

import {
  addUtcMonths,
  formatDateText
} from '../src/server/app/lib/validate/calendar.js'
import { COUNTRY_LABELS } from '../src/server/app/services/countries/stub.js'
import { PORTS } from '../src/server/app/services/ports/stub.js'
import { copy as transportCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/transport/copy/copy.en.js'

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

const meansOfTransportLabel =
  transportCopy.portOfEntry.means.options[values.meansOfTransport]

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

export const startNotification = async (page) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start a new notification' }).click()
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
  await page.goto(journeyUrl(page))
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
}

const FIXTURE_COUNTRY = COUNTRY_LABELS[values.countryOfOrigin]

export const chooseCountryOfOrigin = async (page, name = FIXTURE_COUNTRY) => {
  await page.getByLabel('Country of origin').selectOption({ label: name })
}

const FIXTURE_PORT = PORTS.find((port) => port.code === values.portOfEntry)
const FIXTURE_PORT_OPTION = `${FIXTURE_PORT.name} (${FIXTURE_PORT.code})`

const choosePortOfEntry = async (page) => {
  await page
    .getByLabel('Port of entry', { exact: true })
    .selectOption({ label: FIXTURE_PORT_OPTION })
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

export const selectSpecies = async (page, speciesNames) => {
  for (const name of speciesNames) {
    await page.getByRole('checkbox', { name }).check()
  }
}

export const unlockSections = async (page) => {
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  await selectSpecies(page, ['Felis catus'])
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(
    page.getByRole('heading', { name: 'Consignment details' })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
}

const setUploadFile = (page, filename, bytes) =>
  page.getByLabel('Upload a file').setInputFiles({
    name: filename,
    mimeType: 'application/pdf',
    buffer: bytes ?? Buffer.from('%PDF-1.4 test upload')
  })

export const addDocument = async (page, entry) => {
  await page
    .getByLabel('Document reference')
    .fill(entry.accompanyingDocumentReference)
  const issued = entry.accompanyingDocumentDateOfIssue
  await page
    .getByLabel('Date of issue')
    .fill(`${issued.day}/${issued.month}/${issued.year}`)
  await setUploadFile(page, entry.filename)
  await page.getByRole('button', { name: 'Save and add another' }).click()
}

export const completeAnswerSections = async (page) => {
  const [line] = values.commodityLines
  const save = () =>
    page.getByRole('button', { name: 'Save and continue' }).click()
  const task = (name) => page.getByRole('link', { name }).click()

  await task('Where is this consignment coming from?')
  await chooseCountryOfOrigin(page)
  await page.getByRole('radio', { name: 'Yes' }).check()
  await page
    .getByLabel('Region of origin code', { exact: true })
    .fill(values.regionOfOriginCode)
  await page
    .getByLabel('Your internal reference for this consignment (optional)')
    .fill(values.internalReferenceNumber)
  await save()

  await task('What are you importing?')
  await selectSpecies(page, ['Bos taurus'])
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

  await task('Arrival details')
  await page
    .getByLabel('Arrival date at port of entry')
    .fill(ARRIVAL_DATE_IN_WINDOW)
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
  await page.getByRole('checkbox', { name: 'France' }).check()
  await page.getByRole('checkbox', { name: 'Belgium' }).check()
  await save()
  await page
    .getByRole('radio', { name: values.transporterType, exact: true })
    .check()
  await save()
  await page
    .getByRole('radio', { name: values.commercialTransporter.name })
    .check()
  await save()

  await task('Contact address')
  await page.getByRole('radio', { name: values.contactAddress.name }).check()
  await save()
}
