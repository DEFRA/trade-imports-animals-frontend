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
import { copy as cyCopy } from './copy/copy.cy.js'
import { copy } from './copy/copy.en.js'
import { intendedForFinalUsersRows } from './view-model/cards/commodities.js'
import { row } from './view-model/rows/summary-row.js'

const hubUrl = /^\/plant-products\/notifications\/[^/]+$/
const reviewUrl =
  /^\/plant-products\/notifications\/[^/]+\/review-notification$/
const declarationUrl = /^\/plant-products\/notifications\/[^/]+\/declaration$/

const commodityCopy = commodityFeatureCopy.commodityBulkDetails
const searchCopy = commodityFeatureCopy.commoditySearch
const basicCopy = commodityFeatureCopy.basicDescription
const summaryCopy = commodityFeatureCopy.commoditySummary

const renderSummaryRow = ({ key, value, actions }) => {
  const action = actions?.items[0]
  const actionHtml = action
    ? `<dd class="govuk-summary-list__actions"><a href="${action.href}">${action.text}<span class="govuk-visually-hidden"> ${action.visuallyHiddenText}</span></a></dd>`
    : ''
  return `<div class="govuk-summary-list__row"><dt class="govuk-summary-list__key">${key.text}</dt><dd class="govuk-summary-list__value">${value.html ?? value.text}</dd>${actionHtml}</div>`
}

const renderSummaryRows = (rows) =>
  `<dl class="govuk-summary-list">${rows.map(renderSummaryRow).join('')}</dl>`

const welshAccessibleNameRows = () => {
  const scope = { has: () => true }
  const changeLinkHref = '/change'
  const missingAnswer = row({
    label: cyCopy.cards.aboutConsignment.rows.internalReference,
    value: undefined,
    obligationName: 'internalReference',
    journeyId: 'journey-083',
    scope,
    localeCopy: cyCopy,
    changeLinkHref
  })
  const [intendedForFinalUsers] = intendedForFinalUsersRows(
    'journey-083',
    scope,
    [
      {
        index: 0,
        entry: {
          commoditySelection: '06011010',
          intendedForFinalUsers: true
        }
      }
    ],
    cyCopy,
    changeLinkHref
  )

  return renderSummaryRows([missingAnswer, intendedForFinalUsers])
}

const commodityFixtures = {
  '06011010': {
    description: 'Hyacinths',
    species: 'Albuca bracteata',
    eppoCode: 'ABWBR'
  },
  '08059000': {
    description: 'Other',
    species: 'Citrus australasica',
    eppoCode: 'CIDAC'
  },
  '06042090': {
    description: 'Other',
    species: 'Lens culinaris',
    eppoCode: 'LENCU'
  }
}

const fullJourneyValues = {
  importType: 'Plants, plant products and other objects',
  countryOfOrigin: { value: 'FR', text: 'France' },
  countryOfConsignment: { value: 'DE', text: 'Germany' },
  internalReference: 'IMPORT-038',
  reasonForImport: 'Internal market',
  commodities: {
    inputMethod: commodityFeatureCopy.inputMethod.options.MANUAL.label,
    lines: [
      {
        code: '06011010',
        packages: '1',
        packageType: { value: 'BOX', text: 'Box' },
        quantity: '11',
        quantityType: { value: 'PIECES', text: 'Pieces' },
        netWeight: '2',
        controlledAtmosphereContainer: false,
        finishedOrPropagated: {
          input: 'Finished product for final users',
          text: 'Finished'
        },
        intendedForFinalUsers: true,
        testAndTrial: false
      },
      {
        code: '08059000',
        packages: '3',
        packageType: { value: 'BOX', text: 'Box' },
        quantity: '22',
        quantityType: { value: 'PIECES', text: 'Pieces' },
        netWeight: '4',
        controlledAtmosphereContainer: false,
        finishedOrPropagated: '',
        intendedForFinalUsers: null,
        testAndTrial: true,
        variety: { value: 'NONE', text: 'None' },
        varietyClass: { value: 'CLASS_I', text: 'Class I' }
      },
      {
        code: '06042090',
        packages: '5',
        packageType: { value: 'BOX', text: 'Box' },
        quantity: '33',
        quantityType: { value: 'PIECES', text: 'Pieces' },
        netWeight: '6',
        controlledAtmosphereContainer: false,
        finishedOrPropagated: '',
        intendedForFinalUsers: null,
        testAndTrial: false
      }
    ]
  },
  additionalDetails: {
    totalGrossWeight: '20',
    grossVolume: '8',
    grossVolumeUnit: { value: 'LITRES', text: 'litres' }
  },
  transport: {
    borderControlPost: { value: 'CONPNT', text: 'Control Point - CONPNT' },
    inspectionPremises: { value: 'INSPBER1', text: 'Berryplants Ltd' },
    meansOfTransport: { value: 'ROAD_VEHICLE', text: 'Road vehicle' },
    identification: 'TRUCK-038',
    documentReference: 'CMR-038',
    arrivalTime: { hour: '14', minute: '05', text: '14:05' },
    usesContainers: true,
    containers: [
      { containerNumber: 'CONT-1', sealNumber: 'SEAL-1', officialSeal: false },
      { containerNumber: 'CONT-2', sealNumber: 'SEAL-2', officialSeal: true },
      { containerNumber: 'CONT-3', sealNumber: 'SEAL-3', officialSeal: false }
    ]
  },
  goodsMovement: {
    commonTransitConvention: 'Yes – add MRN now',
    movementReferenceNumber: '24GB123456789AB012',
    usingGvms: true
  },
  contact: {
    name: 'Sam Reviewer',
    email: 'sam@example.com',
    telephone: '07700 900982'
  },
  nominatedContacts: [
    {
      name: 'Contact 1',
      email: 'contact1@example.com',
      telephone: '07700 900981',
      agent: false
    },
    {
      name: 'Contact 2',
      email: 'contact2@example.com',
      telephone: '07700 900982',
      agent: true
    },
    {
      name: 'Contact 3',
      email: 'contact3@example.com',
      telephone: '07700 900983',
      agent: false
    }
  ],
  documents: [
    {
      type: { value: 'AIR_WAYBILL', text: 'Air waybill' },
      reference: 'DOC-1',
      date: '01/07/2026'
    },
    {
      type: {
        value: 'PHYTOSANITARY_CERTIFICATE',
        text: 'Phytosanitary certificate'
      },
      reference: 'DOC-2',
      date: '02/07/2026'
    },
    {
      type: { value: 'COMMERCIAL_INVOICE', text: 'Commercial invoice' },
      reference: 'DOC-3',
      date: '03/07/2026'
    }
  ],
  traders: {
    destinationSameAsConsignee: false,
    destination: {
      destinationName: 'Destination Depot',
      destinationAddressLine1: '1 Destination Road',
      destinationAddressLine2: 'Destination District',
      destinationAddressLine3: 'Destination Region',
      destinationCity: 'Dover',
      destinationPostcode: 'DO1 1AA',
      destinationCountry: { value: 'NL', text: 'Netherlands' }
    },
    packer: {
      packerName: 'Packing House',
      packerAddressLine1: '2 Packing Road',
      packerAddressLine2: 'Packing District',
      packerAddressLine3: 'Packing Region',
      packerCity: 'Paris',
      packerPostcode: '75001',
      packerCountry: { value: 'FR', text: 'France' }
    },
    consignor: {
      consignorName: 'Orchard Export SAS',
      consignorAddressLine1: '12 Rue des Vergers',
      consignorAddressLine2: 'Building B',
      consignorAddressLine3: 'Export Quarter',
      consignorCity: 'Lyon',
      consignorPostcode: '69001',
      consignorTelephone: '+33 4 72 00 00 00',
      consignorCountry: { value: 'FR', text: 'France' },
      consignorEmail: 'exports@example.com'
    }
  }
}

const yesNo = (value) => (value ? copy.yesNo.yes : copy.yesNo.no)
const displayedValue = (value) => value?.text ?? value

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
  await page.getByRole('radio', { name: fullJourneyValues.importType }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  const reference = await page.getByText(/^GBN-PP-/).textContent()

  await page
    .getByLabel('Country of origin')
    .selectOption(fullJourneyValues.countryOfOrigin.value)
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page
    .getByLabel('Country from where consigned')
    .selectOption(fullJourneyValues.countryOfConsignment.value)
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
  await page
    .getByRole('radio', { name: fullJourneyValues.reasonForImport })
    .check()
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

  const commodity = fullJourneyValues.commodities.lines.find(
    (line) => line.code === code
  )
  if (commodity.variety) {
    const context =
      'for commodity line 2, species 1: CIDAC - Citrus australasica'
    await page
      .getByLabel(`Variety ${context}`, { exact: true })
      .selectOption(commodity.variety.value)
    await page
      .getByLabel(`Class ${context}`, { exact: true })
      .selectOption(commodity.varietyClass.value)
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
  await page
    .getByLabel(fieldName('packageType', code))
    .selectOption(values.packageType.value)
  await page.getByLabel(fieldName('quantity', code)).fill(values.quantity)
  await page
    .getByLabel(fieldName('quantityType', code))
    .selectOption(values.quantityType.value)
  await page.getByLabel(fieldName('netWeight', code)).fill(values.netWeight)

  const controlledGroup = page.getByRole('group', {
    name: fieldName('controlledAtmosphereContainer', code)
  })
  await controlledGroup
    .getByRole('radio', {
      name: `${
        values.controlledAtmosphereContainer
          ? commodityCopy.fields.controlledAtmosphereContainer.options.yes
          : commodityCopy.fields.controlledAtmosphereContainer.options.no
      } — ${fieldName('controlledAtmosphereContainer', code)}`
    })
    .check()

  if (code === '06011010') {
    const useGroup = page.getByRole('group', {
      name: fieldName('finishedOrPropagated', code)
    })
    await useGroup
      .getByLabel(
        `${values.finishedOrPropagated.input} for ${code} ${commodityFixtures[code].description}`
      )
      .check()
    const intendedGroup = page.getByRole('group', {
      name: fieldName('intendedForFinalUsers', code)
    })
    await intendedGroup
      .getByRole('radio', {
        name: `${
          values.intendedForFinalUsers
            ? commodityCopy.fields.intendedForFinalUsers.options.yes
            : commodityCopy.fields.intendedForFinalUsers.options.no
        } — ${fieldName('intendedForFinalUsers', code)}`
      })
      .check()
  }

  if (values.testAndTrial) {
    await page.getByLabel(fieldName('testAndTrial', code)).check()
  }
}

const completeCommodities = async (page, { full }) => {
  const lines = full
    ? fullJourneyValues.commodities.lines
    : [fullJourneyValues.commodities.lines.at(-1)]
  await openHubRow(page, 'Commodity')
  await page
    .getByRole('radio', {
      name: fullJourneyValues.commodities.inputMethod
    })
    .check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  for (const [index, { code }] of lines.entries()) {
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
  for (const line of lines) await fillCommodityLine(page, line.code, line)
  await page.getByRole('button', { name: 'Save and continue' }).click()
}

const completeAdditionalDetails = async (page, { full }) => {
  await openHubRow(page, 'Additional details')
  await page
    .getByLabel(additionalCopy.fields.totalGrossWeight.label)
    .fill(fullJourneyValues.additionalDetails.totalGrossWeight)
  if (full) {
    await page
      .getByLabel(additionalCopy.fields.grossVolume.label)
      .fill(fullJourneyValues.additionalDetails.grossVolume)
    await page
      .getByLabel(additionalCopy.fields.grossVolumeUnit.label)
      .selectOption(fullJourneyValues.additionalDetails.grossVolumeUnit.value)
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
  const usesContainers = full
    ? fullJourneyValues.transport.usesContainers
    : false
  await openHubRow(page, 'Transport to the BCP')
  await page
    .getByLabel(transportCopy.bcp.label)
    .selectOption(
      full ? fullJourneyValues.transport.borderControlPost.value : 'GBLHR4PP'
    )
  if (full) {
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await page
      .getByLabel(transportCopy.premises.label)
      .selectOption(fullJourneyValues.transport.inspectionPremises.value)
  }
  await page
    .getByLabel(transportCopy.means.label)
    .selectOption(fullJourneyValues.transport.meansOfTransport.value)
  await page
    .getByLabel(transportCopy.identification.label)
    .fill(fullJourneyValues.transport.identification)
  await page
    .getByLabel(transportCopy.documentReference.label)
    .fill(fullJourneyValues.transport.documentReference)
  const date = arrivalDate()
  await page.getByLabel(transportCopy.arrivalDate.day).fill(date.day)
  await page.getByLabel(transportCopy.arrivalDate.month).fill(date.month)
  await page.getByLabel(transportCopy.arrivalDate.year).fill(date.year)
  await page
    .getByLabel(transportCopy.arrivalTime.hour)
    .fill(fullJourneyValues.transport.arrivalTime.hour)
  await page
    .getByLabel(transportCopy.arrivalTime.minute)
    .fill(fullJourneyValues.transport.arrivalTime.minute)
  await page
    .getByRole('radio', {
      name: usesContainers
        ? transportCopy.usesContainers.yes
        : transportCopy.usesContainers.no,
      exact: true
    })
    .check()

  if (usesContainers) {
    for (const [
      index,
      values
    ] of fullJourneyValues.transport.containers.entries()) {
      const { containerNumber, sealNumber, officialSeal } = values
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
  const usingGvms = full ? fullJourneyValues.goodsMovement.usingGvms : false
  await openHubRow(page, 'Goods movement services')
  const ctcGroup = page.getByRole('group', {
    name: goodsMovementCopy.ctc.legend,
    exact: true
  })
  await ctcGroup
    .getByRole('radio', {
      name: full
        ? fullJourneyValues.goodsMovement.commonTransitConvention
        : goodsMovementCopy.ctc.options.NO,
      exact: true
    })
    .check()
  if (full) {
    await page
      .getByLabel(goodsMovementCopy.mrn.label)
      .fill(fullJourneyValues.goodsMovement.movementReferenceNumber)
  }
  const gvmsGroup = page.getByRole('group', {
    name: goodsMovementCopy.gvms.legend,
    exact: true
  })
  await gvmsGroup
    .getByRole('radio', {
      name: usingGvms
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
    .fill(fullJourneyValues.contact.name)
  await page
    .getByLabel(contactCopy.fields.responsiblePersonEmail.label)
    .fill(fullJourneyValues.contact.email)
  if (full) {
    await page
      .getByLabel(contactCopy.fields.responsiblePersonTelephone.label)
      .fill(fullJourneyValues.contact.telephone)
  }
  await page.getByRole('button', { name: 'Save and continue' }).click()
}

const completeNominatedContacts = async (page, { full }) => {
  await openHubRow(page, 'Nominated contacts')
  if (full) {
    for (const contact of fullJourneyValues.nominatedContacts) {
      await page.getByLabel(nominatedCopy.labels.contactName).fill(contact.name)
      await page
        .getByLabel(nominatedCopy.labels.contactEmail)
        .fill(contact.email)
      await page
        .getByLabel(nominatedCopy.labels.contactTelephone)
        .fill(contact.telephone)
      if (contact.agent) {
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
  await page
    .getByLabel(documentsCopy.labels.documentType)
    .selectOption(type.value)
  await page.getByLabel(documentsCopy.labels.documentReference).fill(reference)
  await page.getByLabel(documentsCopy.labels.issueDate).fill(date)
  await page
    .getByRole('button', { name: documentsCopy.actions.addDocument })
    .click()
}

const completeDocuments = async (page, { full }) => {
  await openHubRow(page, 'Accompanying documents')
  const documents = full
    ? fullJourneyValues.documents
    : [fullJourneyValues.documents[0]]
  for (const document of documents) await addDocument(page, document)
  await page.getByRole('button', { name: 'Save and continue' }).click()
}

const fillById = async (page, values) => {
  for (const [field, value] of Object.entries(values)) {
    const control = page.locator(`#${field}`)
    if (field.endsWith('Country')) await control.selectOption(value.value)
    else await control.fill(value)
  }
}

const completeTraders = async (page, { full }) => {
  const destinationSameAsConsignee = full
    ? fullJourneyValues.traders.destinationSameAsConsignee
    : true
  await openHubRow(page, 'Traders')
  await page
    .getByRole('radio', {
      name: destinationSameAsConsignee
        ? tradersCopy.tradersAddresses.delivery.options.yes
        : tradersCopy.tradersAddresses.delivery.options.no,
      exact: true
    })
    .check()
  if (full) {
    await fillById(page, {
      ...fullJourneyValues.traders.destination,
      ...fullJourneyValues.traders.packer
    })
  }
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  const consignor = full
    ? fullJourneyValues.traders.consignor
    : {
        ...fullJourneyValues.traders.consignor,
        consignorAddressLine2: '',
        consignorAddressLine3: '',
        consignorPostcode: ''
      }
  for (const [field, value] of Object.entries(consignor)) {
    const label = tradersCopy.consignorCreate.fields[field].label
    const control = page.getByLabel(label, { exact: true })
    if (field === 'consignorCountry') await control.selectOption(value.value)
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
    internalReference: full ? fullJourneyValues.internalReference : ''
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

const expectAxeClean = async (page, state) => {
  const { all, seriousOrCritical } = await axeViolations(page)
  expect(
    seriousOrCritical,
    `Review notification ${state} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
  ).toEqual([])
}

const cardFor = (page, heading) =>
  page.locator('section').filter({
    has: page.getByRole('heading', { level: 2, name: heading, exact: true })
  })

const summaryValueByKey = (page, key, scope = page) =>
  scope
    .locator('.govuk-summary-list__row')
    .filter({
      has: page.locator('.govuk-summary-list__key', {
        hasText: new RegExp(
          `^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`
        )
      })
    })
    .locator('.govuk-summary-list__value')

const expectSummaryValues = async (page, cards) => {
  for (const [heading, values] of cards) {
    const card = cardFor(page, heading)
    for (const [key, value] of values) {
      await expect(
        summaryValueByKey(page, key, card),
        `Summary value for "${key}" in "${heading}"`
      ).toHaveText(value)
    }
  }
}

const expectTableMatrix = async (page, caption, expectedRows) => {
  const rows = page
    .getByRole('table', { name: caption, exact: true })
    .locator('tbody tr')
  await expect(rows, `${caption} row count`).toHaveCount(expectedRows.length)
  for (const [index, expectedCells] of expectedRows.entries()) {
    await expect(
      rows.nth(index).locator('td'),
      `${caption} row ${index + 1}`
    ).toHaveText(expectedCells)
  }
}

const totalOf = (field) =>
  String(
    fullJourneyValues.commodities.lines.reduce(
      (total, line) => total + Number(line[field]),
      0
    )
  )

const summaryExpectations = (date) => {
  const { cards } = copy
  const { transport, goodsMovement, contact, traders } = fullJourneyValues
  const [firstCommodityLine] = fullJourneyValues.commodities.lines
  const traderRows = cards.traders.rows
  const traderFieldRows = (fields) =>
    Object.entries(fields).map(([field, value]) => [
      traderRows[field],
      displayedValue(value)
    ])

  return [
    [
      cards.aboutConsignment.heading,
      [
        [cards.aboutConsignment.rows.importType, fullJourneyValues.importType],
        [
          cards.aboutConsignment.rows.countryOfOrigin,
          fullJourneyValues.countryOfOrigin.text
        ],
        [
          cards.aboutConsignment.rows.countryOfConsignment,
          fullJourneyValues.countryOfConsignment.text
        ],
        [
          cards.aboutConsignment.rows.internalReference,
          fullJourneyValues.internalReference
        ],
        [
          cards.aboutConsignment.rows.reasonForImport,
          fullJourneyValues.reasonForImport
        ]
      ]
    ],
    [
      cards.commodities.heading,
      [
        [
          commodityFeatureCopy.inputMethod.heading,
          fullJourneyValues.commodities.inputMethod
        ],
        [
          `${cards.commodities.columns.intendedForFinalUsers} (commodity 1)`,
          yesNo(firstCommodityLine.intendedForFinalUsers)
        ]
      ]
    ],
    [
      cards.additionalDetails.heading,
      [
        [
          cards.additionalDetails.rows.totalGrossWeight,
          fullJourneyValues.additionalDetails.totalGrossWeight
        ],
        [
          cards.additionalDetails.rows.grossVolume,
          fullJourneyValues.additionalDetails.grossVolume
        ],
        [
          cards.additionalDetails.rows.grossVolumeUnit,
          fullJourneyValues.additionalDetails.grossVolumeUnit.text
        ],
        [cards.additionalDetails.rows.totalNetWeight, totalOf('netWeight')],
        [cards.additionalDetails.rows.totalPackages, totalOf('packages')]
      ]
    ],
    [
      cards.transport.heading,
      [
        [
          cards.transport.rows.borderControlPost,
          transport.borderControlPost.text
        ],
        [
          cards.transport.rows.inspectionPremises,
          transport.inspectionPremises.text
        ],
        [
          cards.transport.rows.meansOfTransport,
          transport.meansOfTransport.text
        ],
        [
          cards.transport.rows.transportIdentification,
          transport.identification
        ],
        [
          cards.transport.rows.transportDocumentReference,
          transport.documentReference
        ],
        [
          cards.transport.rows.arrivalDate,
          `${date.day}/${date.month}/${date.year}`
        ],
        [cards.transport.rows.arrivalTime, transport.arrivalTime.text],
        [cards.transport.rows.usesContainers, yesNo(transport.usesContainers)],
        ...transport.containers.flatMap((container, index) => {
          const number = index + 1
          return [
            [
              cards.transport.rows.containerNumber(number),
              container.containerNumber
            ],
            [cards.transport.rows.sealNumber(number), container.sealNumber],
            [
              cards.transport.rows.officialSeal(number),
              yesNo(container.officialSeal)
            ]
          ]
        })
      ]
    ],
    [
      cards.goodsMovement.heading,
      [
        [
          cards.goodsMovement.rows.commonTransitConvention,
          goodsMovement.commonTransitConvention
        ],
        [
          cards.goodsMovement.rows.movementReferenceNumber,
          goodsMovement.movementReferenceNumber
        ],
        [cards.goodsMovement.rows.usingGvms, yesNo(goodsMovement.usingGvms)]
      ]
    ],
    [
      cards.contact.heading,
      [
        [cards.contact.rows.name, contact.name],
        [cards.contact.rows.email, contact.email],
        [cards.contact.rows.telephone, contact.telephone]
      ]
    ],
    [
      cards.traders.heading,
      [
        [
          traderRows.importer,
          'Stubbed organisation, KAINOS SOFTWARE LTD, BELFAST, BT7 1NT, Northern Ireland'
        ],
        [traderRows.deliveryAddress, yesNo(traders.destinationSameAsConsignee)],
        ...traderFieldRows(traders.destination),
        ...traderFieldRows(traders.consignor),
        ...traderFieldRows(traders.packer)
      ]
    ]
  ]
}

const tableExpectations = () => {
  const lines = fullJourneyValues.commodities.lines
  return {
    [copy.cards.commodities.tables.commodities]: lines.map((line, index) => [
      `Commodity ${index + 1}`,
      line.code,
      commodityFixtures[line.code].description,
      `Change commodity ${index + 1}`
    ]),
    [copy.cards.commodities.tables.species]: lines.map((line, index) => [
      `Commodity ${index + 1}`,
      'Species 1',
      `${commodityFixtures[line.code].species}, ${commodityFixtures[line.code].eppoCode}`
    ]),
    [copy.cards.commodities.tables.varieties]: lines
      .filter((line) => line.variety)
      .map((line, index) => [
        `Commodity ${lines.indexOf(line) + 1}`,
        `${commodityFixtures[line.code].species}, ${commodityFixtures[line.code].eppoCode}`,
        line.variety.text,
        line.varietyClass.text
      ]),
    [copy.cards.commodities.tables.measures]: lines.map((line, index) => [
      `Commodity ${index + 1}`,
      line.packages,
      line.packageType.text,
      line.quantity,
      line.quantityType.text,
      line.netWeight,
      yesNo(line.controlledAtmosphereContainer),
      displayedValue(line.finishedOrPropagated),
      yesNo(line.testAndTrial)
    ]),
    [copy.cards.nominatedContacts.heading]:
      fullJourneyValues.nominatedContacts.map((contact) => [
        contact.name,
        contact.email,
        contact.telephone,
        yesNo(contact.agent)
      ]),
    [copy.cards.documents.heading]: fullJourneyValues.documents.map(
      (document) => [document.type.text, document.reference, document.date]
    )
  }
}

test.describe('plant-products review notification', () => {
  test('renders distinct Welsh accessible names with locale-owned connectors', async ({
    page
  }) => {
    await page.setContent(await welshAccessibleNameRows())

    const missingAnswerRow = page
      .locator('.govuk-summary-list__row')
      .filter({ has: page.getByText('Cyfeirnod mewnol', { exact: true }) })
    const intendedForFinalUsersRow = page
      .locator('.govuk-summary-list__row')
      .filter({
        has: page.getByText(
          'Wedi’i fwriadu ar gyfer defnyddwyr terfynol (nwydd 1)',
          { exact: true }
        )
      })
    const missingAnswerLink = missingAnswerRow.getByRole('link')
    const intendedForFinalUsersLink = intendedForFinalUsersRow.getByRole('link')

    await expect(missingAnswerLink).toHaveAccessibleName(
      'Ychwanegu ateb sydd ar goll ar gyfer cyfeirnod mewnol'
    )
    await expect(intendedForFinalUsersLink).toHaveAccessibleName(
      'Newid wedi’i fwriadu ar gyfer defnyddwyr terfynol ar gyfer nwydd 1'
    )
    expect(await missingAnswerLink.ariaSnapshot()).not.toBe(
      await intendedForFinalUsersLink.ariaSnapshot()
    )
  })

  test('reads back the fully populated journey, pins collection order and exposes distinct Change names', async ({
    page
  }) => {
    test.slow()
    const { reference, date } = await completeJourney(page, { full: true })

    await expect(
      page.getByRole('heading', { level: 1, name: copy.title, exact: true })
    ).toHaveClass(/govuk-heading-xl/)
    await expect(page.getByText(reference, { exact: true })).toBeVisible()

    await expectSummaryValues(page, summaryExpectations(date))
    for (const [caption, expectedRows] of Object.entries(tableExpectations())) {
      await expectTableMatrix(page, caption, expectedRows)
    }
    for (const caption of Object.values(copy.cards.commodities.tables)) {
      const commodityCaption = page
        .getByRole('table', { name: caption, exact: true })
        .locator('caption')
      await expect(commodityCaption).toBeVisible()
      await expect(commodityCaption).toHaveClass(/govuk-table__caption--s/)
      await expect(commodityCaption).not.toHaveClass(/govuk-visually-hidden/)
    }
    for (const caption of [
      copy.cards.nominatedContacts.heading,
      copy.cards.documents.heading
    ]) {
      const duplicateTable = page.getByRole('table', {
        name: caption,
        exact: true
      })
      const duplicateCaption = duplicateTable.locator('caption')
      await expect(duplicateTable).toMatchAriaSnapshot(`
        - caption: ${caption}
      `)
      await expect(duplicateCaption).toHaveClass(/govuk-visually-hidden/)
      await expect(duplicateCaption).toHaveCSS('position', 'absolute')
      await expect(duplicateCaption).toHaveCSS('width', '1px')
      await expect(duplicateCaption).toHaveCSS('height', '1px')
      await expect(duplicateCaption).toHaveCSS('overflow', 'hidden')
      await expect(duplicateCaption).toHaveCSS(
        'clip',
        'rect(0px, 0px, 0px, 0px)'
      )
      await expect(duplicateCaption).not.toHaveClass(/govuk-table__caption--s/)
    }

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
