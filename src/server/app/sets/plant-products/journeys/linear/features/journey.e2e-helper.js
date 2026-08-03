import { expect } from '@playwright/test'

import { copy as additionalCopy } from './additional-details/copy/copy.en.js'
import { copy as commodityFeatureCopy } from './commodities/copy/copy.en.js'
import { copy as contactCopy } from './contact/copy/copy.en.js'
import { copy as declarationCopy } from './declaration/copy/copy.en.js'
import { copy as documentsCopy } from './documents/copy/copy.en.js'
import { copy as goodsMovementCopy } from './goods-movement/copy/copy.en.js'
import { copy as nominatedCopy } from './nominated-contacts/copy/copy.en.js'
import { copy as transportCopy } from './transport/copy/copy.en.js'
import { copy as tradersCopy } from './traders/copy/copy.en.js'

export const BASE = '/plant-products'

export const commodityFixtures = {
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
  '0808108090': {
    description: 'Other',
    species: 'Malus domestica',
    eppoCode: 'MABSD'
  },
  '06042090': {
    description: 'Other',
    species: 'Lens culinaris',
    eppoCode: 'LENCU'
  }
}

const minimalJourneyValues = {
  importType: 'Plants, plant products and other objects',
  countryOfOrigin: { value: 'FR', text: 'France' },
  countryOfConsignment: { value: 'DE', text: 'Germany' },
  internalReference: '',
  reasonForImport: 'Internal market',
  commodities: {
    inputMethod: commodityFeatureCopy.inputMethod.options.MANUAL.label,
    lines: [
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
    totalGrossWeight: '20'
  },
  transport: {
    borderControlPost: { value: 'GBLHR4PP', text: 'Heathrow' },
    meansOfTransport: { value: 'ROAD_VEHICLE', text: 'Road vehicle' },
    identification: 'TRUCK-039',
    documentReference: 'CMR-039',
    arrivalTime: { hour: '14', minute: '05', text: '14:05' },
    usesContainers: false,
    containers: []
  },
  goodsMovement: {
    commonTransitConvention: goodsMovementCopy.ctc.options.NO,
    usingGvms: false
  },
  contact: {
    name: 'Sam Submitter',
    email: 'sam@example.com'
  },
  nominatedContacts: [],
  documents: [
    {
      type: { value: 'AIR_WAYBILL', text: 'Air waybill' },
      reference: 'DOC-039',
      date: '01/07/2026'
    }
  ],
  traders: {
    destinationSameAsConsignee: true,
    consignor: {
      consignorName: 'Orchard Export SAS',
      consignorAddressLine1: '12 Rue des Vergers',
      consignorAddressLine2: '',
      consignorAddressLine3: '',
      consignorCity: 'Lyon',
      consignorPostcode: '',
      consignorTelephone: '+33 4 72 00 00 00',
      consignorCountry: { value: 'FR', text: 'France' },
      consignorEmail: 'exports@example.com'
    }
  }
}

export const fullJourneyValues = {
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
        code: '0808108090',
        packages: '3',
        packageType: { value: 'BOX', text: 'Box' },
        quantity: '22',
        quantityType: { value: 'PIECES', text: 'Pieces' },
        netWeight: '4',
        controlledAtmosphereContainer: false,
        finishedOrPropagated: '',
        intendedForFinalUsers: null,
        testAndTrial: true,
        variety: {
          value: '03107EFA-9BCD-1089-565E-B28F73994DEC',
          text: 'McIntosh Red'
        },
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

export const journeyProfiles = Object.freeze({
  minimal: minimalJourneyValues,
  full: fullJourneyValues
})

const valuesFor = (profile) => {
  const values = journeyProfiles[profile]
  if (!values) {
    throw new Error(`Unknown plant-products journey profile: ${profile}`)
  }
  return values
}

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
const reviewUrl =
  /^\/plant-products\/notifications\/[^/]+\/review-notification$/

const commodityCopy = commodityFeatureCopy.commodityBulkDetails
const searchCopy = commodityFeatureCopy.commoditySearch
const basicCopy = commodityFeatureCopy.basicDescription
const summaryCopy = commodityFeatureCopy.commoditySummary

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

export const startNotification = async (page, { profile = 'minimal' } = {}) => {
  const values = valuesFor(profile)
  await page.goto(BASE)
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await page.getByRole('radio', { name: values.importType }).check()
  await saveAndContinue(page)
  const reference = await page.getByText(/^GBN-PP-/).textContent()
  await expect(page).toHaveURL((url) =>
    /^\/plant-products\/notifications\/[^/]+\/country-of-origin$/.test(
      url.pathname
    )
  )
  return reference
}

const completeOrigin = async (page, values) => {
  await page
    .getByLabel('Country of origin')
    .selectOption(values.countryOfOrigin.value)
  await saveAndContinue(page)
  await page
    .getByLabel('Country from where consigned')
    .selectOption(values.countryOfConsignment.value)
  if (values.internalReference) {
    await page
      .getByLabel('Add a reference number for this consignment (optional)')
      .fill(values.internalReference)
  }
  await saveAndContinue(page)
  await expect(page).toHaveURL((url) => hubUrl.test(url.pathname))
}

const completePurpose = async (page, values) => {
  await openHubRow(page, 'Purpose')
  await page.getByRole('radio', { name: values.reasonForImport }).check()
  await saveAndContinue(page)
}

const addCommodity = async (page, code, values) => {
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
  await saveAndContinue(page)

  const commodity = values.commodities.lines.find((line) => line.code === code)
  if (commodity.variety) {
    const context = 'for commodity line 2, species 1: MABSD - Malus domestica'
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
    await saveAndContinue(page)
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

  if (values.finishedOrPropagated) {
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

const completeCommodities = async (page, values, { allowSummaryBypass }) => {
  const { lines } = values.commodities
  await openHubRow(page, 'Commodity')
  await page
    .getByRole('radio', { name: values.commodities.inputMethod })
    .check()
  await saveAndContinue(page)

  for (const [index, { code }] of lines.entries()) {
    if (index > 0) {
      await page
        .getByRole('button', { name: summaryCopy.addAnotherCommodity })
        .click()
    }
    await addCommodity(page, code, values)
  }

  await page
    .getByRole('button', { name: summaryCopy.continue, exact: true })
    .click()
  if (
    allowSummaryBypass &&
    !/\/commodity-bulk-details$/.test(new URL(page.url()).pathname)
  ) {
    await page.goto(
      page.url().replace(/\/commodity-summary$/, '/commodity-bulk-details')
    )
  }
  await expect(page).toHaveURL(/\/commodity-bulk-details$/)
  for (const line of lines) await fillCommodityLine(page, line.code, line)
  await saveAndContinue(page)
}

const completeAdditionalDetails = async (page, values) => {
  await openHubRow(page, 'Additional details')
  await page
    .getByLabel(additionalCopy.fields.totalGrossWeight.label)
    .fill(values.additionalDetails.totalGrossWeight)
  if (values.additionalDetails.grossVolume) {
    await page
      .getByLabel(additionalCopy.fields.grossVolume.label)
      .fill(values.additionalDetails.grossVolume)
    await page
      .getByLabel(additionalCopy.fields.grossVolumeUnit.label)
      .selectOption(values.additionalDetails.grossVolumeUnit.value)
  }
  await saveAndContinue(page)
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

const completeTransport = async (page, values) => {
  const { transport } = values
  await openHubRow(page, 'Transport to the BCP')
  await page
    .getByLabel(transportCopy.bcp.label)
    .selectOption(transport.borderControlPost.value)
  if (transport.inspectionPremises) {
    await saveAndContinue(page)
    await expect(page.getByRole('alert')).toBeVisible()
    await page
      .getByLabel(transportCopy.premises.label)
      .selectOption(transport.inspectionPremises.value)
  }
  await page
    .getByLabel(transportCopy.means.label)
    .selectOption(transport.meansOfTransport.value)
  await page
    .getByLabel(transportCopy.identification.label)
    .fill(transport.identification)
  await page
    .getByLabel(transportCopy.documentReference.label)
    .fill(transport.documentReference)
  const date = arrivalDate()
  await page.getByLabel(transportCopy.arrivalDate.day).fill(date.day)
  await page.getByLabel(transportCopy.arrivalDate.month).fill(date.month)
  await page.getByLabel(transportCopy.arrivalDate.year).fill(date.year)
  await page
    .getByLabel(transportCopy.arrivalTime.hour)
    .fill(transport.arrivalTime.hour)
  await page
    .getByLabel(transportCopy.arrivalTime.minute)
    .fill(transport.arrivalTime.minute)
  await page
    .getByRole('radio', {
      name: transport.usesContainers
        ? transportCopy.usesContainers.yes
        : transportCopy.usesContainers.no,
      exact: true
    })
    .check()

  for (const [index, values] of transport.containers.entries()) {
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

  await saveAndContinue(page)
  return date
}

const completeGoodsMovement = async (page, values) => {
  const { goodsMovement } = values
  await openHubRow(page, 'Goods movement services')
  await page
    .getByRole('group', { name: goodsMovementCopy.ctc.legend, exact: true })
    .getByRole('radio', {
      name: goodsMovement.commonTransitConvention,
      exact: true
    })
    .check()
  if (goodsMovement.movementReferenceNumber) {
    await page
      .getByLabel(goodsMovementCopy.mrn.label)
      .fill(goodsMovement.movementReferenceNumber)
  }
  await page
    .getByRole('group', { name: goodsMovementCopy.gvms.legend, exact: true })
    .getByRole('radio', {
      name: goodsMovement.usingGvms
        ? goodsMovementCopy.gvms.options.yes
        : goodsMovementCopy.gvms.options.no,
      exact: true
    })
    .check()
  await saveAndContinue(page)
}

const completeContact = async (page, values) => {
  await openHubRow(page, 'Contact details')
  await page
    .getByLabel(contactCopy.fields.responsiblePersonName.label)
    .fill(values.contact.name)
  await page
    .getByLabel(contactCopy.fields.responsiblePersonEmail.label)
    .fill(values.contact.email)
  if (values.contact.telephone) {
    await page
      .getByLabel(contactCopy.fields.responsiblePersonTelephone.label)
      .fill(values.contact.telephone)
  }
  await saveAndContinue(page)
}

const completeNominatedContacts = async (page, values) => {
  await openHubRow(page, 'Nominated contacts')
  for (const contact of values.nominatedContacts) {
    await page.getByLabel(nominatedCopy.labels.contactName).fill(contact.name)
    await page.getByLabel(nominatedCopy.labels.contactEmail).fill(contact.email)
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
  await saveAndContinue(page)
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

const completeDocuments = async (page, values) => {
  await openHubRow(page, 'Accompanying documents')
  for (const document of values.documents) await addDocument(page, document)
  await saveAndContinue(page)
}

const fillById = async (page, values) => {
  for (const [field, value] of Object.entries(values)) {
    const control = page.locator(`#${field}`)
    if (field.endsWith('Country')) await control.selectOption(value.value)
    else await control.fill(value)
  }
}

const completeTraders = async (page, values) => {
  const { traders } = values
  await openHubRow(page, 'Traders')
  await page
    .getByRole('radio', {
      name: traders.destinationSameAsConsignee
        ? tradersCopy.tradersAddresses.delivery.options.yes
        : tradersCopy.tradersAddresses.delivery.options.no,
      exact: true
    })
    .check()
  if (!traders.destinationSameAsConsignee) {
    await fillById(page, {
      ...traders.destination,
      ...traders.packer
    })
  }
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  for (const [field, value] of Object.entries(traders.consignor)) {
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

export const completeAnswerSections = async (
  page,
  {
    profile = 'minimal',
    allowCommoditySummaryBypass = false,
    includeNominatedContacts = false
  } = {}
) => {
  const values = valuesFor(profile)
  await completeOrigin(page, values)
  await completePurpose(page, values)
  await completeCommodities(page, values, {
    allowSummaryBypass: allowCommoditySummaryBypass
  })
  await completeAdditionalDetails(page, values)
  const date = await completeTransport(page, values)
  await completeGoodsMovement(page, values)
  await completeContact(page, values)
  if (includeNominatedContacts) await completeNominatedContacts(page, values)
  await completeDocuments(page, values)
  await completeTraders(page, values)
  await expect(page).toHaveURL((url) => hubUrl.test(url.pathname))
  await expect(
    rowByTitle(page, 'Review and submit').getByRole('link', {
      name: 'Review and submit',
      exact: true
    })
  ).toBeVisible()
  return date
}

export const completeJourney = async (page, { profile = 'minimal' } = {}) => {
  const reference = await startNotification(page, { profile })
  const date = await completeAnswerSections(page, {
    profile,
    allowCommoditySummaryBypass: true,
    includeNominatedContacts: true
  })
  await openHubRow(page, 'Review and submit')
  await expect(page).toHaveURL((url) => reviewUrl.test(url.pathname))
  return { reference, date }
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
