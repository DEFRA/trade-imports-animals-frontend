import { readFileSync } from 'node:fs'
import { expect } from '@playwright/test'

import { COUNTRY_LABELS } from '../../src/server/live-animals/services/countries/stub.js'
import { PORTS } from '../../src/server/live-animals/services/ports/stub.js'
import { copy as transportCopy } from '../../src/server/live-animals/features/transport/copy.en.js'

export const BASE = ''

export const journeyIdFromPage = (page) => {
  const match = new URL(page.url()).pathname.match(/\/notifications\/([^/]+)/)
  if (!match) throw new Error(`No journey id in URL: ${page.url()}`)
  return match[1]
}

export const journeyUrl = (page, slug = '') =>
  `${BASE}/notifications/${journeyIdFromPage(page)}${slug ? `/${slug}` : ''}`

export const { values } = JSON.parse(
  readFileSync(
    new URL(
      '../../src/server/live-animals/flow/fixtures/happy-path.json',
      import.meta.url
    ),
    'utf8'
  )
)

const meansOfTransportLabel =
  transportCopy.portOfEntry.means.options[values.meansOfTransport]

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
  const combo = page.locator('input#countryOfOrigin')
  await combo.fill(name)
  await page.getByRole('option', { name, exact: true }).click()
}

const FIXTURE_PORT = PORTS.find((port) => port.code === values.portOfEntry)
const FIXTURE_PORT_OPTION = `${FIXTURE_PORT.name} (${FIXTURE_PORT.code})`

const choosePortOfEntry = async (page, query = FIXTURE_PORT.name) => {
  const combo = page.locator('input#portOfEntry')
  await combo.fill(query)
  await page
    .getByRole('option', { name: FIXTURE_PORT_OPTION, exact: true })
    .click()
}

const chooseTransitCountry = async (page, comboId, name) => {
  const combo = page.locator(`input#${comboId}`)
  await combo.fill(name)
  await page.getByRole('option', { name, exact: true }).click()
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

export const SEARCH_LABEL =
  'Search for a common name, commodity code or scientific name'

export const searchAndSelect = async (page, query, speciesNames) => {
  await page.getByLabel(SEARCH_LABEL).fill(query)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  for (const name of speciesNames) {
    await page.getByRole('checkbox', { name }).check()
  }
}

export const unlockSections = async (page) => {
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
  await page.getByLabel('Day').fill(entry.accompanyingDocumentDateOfIssue.day)
  await page
    .getByLabel('Month')
    .fill(entry.accompanyingDocumentDateOfIssue.month)
  await page.getByLabel('Year').fill(entry.accompanyingDocumentDateOfIssue.year)
  await setUploadFile(page, entry.filename)
  await page.getByRole('button', { name: 'Save and add another' }).click()
}

export const completeAnswerSections = async (page) => {
  const [line] = values.commodityLines
  const arrival = values.arrivalDateAtPort
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

  await task('Contact address')
  await page.getByRole('radio', { name: values.contactAddress.name }).check()
  await save()
}
