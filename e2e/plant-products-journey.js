import { expect } from '@playwright/test'

import { copy as additionalCopy } from '../src/server/app/sets/plant-products/journeys/linear/features/additional-details/copy/copy.en.js'
import { copy as commodityFeatureCopy } from '../src/server/app/sets/plant-products/journeys/linear/features/commodities/copy/copy.en.js'
import { copy as contactCopy } from '../src/server/app/sets/plant-products/journeys/linear/features/contact/copy/copy.en.js'
import { copy as declarationCopy } from '../src/server/app/sets/plant-products/journeys/linear/features/declaration/copy/copy.en.js'
import { copy as documentsCopy } from '../src/server/app/sets/plant-products/journeys/linear/features/documents/copy/copy.en.js'
import { copy as goodsMovementCopy } from '../src/server/app/sets/plant-products/journeys/linear/features/goods-movement/copy/copy.en.js'
import { copy as transportCopy } from '../src/server/app/sets/plant-products/journeys/linear/features/transport/copy/copy.en.js'
import { copy as tradersCopy } from '../src/server/app/sets/plant-products/journeys/linear/features/traders/copy/copy.en.js'

export const BASE = '/plant-products'

export const journeyIdFromPage = (page) => {
  const match = new URL(page.url()).pathname.match(
    /^\/plant-products\/notifications\/([^/]+)/
  )
  if (!match) {
    throw new Error(`No plant-products journey id in URL: ${page.url()}`)
  }
  return match[1]
}

export const journeyUrl = (page, slug = '') =>
  `${BASE}/notifications/${journeyIdFromPage(page)}${slug ? `/${slug}` : ''}`

const hubUrl = /^\/plant-products\/notifications\/[^/]+$/

const rowByTitle = (page, title) =>
  page.getByRole('listitem').filter({
    has: page.getByText(title, { exact: true })
  })

const openHubRow = (page, title) =>
  rowByTitle(page, title)
    .getByRole('link', { name: title, exact: true })
    .click()

const saveAndContinue = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

export const startNotification = async (page) => {
  await page.goto(BASE)
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await page
    .getByRole('radio', { name: 'Plants, plant products and other objects' })
    .check()
  await saveAndContinue(page)
  await expect(page).toHaveURL((url) =>
    /^\/plant-products\/notifications\/[^/]+\/country-of-origin$/.test(
      url.pathname
    )
  )
}

const completeOrigin = async (page) => {
  await page.getByLabel('Country of origin').selectOption('FR')
  await saveAndContinue(page)
  await page.getByLabel('Country from where consigned').selectOption('DE')
  await saveAndContinue(page)
  await expect(page).toHaveURL((url) => hubUrl.test(url.pathname))
}

const completePurpose = async (page) => {
  await openHubRow(page, 'Purpose')
  await page.getByRole('radio', { name: 'Internal market' }).check()
  await saveAndContinue(page)
}

const completeCommodities = async (page) => {
  const code = '06042090'
  const commodityCopy = commodityFeatureCopy.commodityBulkDetails
  const searchCopy = commodityFeatureCopy.commoditySearch
  const basicCopy = commodityFeatureCopy.basicDescription
  const summaryCopy = commodityFeatureCopy.commoditySummary

  await openHubRow(page, 'Commodity')
  await page.getByRole('radio', { name: 'Manual entry' }).check()
  await saveAndContinue(page)
  await page.getByLabel(searchCopy.codeSearch.label).fill(code)
  await page
    .locator('#commodity-code-search')
    .getByRole('button', { name: searchCopy.codeSearch.button })
    .click()
  await page
    .getByRole('table', { name: `${basicCopy.results.caption} ${code}` })
    .getByRole('button', {
      name: `${basicCopy.results.addLabel} Lens culinaris ${basicCopy.results.addHidden} ${code}`
    })
    .click()
  await saveAndContinue(page)
  await page
    .getByRole('button', { name: summaryCopy.continue, exact: true })
    .click()
  await expect(page).toHaveURL(/\/commodity-bulk-details$/)

  const fieldName = (field) => {
    const fieldCopy = commodityCopy.fields[field]
    return `${fieldCopy.label ?? fieldCopy.legend} for ${code} Other`
  }
  await page.getByLabel(fieldName('numberOfPackages')).fill('5')
  await page.getByLabel(fieldName('packageType')).selectOption('BOX')
  await page.getByLabel(fieldName('quantity')).fill('33')
  await page.getByLabel(fieldName('quantityType')).selectOption('PIECES')
  await page.getByLabel(fieldName('netWeight')).fill('6')
  await page
    .getByRole('group', {
      name: fieldName('controlledAtmosphereContainer')
    })
    .getByRole('radio', {
      name: `${commodityCopy.fields.controlledAtmosphereContainer.options.no} — ${fieldName('controlledAtmosphereContainer')}`
    })
    .check()
  await saveAndContinue(page)
}

const completeAdditionalDetails = async (page) => {
  await openHubRow(page, 'Additional details')
  await page.getByLabel(additionalCopy.fields.totalGrossWeight.label).fill('20')
  await saveAndContinue(page)
}

const tomorrow = () => {
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

const completeTransport = async (page) => {
  await openHubRow(page, 'Transport to the BCP')
  await page.getByLabel(transportCopy.bcp.label).selectOption('GBLHR4PP')
  await page.getByLabel(transportCopy.means.label).selectOption('ROAD_VEHICLE')
  await page.getByLabel(transportCopy.identification.label).fill('TRUCK-039')
  await page.getByLabel(transportCopy.documentReference.label).fill('CMR-039')
  const date = tomorrow()
  await page.getByLabel(transportCopy.arrivalDate.day).fill(date.day)
  await page.getByLabel(transportCopy.arrivalDate.month).fill(date.month)
  await page.getByLabel(transportCopy.arrivalDate.year).fill(date.year)
  await page.getByLabel(transportCopy.arrivalTime.hour).fill('14')
  await page.getByLabel(transportCopy.arrivalTime.minute).fill('05')
  await page
    .getByRole('radio', {
      name: transportCopy.usesContainers.no,
      exact: true
    })
    .check()
  await saveAndContinue(page)
}

const completeGoodsMovement = async (page) => {
  await openHubRow(page, 'Goods movement services')
  await page
    .getByRole('group', { name: goodsMovementCopy.ctc.legend, exact: true })
    .getByRole('radio', {
      name: goodsMovementCopy.ctc.options.NO,
      exact: true
    })
    .check()
  await page
    .getByRole('group', { name: goodsMovementCopy.gvms.legend, exact: true })
    .getByRole('radio', {
      name: goodsMovementCopy.gvms.options.no,
      exact: true
    })
    .check()
  await saveAndContinue(page)
}

const completeContact = async (page) => {
  await openHubRow(page, 'Contact details')
  await page
    .getByLabel(contactCopy.fields.responsiblePersonName.label)
    .fill('Sam Submitter')
  await page
    .getByLabel(contactCopy.fields.responsiblePersonEmail.label)
    .fill('sam@example.com')
  await saveAndContinue(page)
}

const completeDocuments = async (page) => {
  await openHubRow(page, 'Accompanying documents')
  await page
    .getByLabel(documentsCopy.labels.documentType)
    .selectOption('AIR_WAYBILL')
  await page.getByLabel(documentsCopy.labels.documentReference).fill('DOC-039')
  await page.getByLabel(documentsCopy.labels.issueDate).fill('01/07/2026')
  await page
    .getByRole('button', { name: documentsCopy.actions.addDocument })
    .click()
  await saveAndContinue(page)
}

const completeTraders = async (page) => {
  await openHubRow(page, 'Traders')
  await page
    .getByRole('radio', {
      name: tradersCopy.tradersAddresses.delivery.options.yes,
      exact: true
    })
    .check()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  const consignor = {
    consignorName: 'Orchard Export SAS',
    consignorAddressLine1: '12 Rue des Vergers',
    consignorAddressLine2: '',
    consignorAddressLine3: '',
    consignorCity: 'Lyon',
    consignorPostcode: '',
    consignorTelephone: '+33 4 72 00 00 00',
    consignorCountry: 'FR',
    consignorEmail: 'exports@example.com'
  }
  for (const [field, value] of Object.entries(consignor)) {
    const control = page.getByLabel(
      tradersCopy.consignorCreate.fields[field].label,
      { exact: true }
    )
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

export const completeAnswerSections = async (page) => {
  await completeOrigin(page)
  await completePurpose(page)
  await completeCommodities(page)
  await completeAdditionalDetails(page)
  await completeTransport(page)
  await completeGoodsMovement(page)
  await completeContact(page)
  await completeDocuments(page)
  await completeTraders(page)
  await expect(page).toHaveURL((url) => hubUrl.test(url.pathname))
  await expect(
    rowByTitle(page, 'Review and submit').getByRole('link', {
      name: 'Review and submit',
      exact: true
    })
  ).toBeVisible()
}

export const submitDeclaration = async (page) => {
  await openHubRow(page, 'Review and submit')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: declarationCopy.title,
      exact: true
    })
  ).toBeVisible()
  await page
    .getByRole('checkbox', { name: declarationCopy.declarationLabel })
    .check()
  await page
    .getByRole('button', { name: declarationCopy.submitButton, exact: true })
    .click()
}
