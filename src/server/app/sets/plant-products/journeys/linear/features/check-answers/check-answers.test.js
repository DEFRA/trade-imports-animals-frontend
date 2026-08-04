import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { evaluateAnswers } from '../../../../../../bridge/evaluation.js'
import { makeScope } from '../../../../../../engine/index.js'
import { plantProducts } from '../../../../../../routes-plant-products.js'
import {
  enterSetContext,
  withSetContext
} from '../../../../../../shared/set-context.js'
import { buildSections } from './view-model/index.js'

const species = {
  albuca: {
    eppoCode: 'ABWBR',
    genusAndSpecies: 'Albuca bracteata',
    speciesId: '1325967',
    varieties: []
  },
  citrus: {
    eppoCode: 'CIDAC',
    genusAndSpecies: 'Citrus australasica',
    speciesId: '1364882',
    varieties: [{ variety: 'C5E27C5A-D13B-E9F5-B4B0-7234A7941208' }]
  },
  apple: {
    eppoCode: 'MABSD',
    genusAndSpecies: 'Malus domestica',
    speciesId: '1391442',
    varieties: [
      {
        variety: '03107EFA-9BCD-1089-565E-B28F73994DEC',
        varietyClass: 'CLASS_I'
      },
      {
        variety: '035ECF9F-7B6C-078D-60D5-D2947C23A366',
        varietyClass: 'CLASS_II'
      }
    ]
  }
}

const line = (commoditySelection, speciesEntry, overrides = {}) => ({
  commoditySelection,
  numberOfPackages: 2,
  packageType: 'BOX',
  quantity: 12,
  quantityType: 'PIECES',
  netWeight: 8.5,
  controlledAtmosphereContainer: false,
  finishedOrPropagated: 'FINISHED',
  intendedForFinalUsers: true,
  testAndTrial: false,
  species: [speciesEntry],
  ...overrides
})

const fullAnswers = {
  importType: 'plants',
  countryOfOrigin: 'FR',
  countryOfConsignment: 'DE',
  internalReference: 'IMPORT-038',
  reasonForImport: 'INTERNAL_MARKET',
  commodityInputMethod: 'MANUAL',
  commodityLines: [
    line('06011010', species.albuca, { numberOfPackages: 1, netWeight: 2 }),
    line('08059000', species.citrus, { numberOfPackages: 3, netWeight: 4 }),
    line('0808108090', species.apple, {
      numberOfPackages: 5,
      netWeight: 6
    })
  ],
  totalGrossWeight: 20,
  grossVolume: 12,
  grossVolumeUnit: 'METRES_CUBED',
  borderControlPost: 'CONPNT',
  inspectionPremises: 'INSPBER1',
  meansOfTransport: 'ROAD_VEHICLE',
  transportIdentification: 'TRUCK-038',
  transportDocumentReference: 'CMR-038',
  arrivalDate: '2026-08-03',
  arrivalTime: '14:05',
  usesContainers: true,
  containers: [
    { containerNumber: 'CONT-1', sealNumber: 'SEAL-1', officialSeal: false },
    { containerNumber: 'CONT-2', sealNumber: 'SEAL-2', officialSeal: true },
    { containerNumber: 'CONT-3', sealNumber: 'SEAL-3', officialSeal: false }
  ],
  commonTransitConvention: 'ADD_MRN_NOW',
  movementReferenceNumber: '24GB123456789AB012',
  usingGvms: true,
  responsiblePersonName: 'Sam Reviewer',
  responsiblePersonEmail: 'sam@example.com',
  responsiblePersonTelephone: '07700 900982',
  nominatedContacts: [
    {
      contactName: 'Contact One',
      contactEmail: 'one@example.com',
      contactTelephone: '01001',
      contactIsAgent: false
    },
    {
      contactName: 'Contact Two',
      contactEmail: 'two@example.com',
      contactTelephone: '01002',
      contactIsAgent: true
    },
    {
      contactName: 'Contact Three',
      contactEmail: 'three@example.com',
      contactTelephone: '01003',
      contactIsAgent: false
    }
  ],
  accompanyingDocuments: [
    {
      documentType: 'AIR_WAYBILL',
      documentReference: 'DOC-1',
      issueDate: { day: '1', month: '7', year: '2026' }
    },
    {
      documentType: 'PHYTOSANITARY_CERTIFICATE',
      documentReference: 'DOC-2',
      issueDate: { day: '2', month: '7', year: '2026' }
    },
    {
      documentType: 'COMMERCIAL_INVOICE',
      documentReference: 'DOC-3',
      issueDate: { day: '3', month: '7', year: '2026' }
    }
  ],
  destinationSameAsConsignee: false,
  destinationName: 'Destination Depot',
  destinationAddressLine1: '1 Destination Road',
  destinationAddressLine2: 'Destination District',
  destinationAddressLine3: 'Destination Region',
  destinationCity: 'Dover',
  destinationPostcode: 'DO1 1AA',
  destinationCountry: 'GB-ENG',
  packerName: 'Packing House',
  packerAddressLine1: '2 Packing Road',
  packerAddressLine2: 'Packing District',
  packerAddressLine3: 'Packing Region',
  packerCity: 'Paris',
  packerPostcode: '75001',
  packerCountry: 'FR',
  consignorName: 'Orchard Export SAS',
  consignorAddressLine1: '12 Rue des Vergers',
  consignorAddressLine2: 'Quartier Central',
  consignorAddressLine3: 'Rhone',
  consignorCity: 'Lyon',
  consignorPostcode: '69001',
  consignorTelephone: '+33 4 72 00 00 00',
  consignorCountry: 'FR',
  consignorEmail: 'exports@example.com'
}

const build = (answers = fullAnswers) =>
  withSetContext('plant-products', () =>
    buildSections(
      answers,
      makeScope(answers),
      evaluateAnswers(answers),
      'journey-038'
    )
  )

const card = (sections, heading) =>
  sections.find((section) => section.heading === heading)
const row = (section, key) =>
  section.rows.find((candidate) => candidate.key.text === key)
const table = (section, caption) =>
  section.tables.find((candidate) => candidate.caption === caption)
const texts = (tableRow) => tableRow.map((cell) => cell.text ?? cell.html)
const hrefIn = (html) => html?.match(/href="([^"]+)"/)?.[1]
const collectAffordances = (sections) =>
  sections.flatMap((section) => [
    ...(section.rows ?? []).flatMap((entry) => [
      ...(entry.actions?.items ?? []).map(({ href }) => href),
      ...(hrefIn(entry.value?.html) ? [hrefIn(entry.value.html)] : [])
    ]),
    ...(section.action?.href ? [section.action.href] : []),
    ...(section.tables ?? []).flatMap((sectionTable) => [
      ...sectionTable.head
        .filter(({ text }) => text === 'Action')
        .map(({ text }) => `column:${text}`),
      ...sectionTable.rows.flatMap((tableRow) =>
        tableRow.flatMap((tableCell) =>
          hrefIn(tableCell.html) ? [hrefIn(tableCell.html)] : []
        )
      )
    ])
  ])

const buildForMode = (answers, readOnly) =>
  withSetContext('plant-products', () =>
    buildSections(
      answers,
      makeScope(answers),
      evaluateAnswers(answers),
      'journey-038',
      readOnly
    )
  )

describe('plant-products check-answers view model', () => {
  let server

  beforeAll(async () => {
    server = Hapi.server()
    await server.register(plantProducts, {
      routes: { prefix: '/plant-products' }
    })
    enterSetContext('plant-products')
  })

  afterAll(async () => server.stop({ timeout: 0 }))

  it('builds the nine cards in hub-spoke order', () => {
    expect(build().map(({ heading }) => heading)).toEqual([
      'About the consignment',
      'Description of the goods',
      'Additional details',
      'Transport to the Border Control Post',
      'Goods movement services',
      'Contact details',
      'Nominated contacts',
      'Accompanying documents',
      'Traders'
    ])
  })

  it('resolves coded values only through shipped reference services', () => {
    const sections = build()
    expect(
      row(card(sections, 'About the consignment'), 'Country of origin').value
        .text
    ).toBe('France')
    expect(
      row(
        card(sections, 'Transport to the Border Control Post'),
        'Border Control Post'
      ).value.text
    ).toBe('Control Point - CONPNT')
    expect(
      row(
        card(sections, 'Transport to the Border Control Post'),
        'Inspection premises'
      ).value.text
    ).toBe('Berryplants Ltd')
  })

  it('formats the ISO arrival date and HH:mm time persisted by transport', () => {
    const transport = card(build(), 'Transport to the Border Control Post')

    expect(row(transport, 'Estimated arrival date').value.text).toBe('3/8/2026')
    expect(row(transport, 'Estimated arrival time').value.text).toBe('14:05')
  })

  it('formats weight and volume with at least two decimal places on check answers and review', () => {
    for (const readOnly of [false, true]) {
      const additional = card(
        buildForMode(
          { ...fullAnswers, totalGrossWeight: 2.5, grossVolume: 8 },
          readOnly
        ),
        'Additional details'
      )

      expect(row(additional, 'Total gross weight').value.text).toBe('2.50')
      expect(row(additional, 'Gross volume').value.text).toBe('8.00')
    }
  })

  it('renders a missing-answer link for an unanswered in-scope obligation', () => {
    const sections = build({ ...fullAnswers, internalReference: undefined })
    const missing = row(
      card(sections, 'About the consignment'),
      'Internal reference'
    )

    expect(missing.value.html).toContain('Add a missing answer')
    expect(missing.value.html).toContain(
      '/plant-products/notifications/journey-038/origin-of-import?change=1'
    )
    expect(missing.actions).toBeUndefined()
  })

  it('omits the MRN when CTC is not ADD_MRN_NOW and renders it when applicable', () => {
    const hidden = build({
      ...fullAnswers,
      commonTransitConvention: 'NO',
      movementReferenceNumber: 'ORPHAN-MRN'
    })
    const visible = build()

    expect(
      row(
        card(hidden, 'Goods movement services'),
        'Movement Reference Number (MRN)'
      )
    ).toBeUndefined()
    expect(
      row(
        card(visible, 'Goods movement services'),
        'Movement Reference Number (MRN)'
      ).value.text
    ).toBe('24GB123456789AB012')
  })

  it('omits orphaned container rows when usesContainers is false', () => {
    const sections = build({ ...fullAnswers, usesContainers: false })
    const transport = card(sections, 'Transport to the Border Control Post')

    expect(transport.rows.map(({ key }) => key.text)).not.toContain(
      'Container 2 number'
    )
    expect(transport.rows.map(({ value }) => value.text)).not.toContain(
      'CONT-2'
    )
  })

  it('renders the middle container by identity and order when containers are used', () => {
    const transport = card(build(), 'Transport to the Border Control Post')
    const containerNumbers = transport.rows.filter(({ key }) =>
      /^Container \d+ number$/.test(key.text)
    )

    expect(containerNumbers.map(({ value }) => value.text)).toEqual([
      'CONT-1',
      'CONT-2',
      'CONT-3'
    ])
    expect(containerNumbers[1].key.text).toBe('Container 2 number')
  })

  it('omits gross-volume unit without gross volume and renders it with volume', () => {
    const hidden = build({
      ...fullAnswers,
      grossVolume: undefined,
      grossVolumeUnit: 'METRES_CUBED'
    })
    const visible = build()

    expect(
      row(card(hidden, 'Additional details'), 'Gross volume unit')
    ).toBeUndefined()
    expect(
      row(card(visible, 'Additional details'), 'Gross volume unit').value.text
    ).toBe('metres cubed')
  })

  it('switches between destination leaves and the same-as-importer display', () => {
    const separate = card(build(), 'Traders')
    const same = card(
      build({ ...fullAnswers, destinationSameAsConsignee: true }),
      'Traders'
    )

    expect(row(separate, 'Delivery address name').value.text).toBe(
      'Destination Depot'
    )
    expect(row(same, 'Delivery address name')).toBeUndefined()
    expect(row(same, "Same as the importer's address").value.text).toContain(
      'Stubbed organisation'
    )
  })

  it('renders a missing-answer link for an unanswered same-as-consignee answer', () => {
    const traders = card(
      build({ ...fullAnswers, destinationSameAsConsignee: undefined }),
      'Traders'
    )
    const deliveryAddress = row(traders, 'Delivery address')

    expect(deliveryAddress.value.html).toContain('Add a missing answer')
    expect(deliveryAddress.value.html).toContain(
      '/plant-products/notifications/journey-038/traders-addresses?change=1'
    )
  })

  it('renders No for an explicit false same-as-consignee answer', () => {
    const traders = card(build(), 'Traders')

    expect(row(traders, 'Delivery address').value.text).toBe('No')
    expect(row(traders, 'Delivery address').value.html).toBeUndefined()
  })

  it('omits variety rows when none are captured', () => {
    const answers = {
      ...fullAnswers,
      commodityLines: fullAnswers.commodityLines.map((entry) => ({
        ...entry,
        species: entry.species.map((speciesEntry) => ({
          ...speciesEntry,
          varieties: []
        }))
      }))
    }

    expect(
      table(card(build(answers), 'Description of the goods'), 'Varieties')
    ).toBeUndefined()
  })

  it('renders intended-for-final-users only for the applicable commodity group', () => {
    const rows = card(build(), 'Description of the goods').rows
    expect(rows.map(({ key }) => key.text)).toEqual([
      'How do you want to add your commodity details?',
      'Intended for final users (commodity 1)'
    ])
  })

  it('hides duplicate card captions and keeps distinct commodity captions visible', () => {
    const sections = build()
    const commodities = card(sections, 'Description of the goods')

    expect(
      commodities.tables.map(({ caption, captionClasses }) => [
        caption,
        captionClasses
      ])
    ).toEqual([
      ['Commodities', 'govuk-table__caption--s'],
      ['Species', 'govuk-table__caption--s'],
      ['Varieties', 'govuk-table__caption--s'],
      ['Commodity details', 'govuk-table__caption--s']
    ])
    expect(
      table(card(sections, 'Nominated contacts'), 'Nominated contacts')
        .captionClasses
    ).toBe('govuk-visually-hidden')
    expect(
      table(card(sections, 'Accompanying documents'), 'Accompanying documents')
        .captionClasses
    ).toBe('govuk-visually-hidden')
  })

  it.each([
    ['MANUAL', 'Manual entry'],
    ['CSV', 'Upload from a CSV file']
  ])(
    'renders the %s commodity input method with its Change action',
    (method, text) => {
      const commodities = card(
        build({ ...fullAnswers, commodityInputMethod: method }),
        'Description of the goods'
      )
      const inputMethod = row(
        commodities,
        'How do you want to add your commodity details?'
      )

      expect(inputMethod.value.text).toBe(text)
      expect(inputMethod.actions.items[0].href).toBe(
        '/plant-products/notifications/journey-038/commodity-input-method?change=1'
      )
    }
  )

  it('omits unanswered packer rows and keeps answered packer rows', () => {
    const absent = Object.fromEntries(
      Object.entries(fullAnswers).filter(([key]) => !key.startsWith('packer'))
    )
    expect(
      card(build(absent), 'Traders').rows.some(({ key }) =>
        key.text.startsWith('Packer')
      )
    ).toBe(false)
    expect(row(card(build(), 'Traders'), 'Packer name').value.text).toBe(
      'Packing House'
    )
  })

  it('derives rollups without mutating or persisting them and gives them no Change action', () => {
    const before = structuredClone(fullAnswers)
    const additional = card(build(), 'Additional details')

    expect(row(additional, 'Total net weight')).toEqual({
      key: { text: 'Total net weight' },
      value: { text: '12' }
    })
    expect(row(additional, 'Total packages')).toEqual({
      key: { text: 'Total packages' },
      value: { text: '9' }
    })
    expect(fullAnswers).toEqual(before)
    expect(fullAnswers).not.toHaveProperty('totalNetWeight')
    expect(fullAnswers).not.toHaveProperty('totalPackages')
  })

  it('renders the middle commodity and species by identity and order', () => {
    const commodities = card(build(), 'Description of the goods')
    const commodityRows = table(commodities, 'Commodities').rows.map(texts)
    const speciesRows = table(commodities, 'Species').rows.map(texts)

    expect(commodityRows.map((entry) => entry[1])).toEqual([
      '06011010',
      '08059000',
      '0808108090'
    ])
    expect(commodityRows[1][2]).toBe('Other')
    expect(commodityRows[1][3]).toContain(
      '/plant-products/notifications/journey-038/commodity-search?change=1'
    )
    expect(speciesRows.map((entry) => entry[2])).toEqual([
      'Albuca bracteata, ABWBR',
      'Citrus australasica, CIDAC',
      'Malus domestica, MABSD'
    ])
    expect(speciesRows[1][0]).toBe('Commodity 2')
  })

  it('renders commodity-scoped varieties and classes by identity and order', () => {
    const varieties = table(
      card(build(), 'Description of the goods'),
      'Varieties'
    ).rows.map(texts)

    expect(varieties.map((entry) => entry[2])).toEqual([
      'None',
      'McIntosh Red',
      'Spartan'
    ])
    expect(varieties[1]).toEqual([
      'Commodity 3',
      'Malus domestica, MABSD',
      'McIntosh Red',
      'Class I'
    ])
    expect(varieties[0]).toEqual([
      'Commodity 2',
      'Citrus australasica, CIDAC',
      'None',
      ''
    ])
  })

  it('renders middle nominated-contact and document entries by identity and order', () => {
    const sections = build()
    const contacts = table(
      card(sections, 'Nominated contacts'),
      'Nominated contacts'
    ).rows.map(texts)
    const documents = table(
      card(sections, 'Accompanying documents'),
      'Accompanying documents'
    ).rows.map(texts)

    expect(contacts.map((entry) => entry[0])).toEqual([
      'Contact One',
      'Contact Two',
      'Contact Three'
    ])
    expect(contacts[1]).toEqual([
      'Contact Two',
      'two@example.com',
      '01002',
      'Yes'
    ])
    expect(documents.map((entry) => entry[1])).toEqual([
      'DOC-1',
      'DOC-2',
      'DOC-3'
    ])
    expect(documents[1][0]).toBe('Phytosanitary certificate')
  })

  it('uses an explicit nominated-contact empty state instead of an empty table', () => {
    const contacts = card(
      build({ ...fullAnswers, nominatedContacts: [] }),
      'Nominated contacts'
    )
    expect(contacts.empty).toBe('No nominated contacts added')
    expect(contacts.tables).toEqual([])
  })

  it('resolves every editable Change action to its owning page', () => {
    const sections = build()
    expect(
      row(card(sections, 'About the consignment'), 'Country of origin').actions
        .items[0]
    ).toEqual({
      href: '/plant-products/notifications/journey-038/country-of-origin?change=1',
      text: 'Change',
      visuallyHiddenText: 'Country of origin'
    })
    expect(card(sections, 'Nominated contacts').action.href).toBe(
      '/plant-products/notifications/journey-038/nominated-contact?change=1'
    )
  })

  it('suppresses every edit-affordance family in readOnly and preserves editable identities and count', () => {
    const answers = { ...fullAnswers, internalReference: undefined }
    const editable = buildForMode(answers, false)
    const readOnly = buildForMode(answers, true)
    const editableAffordances = collectAffordances(editable)
    const readOnlyAffordances = collectAffordances(readOnly)

    expect(editableAffordances).toHaveLength(62)
    expect(editableAffordances).toEqual(
      expect.arrayContaining([
        '/plant-products/notifications/journey-038/country-of-origin?change=1',
        '/plant-products/notifications/journey-038/origin-of-import?change=1',
        '/plant-products/notifications/journey-038/nominated-contact?change=1',
        '/plant-products/notifications/journey-038/accompanying-documents?change=1',
        '/plant-products/notifications/journey-038/commodity-search?change=1',
        'column:Action'
      ])
    )
    expect(readOnlyAffordances).toEqual([])
    expect(
      row(card(readOnly, 'About the consignment'), 'Internal reference')
    ).toEqual({
      key: { text: 'Internal reference' },
      value: { text: 'Not provided' }
    })
  })
})
