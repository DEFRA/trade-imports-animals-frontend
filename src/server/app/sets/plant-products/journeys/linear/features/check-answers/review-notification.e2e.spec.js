import { expect, test } from '@playwright/test'

import { axeViolations } from '../axe.e2e-helper.js'
import { copy as additionalCopy } from '../additional-details/copy/copy.en.js'
import { copy as commodityFeatureCopy } from '../commodities/copy/copy.en.js'
import { copy as contactCopy } from '../contact/copy/copy.en.js'
import { copy as documentsCopy } from '../documents/copy/copy.en.js'
import { copy as goodsMovementCopy } from '../goods-movement/copy/copy.en.js'
import { copy as nominatedCopy } from '../nominated-contacts/copy/copy.en.js'
import { copy as transportCopy } from '../transport/copy/copy.en.js'
import { copy as tradersCopy } from '../traders/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const hubUrl = /^\/plant-products\/notifications\/[^/]+$/
const reviewUrl =
  /^\/plant-products\/notifications\/[^/]+\/review-notification$/
const declarationUrl = /^\/plant-products\/notifications\/[^/]+\/declaration$/

const commodityCopy = commodityFeatureCopy.commodityBulkDetails
const searchCopy = commodityFeatureCopy.commoditySearch
const basicCopy = commodityFeatureCopy.basicDescription
const summaryCopy = commodityFeatureCopy.commoditySummary

const commodityFixtures = {
  '06011010': { description: 'Hyacinths', species: 'Albuca bracteata' },
  '08059000': { description: 'Other', species: 'Citrus australasica' },
  '06042090': { description: 'Other', species: 'Lens culinaris' }
}

const rowByTitle = (page, title) =>
  page.getByRole('listitem').filter({
    has: page.getByText(title, { exact: true })
  })

const openHubRow = (page, title) =>
  rowByTitle(page, title)
    .getByRole('link', { name: title, exact: true })
    .click()

const createNotification = async (page, { internalReference }) => {
  await page.goto('/plant-products')
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await page
    .getByRole('radio', { name: 'Plants, plant products and other objects' })
    .check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  const reference = await page.getByText(/^GBN-PP-/).textContent()

  await page.getByLabel('Country of origin').selectOption('FR')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Country from where consigned').selectOption('DE')
  if (internalReference) {
    await page
      .getByLabel('Add a reference number for this consignment (optional)')
      .fill(internalReference)
  }
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL((url) => hubUrl.test(url.pathname))
  return reference
}

const completePurpose = async (page) => {
  await openHubRow(page, 'Purpose')
  await page.getByRole('radio', { name: 'Internal market' }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
}

const addCommodity = async (page, code) => {
  const fixture = commodityFixtures[code]
  await page.getByLabel(searchCopy.codeSearch.label).fill(code)
  await page
    .locator('#commodity-code-search')
    .getByRole('button', { name: searchCopy.codeSearch.button })
    .click()
  await page
    .getByRole('table', { name: `${basicCopy.results.caption} ${code}` })
    .getByRole('button', {
      name: `${basicCopy.results.addLabel} ${fixture.species} ${basicCopy.results.addHidden} ${code}`
    })
    .click()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  if (code === '08059000') {
    const context =
      'for commodity line 2, species 1: CIDAC - Citrus australasica'
    await page
      .getByLabel(`Variety ${context}`, { exact: true })
      .selectOption('NONE')
    await page
      .getByLabel(`Class ${context}`, { exact: true })
      .selectOption('CLASS_I')
    await page
      .getByRole('button', {
        name: `Add another variety ${context}`,
        exact: true
      })
      .click()
    await page.getByRole('button', { name: 'Save and continue' }).click()
  }
}

const fieldName = (field, code) => {
  const fieldCopy = commodityCopy.fields[field]
  const fixture = commodityFixtures[code]
  return `${fieldCopy.label ?? fieldCopy.legend} for ${code} ${fixture.description}`
}

const fillCommodityLine = async (page, code, values) => {
  await page
    .getByLabel(fieldName('numberOfPackages', code))
    .fill(values.packages)
  await page.getByLabel(fieldName('packageType', code)).selectOption('BOX')
  await page.getByLabel(fieldName('quantity', code)).fill(values.quantity)
  await page.getByLabel(fieldName('quantityType', code)).selectOption('PIECES')
  await page.getByLabel(fieldName('netWeight', code)).fill(values.netWeight)

  const controlledGroup = page.getByRole('group', {
    name: fieldName('controlledAtmosphereContainer', code)
  })
  await controlledGroup
    .getByRole('radio', {
      name: `${commodityCopy.fields.controlledAtmosphereContainer.options.no} — ${fieldName('controlledAtmosphereContainer', code)}`
    })
    .check()

  if (code === '06011010') {
    const useGroup = page.getByRole('group', {
      name: fieldName('finishedOrPropagated', code)
    })
    await useGroup
      .getByLabel(`Finished product for final users for ${code} Hyacinths`)
      .check()
    const intendedGroup = page.getByRole('group', {
      name: fieldName('intendedForFinalUsers', code)
    })
    await intendedGroup
      .getByRole('radio', {
        name: `${commodityCopy.fields.intendedForFinalUsers.options.yes} — ${fieldName('intendedForFinalUsers', code)}`
      })
      .check()
  }

  if (values.testAndTrial) {
    await page.getByLabel(fieldName('testAndTrial', code)).check()
  }
}

const completeCommodities = async (page, { full }) => {
  const codes = full ? ['06011010', '08059000', '06042090'] : ['06042090']
  await openHubRow(page, 'Commodity')
  await page.getByRole('radio', { name: 'Manual entry' }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  for (const [index, code] of codes.entries()) {
    if (index > 0) {
      await page
        .getByRole('button', { name: summaryCopy.addAnotherCommodity })
        .click()
    }
    await addCommodity(page, code)
  }

  await page
    .getByRole('button', { name: summaryCopy.continue, exact: true })
    .click()
  if (!/\/commodity-bulk-details$/.test(new URL(page.url()).pathname)) {
    await page.goto(
      page.url().replace(/\/commodity-summary$/, '/commodity-bulk-details')
    )
  }
  await expect(page).toHaveURL(/\/commodity-bulk-details$/)
  const values = {
    '06011010': { packages: '1', quantity: '11', netWeight: '2' },
    '08059000': {
      packages: '3',
      quantity: '22',
      netWeight: '4',
      testAndTrial: true
    },
    '06042090': { packages: '5', quantity: '33', netWeight: '6' }
  }
  for (const code of codes) await fillCommodityLine(page, code, values[code])
  await page.getByRole('button', { name: 'Save and continue' }).click()
}

const completeAdditionalDetails = async (page, { full }) => {
  await openHubRow(page, 'Additional details')
  await page.getByLabel(additionalCopy.fields.totalGrossWeight.label).fill('20')
  if (full) {
    await page.getByLabel(additionalCopy.fields.grossVolume.label).fill('8')
    await page
      .getByLabel(additionalCopy.fields.grossVolumeUnit.label)
      .selectOption('LITRES')
  }
  await page.getByRole('button', { name: 'Save and continue' }).click()
}

const arrivalDate = () => {
  const now = new Date()
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  )
  return {
    day: String(date.getUTCDate()),
    month: String(date.getUTCMonth() + 1),
    year: String(date.getUTCFullYear())
  }
}

const completeTransport = async (page, { full }) => {
  await openHubRow(page, 'Transport to the BCP')
  await page
    .getByLabel(transportCopy.bcp.label)
    .selectOption(full ? 'CONPNT' : 'GBLHR4PP')
  if (full) {
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await page.getByLabel(transportCopy.premises.label).selectOption('INSPBER1')
  }
  await page.getByLabel(transportCopy.means.label).selectOption('ROAD_VEHICLE')
  await page.getByLabel(transportCopy.identification.label).fill('TRUCK-038')
  await page.getByLabel(transportCopy.documentReference.label).fill('CMR-038')
  const date = arrivalDate()
  await page.getByLabel(transportCopy.arrivalDate.day).fill(date.day)
  await page.getByLabel(transportCopy.arrivalDate.month).fill(date.month)
  await page.getByLabel(transportCopy.arrivalDate.year).fill(date.year)
  await page.getByLabel(transportCopy.arrivalTime.hour).fill('14')
  await page.getByLabel(transportCopy.arrivalTime.minute).fill('05')
  await page
    .getByRole('radio', {
      name: full
        ? transportCopy.usesContainers.yes
        : transportCopy.usesContainers.no,
      exact: true
    })
    .check()

  if (full) {
    for (const [index, values] of [
      ['CONT-1', 'SEAL-1', false],
      ['CONT-2', 'SEAL-2', true],
      ['CONT-3', 'SEAL-3', false]
    ].entries()) {
      const [containerNumber, sealNumber, officialSeal] = values
      await page
        .getByLabel(transportCopy.containers.containerNumber.label)
        .fill(containerNumber)
      await page
        .getByLabel(transportCopy.containers.sealNumber.label)
        .fill(sealNumber)
      const officialSealControl = page.getByLabel(
        transportCopy.containers.officialSeal.label
      )
      if (officialSeal) await officialSealControl.check()
      else await officialSealControl.uncheck()
      await page
        .getByRole('button', { name: transportCopy.containers.add })
        .click()
      await expect(page.getByRole('table')).toContainText(`CONT-${index + 1}`)
    }
  }

  await page.getByRole('button', { name: 'Save and continue' }).click()
  return date
}

const completeGoodsMovement = async (page, { full }) => {
  await openHubRow(page, 'Goods movement services')
  const ctcGroup = page.getByRole('group', {
    name: goodsMovementCopy.ctc.legend,
    exact: true
  })
  await ctcGroup
    .getByRole('radio', {
      name: full
        ? goodsMovementCopy.ctc.options.ADD_MRN_NOW
        : goodsMovementCopy.ctc.options.NO,
      exact: true
    })
    .check()
  if (full) {
    await page
      .getByLabel(goodsMovementCopy.mrn.label)
      .fill('24GB123456789AB012')
  }
  const gvmsGroup = page.getByRole('group', {
    name: goodsMovementCopy.gvms.legend,
    exact: true
  })
  await gvmsGroup
    .getByRole('radio', {
      name: full
        ? goodsMovementCopy.gvms.options.yes
        : goodsMovementCopy.gvms.options.no,
      exact: true
    })
    .check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
}

const completeContact = async (page, { full }) => {
  await openHubRow(page, 'Contact details')
  await page
    .getByLabel(contactCopy.fields.responsiblePersonName.label)
    .fill('Sam Reviewer')
  await page
    .getByLabel(contactCopy.fields.responsiblePersonEmail.label)
    .fill('sam@example.com')
  if (full) {
    await page
      .getByLabel(contactCopy.fields.responsiblePersonTelephone.label)
      .fill('07700 900982')
  }
  await page.getByRole('button', { name: 'Save and continue' }).click()
}

const completeNominatedContacts = async (page, { full }) => {
  await openHubRow(page, 'Nominated contacts')
  if (full) {
    for (const [index, agent] of [false, true, false].entries()) {
      const number = index + 1
      await page
        .getByLabel(nominatedCopy.labels.contactName)
        .fill(`Contact ${number}`)
      await page
        .getByLabel(nominatedCopy.labels.contactEmail)
        .fill(`contact${number}@example.com`)
      await page
        .getByLabel(nominatedCopy.labels.contactTelephone)
        .fill(`07700 90098${number}`)
      if (agent) {
        await page.getByLabel(nominatedCopy.labels.contactIsAgent).check()
      }
      await page
        .getByRole('button', { name: nominatedCopy.buttons.addAnother })
        .click()
    }
  }
  await page.getByRole('button', { name: 'Save and continue' }).click()
}

const addDocument = async (page, { type, reference, date }) => {
  await page.getByLabel(documentsCopy.labels.documentType).selectOption(type)
  await page.getByLabel(documentsCopy.labels.documentReference).fill(reference)
  await page.getByLabel(documentsCopy.labels.issueDate).fill(date)
  await page
    .getByRole('button', { name: documentsCopy.actions.addDocument })
    .click()
}

const completeDocuments = async (page, { full }) => {
  await openHubRow(page, 'Accompanying documents')
  const documents = full
    ? [
        { type: 'AIR_WAYBILL', reference: 'DOC-1', date: '01/07/2026' },
        {
          type: 'PHYTOSANITARY_CERTIFICATE',
          reference: 'DOC-2',
          date: '02/07/2026'
        },
        {
          type: 'COMMERCIAL_INVOICE',
          reference: 'DOC-3',
          date: '03/07/2026'
        }
      ]
    : [{ type: 'AIR_WAYBILL', reference: 'DOC-1', date: '01/07/2026' }]
  for (const document of documents) await addDocument(page, document)
  await page.getByRole('button', { name: 'Save and continue' }).click()
}

const fillById = async (page, values) => {
  for (const [field, value] of Object.entries(values)) {
    const control = page.locator(`#${field}`)
    if (field.endsWith('Country')) await control.selectOption(value)
    else await control.fill(value)
  }
}

const completeTraders = async (page, { full }) => {
  await openHubRow(page, 'Traders')
  await page
    .getByRole('radio', {
      name: full
        ? tradersCopy.tradersAddresses.delivery.options.no
        : tradersCopy.tradersAddresses.delivery.options.yes,
      exact: true
    })
    .check()
  if (full) {
    await fillById(page, {
      destinationName: 'Destination Depot',
      destinationAddressLine1: '1 Destination Road',
      destinationAddressLine2: 'Destination District',
      destinationAddressLine3: 'Destination Region',
      destinationCity: 'Dover',
      destinationPostcode: 'DO1 1AA',
      destinationCountry: 'NL',
      packerName: 'Packing House',
      packerAddressLine1: '2 Packing Road',
      packerAddressLine2: 'Packing District',
      packerAddressLine3: 'Packing Region',
      packerCity: 'Paris',
      packerPostcode: '75001',
      packerCountry: 'FR'
    })
  }
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  const consignor = {
    consignorName: 'Orchard Export SAS',
    consignorAddressLine1: '12 Rue des Vergers',
    consignorAddressLine2: full ? 'Building B' : '',
    consignorAddressLine3: full ? 'Export Quarter' : '',
    consignorCity: 'Lyon',
    consignorPostcode: full ? '69001' : '',
    consignorTelephone: '+33 4 72 00 00 00',
    consignorCountry: 'FR',
    consignorEmail: 'exports@example.com'
  }
  for (const [field, value] of Object.entries(consignor)) {
    const label = tradersCopy.consignorCreate.fields[field].label
    const control = page.getByLabel(label, { exact: true })
    if (field === 'consignorCountry') await control.selectOption(value)
    else await control.fill(value)
  }
  await page
    .getByRole('button', {
      name: tradersCopy.consignorCreate.continueLabel,
      exact: true
    })
    .click()
  await page
    .getByRole('button', {
      name: tradersCopy.consignorConfirmation.continueLabel,
      exact: true
    })
    .click()
  await page
    .getByRole('button', { name: 'Save and return to hub', exact: true })
    .click()
}

const completeJourney = async (page, { full }) => {
  const reference = await createNotification(page, {
    internalReference: full ? 'IMPORT-038' : ''
  })
  await completePurpose(page)
  await completeCommodities(page, { full })
  await completeAdditionalDetails(page, { full })
  const date = await completeTransport(page, { full })
  await completeGoodsMovement(page, { full })
  await completeContact(page, { full })
  await completeNominatedContacts(page, { full })
  await completeDocuments(page, { full })
  await completeTraders(page, { full })
  await expect(page).toHaveURL((url) => hubUrl.test(url.pathname))
  await openHubRow(page, 'Review and submit')
  await expect(page).toHaveURL((url) => reviewUrl.test(url.pathname))
  return { reference, date }
}

const cardFor = (page, heading) =>
  page.locator('section').filter({
    has: page.getByRole('heading', { level: 2, name: heading, exact: true })
  })

const expectAxeClean = async (page, state) => {
  const { all, seriousOrCritical } = await axeViolations(page)
  expect(
    seriousOrCritical,
    `Review notification ${state} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
  ).toEqual([])
}

const expectCardValues = async (page, heading, values) => {
  const section = cardFor(page, heading)
  for (const value of values) await expect(section).toContainText(value)
  return section
}

const summaryValueByKey = (page, key) =>
  page
    .locator('.govuk-summary-list__row')
    .filter({
      has: page.locator('.govuk-summary-list__key', { hasText: key })
    })
    .locator('.govuk-summary-list__value')

test.describe('plant-products review notification', () => {
  test('reads back the fully populated journey, pins collection order and exposes distinct Change names', async ({
    page
  }) => {
    test.slow()
    const { reference, date } = await completeJourney(page, { full: true })

    await expect(
      page.getByRole('heading', { level: 1, name: copy.title, exact: true })
    ).toHaveClass(/govuk-heading-xl/)
    await expect(page.getByText(reference, { exact: true })).toBeVisible()

    await expectCardValues(page, 'About the consignment', [
      'Plants, plant products and other objects',
      'France',
      'Germany',
      'IMPORT-038',
      'Internal market'
    ])
    await expectCardValues(page, 'Description of the goods', [
      '06011010',
      'Hyacinths',
      '08059000',
      '06042090',
      'Albuca bracteata, ABWBR',
      'Citrus australasica, CIDAC',
      'Lens culinaris, LENCU',
      'None',
      'Class I',
      'Intended for final users'
    ])
    await expectCardValues(page, 'Additional details', [
      'Total gross weight',
      '20',
      'Gross volume',
      '8',
      'litres',
      'Total net weight',
      '12',
      'Total packages',
      '9'
    ])
    await expectCardValues(page, 'Transport to the Border Control Post', [
      'Control Point - CONPNT',
      'Berryplants Ltd',
      'Road vehicle',
      'TRUCK-038',
      'CMR-038',
      `${date.day}/${date.month}/${date.year}`,
      '14:05',
      'CONT-1',
      'SEAL-1',
      'CONT-2',
      'SEAL-2',
      'CONT-3',
      'SEAL-3'
    ])
    await expectCardValues(page, 'Goods movement services', [
      'Yes – add MRN now',
      '24GB123456789AB012',
      'Yes'
    ])
    await expectCardValues(page, 'Contact details', [
      'Sam Reviewer',
      'sam@example.com',
      '07700 900982'
    ])
    await expectCardValues(page, 'Traders', [
      'Destination Depot',
      '1 Destination Road',
      'Destination District',
      'Destination Region',
      'Dover',
      'DO1 1AA',
      'Netherlands',
      'Packing House',
      'Orchard Export SAS',
      '12 Rue des Vergers',
      'Building B',
      'Export Quarter',
      'Lyon',
      '69001',
      '+33 4 72 00 00 00',
      'France',
      'exports@example.com'
    ])
    await expect(
      summaryValueByKey(page, copy.cards.traders.rows.destinationCountry)
    ).toHaveText('Netherlands')
    await expect(
      summaryValueByKey(page, copy.cards.traders.rows.packerCountry)
    ).toHaveText('France')

    const commodityRows = page
      .getByRole('table', { name: 'Commodities' })
      .locator('tbody tr')
    await expect(commodityRows.nth(1)).toContainText('08059000')
    await expect(commodityRows.nth(1)).toContainText('Other')
    const speciesRows = page
      .getByRole('table', { name: 'Species' })
      .locator('tbody tr')
    await expect(speciesRows.nth(1)).toContainText('Citrus australasica, CIDAC')
    await expect(
      page
        .getByRole('table', { name: 'Nominated contacts' })
        .locator('tbody tr')
        .nth(1)
        .locator('td')
    ).toHaveText(['Contact 2', 'contact2@example.com', '07700 900982', 'Yes'])
    await expect(
      page
        .getByRole('table', { name: 'Accompanying documents' })
        .locator('tbody tr')
        .nth(1)
        .locator('td')
    ).toHaveText(['Phytosanitary certificate', 'DOC-2', '02/07/2026'])
    await expect(
      page.getByRole('term').filter({ hasText: 'Container 2 number' })
    ).toBeVisible()

    const manualInputMethodRow = page
      .locator('.govuk-summary-list__row')
      .filter({
        has: page.getByText(
          commodityFeatureCopy.inputMethod.options.MANUAL.label,
          { exact: true }
        )
      })
    await expect(
      manualInputMethodRow.getByRole('link', {
        name: `Change ${commodityFeatureCopy.inputMethod.heading}`,
        exact: true
      })
    ).toBeVisible()

    const changeLinks = page.getByRole('link', { name: /^Change / })
    const names = await changeLinks.evaluateAll((links) =>
      links.map((link) => (link.textContent ?? '').trim().replace(/\s+/g, ' '))
    )
    expect(names.length).toBeGreaterThan(30)
    for (const name of names) expect(name).toMatch(/^Change .+/)
    expect(new Set(names).size).toBe(names.length)
    await expect(
      page.getByRole('link', { name: 'Change', exact: true })
    ).toHaveCount(0)

    await expectAxeClean(page, 'fully populated state')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page).toHaveURL((url) => declarationUrl.test(url.pathname))
    await expect(
      page.getByRole('heading', { level: 1, name: 'Declaration', exact: true })
    ).toBeVisible()
  })

  test('saving an edited country of origin returns to the review page with the new value', async ({
    page
  }) => {
    test.slow()
    await completeJourney(page, { full: true })

    await page.getByRole('link', { name: 'Change Country of origin' }).click()
    await expect(page).toHaveURL((url) => {
      return (
        url.pathname.endsWith('/country-of-origin') &&
        url.searchParams.get('change') === '1'
      )
    })
    await page.getByLabel('Country of origin').selectOption('NL')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page).toHaveURL((url) => reviewUrl.test(url.pathname))
    await expect(
      summaryValueByKey(page, copy.cards.aboutConsignment.rows.countryOfOrigin)
    ).toHaveText('Netherlands')
  })

  test('omits every out-of-scope row, shows the empty state and passes axe with missing answers', async ({
    page
  }) => {
    test.slow()
    await completeJourney(page, { full: false })

    await expect(page.getByText('Movement Reference Number (MRN)')).toHaveCount(
      0
    )
    await expect(page.getByText(/^Container \d/)).toHaveCount(0)
    await expect(page.getByText('Gross volume unit')).toHaveCount(0)
    await expect(page.getByText('Delivery address name')).toHaveCount(0)
    await expect(page.getByRole('table', { name: 'Varieties' })).toHaveCount(0)
    await expect(page.getByText(/Intended for final users/)).toHaveCount(0)
    await expect(page.getByText('Packer name')).toHaveCount(0)
    await expect(page.getByText('No nominated contacts added')).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Add a missing answer/ }).first()
    ).toBeVisible()

    await expectAxeClean(page, 'missing-answer state')
  })
})
