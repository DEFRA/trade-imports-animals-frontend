import { breadcrumbs, hubPath, pagePath, TEMPLATES } from '../../config.js'
import { pageOfObligation, slugOfPage } from '../../flow/dispatch.js'
import { nextInSection } from '../../flow/navigation.js'
import * as state from '../../engine/index.js'
import { isBlank } from '../../lib/answered.js'
import { journeyStrip, pageRoutes } from '../../shared/kit.js'
import { notificationViewPage as page } from './page.js'
import * as countries from '../../services/countries/index.js'
import * as commodities from '../../services/commodities/index.js'
import { packagesApply } from '../commodities/details.controller.js'
import { IDENTIFIER_LABELS } from '../commodities/animal-identifiers.list.controller.js'
import * as importReasonPurpose from '../../services/import-reason-purpose/index.js'
import { unweanedApplies } from '../additional-details/controller.js'
import * as certification from '../../services/certification-purposes/index.js'
import { cphApplies } from '../cph-number/controller.js'
import * as transportReference from '../../services/transport-reference/index.js'
import * as ports from '../../services/ports/index.js'

const view = `${TEMPLATES}/features/check-answers/template`
const NOT_PROVIDED = 'Not provided'

const YES_NO_LABEL = { yes: 'Yes', no: 'No' }

const withChange = (href) => `${href}?change=1`

const changeHref = (obligationId) =>
  withChange(pagePath(slugOfPage(pageOfObligation(obligationId))))

const valueText = (value) => (isBlank(value) ? NOT_PROVIDED : value)

const dateText = (value) =>
  isBlank(value) ? NOT_PROVIDED : `${value.day}/${value.month}/${value.year}`

const escapeHtml = (value) =>
  value
    .toString()
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const row = (key, value, obligationId, visuallyHiddenText = null) => ({
  key: { text: key },
  value: { text: valueText(value) },
  actions: {
    items: [
      {
        href: changeHref(obligationId),
        text: 'Change',
        visuallyHiddenText: visuallyHiddenText ?? key.toLowerCase()
      }
    ]
  }
})

const addressLines = (address = {}) =>
  [
    address.addressLine1,
    address.addressLine2,
    address.addressLine3,
    address.townOrCity,
    address.county,
    address.postalOrZipCode
  ].filter((part) => !isBlank(part))

const partyLines = (party) => {
  if (isBlank(party?.name)) return null
  return [
    `<strong>${escapeHtml(party.name)}</strong>`,
    ...[...addressLines(party.address), party.address?.country]
      .filter((part) => !isBlank(part))
      .map(escapeHtml)
  ]
}

const partyRow = (key, party, obligationId, visuallyHiddenText = null) => {
  const lines = partyLines(party)
  return {
    key: { text: key },
    value: lines ? { html: lines.join('<br>') } : { text: NOT_PROVIDED },
    actions: {
      items: [
        {
          href: changeHref(obligationId),
          text: 'Change',
          visuallyHiddenText: visuallyHiddenText ?? key.toLowerCase()
        }
      ]
    }
  }
}

const importDetailsCard = (answers) => ({
  title: 'Import details',
  rows: [
    row(
      'Country of origin',
      countries.originLabel(answers.countryOfOrigin) ?? '',
      'countryOfOrigin'
    ),
    row(
      'Region of origin code required',
      YES_NO_LABEL[answers.regionOfOriginCodeRequirement] ?? '',
      'regionOfOriginCodeRequirement'
    ),
    ...(answers.regionOfOriginCodeRequirement === 'yes'
      ? [
          row(
            'Region of origin code',
            answers.regionOfOriginCode,
            'regionOfOriginCode'
          )
        ]
      : []),
    row(
      'Internal reference number',
      answers.internalReferenceNumber,
      'internalReferenceNumber'
    )
  ]
})

const additionalAnimalDetailsCard = (answers) => ({
  title: 'Additional animal details',
  rows: [
    row(
      'Certified for',
      certification.certificationLabel(answers.animalsCertifiedFor) ?? '',
      'animalsCertifiedFor'
    ),
    ...(unweanedApplies(answers)
      ? [
          row(
            'Includes unweaned animals',
            YES_NO_LABEL[answers.containsUnweanedAnimals] ?? '',
            'containsUnweanedAnimals'
          )
        ]
      : []),
    row(
      'Reason for import',
      importReasonPurpose.reasonLabel(answers.reasonForImport) ?? '',
      'reasonForImport'
    ),
    ...(answers.reasonForImport === 'internalMarket'
      ? [
          row(
            'Purpose in the market',
            importReasonPurpose.purposeLabel(answers.purposeInInternalMarket) ??
              '',
            'purposeInInternalMarket'
          )
        ]
      : [])
  ]
})

const speciesCardTitle = (entry) => {
  const name = (entry.commoditySelection ?? '').trim()
  if (!name) return NOT_PROVIDED
  const code = commodities.commodityCodeFor(name)
  return code ? `${name} (${code})` : name
}

const speciesText = (entry) =>
  []
    .concat(entry.speciesSelection ?? [])
    .map((code) => commodities.speciesLabel(code) ?? code)
    .join(', ')

const readOnlyRow = (key, value) => ({
  key: { text: key },
  value: { text: valueText(value) }
})

const identifierColumns = (units) => [
  ...Object.entries(IDENTIFIER_LABELS).filter(([id]) =>
    units.some((unit) => !isBlank(unit[id]))
  ),
  ...(units.some((unit) => !isBlank(unit.permanentAddress?.name))
    ? [['permanentAddress', 'Permanent address']]
    : [])
]

const identifierCell = (unit, id) =>
  id === 'permanentAddress'
    ? valueText(unit.permanentAddress?.name)
    : valueText(unit[id])

const identifierTable = (units) => {
  if (units.length === 0) return null
  const columns = identifierColumns(units)
  return {
    head: [
      { text: 'Animal' },
      ...columns.map(([, label]) => ({ text: label }))
    ],
    rows: units.map((unit, unitIndex) => [
      { text: `Animal ${unitIndex + 1}` },
      ...columns.map(([id]) => ({ text: identifierCell(unit, id) }))
    ])
  }
}

const speciesCards = (answers) =>
  state.collectionView(answers, ['commodityLines']).map(({ index, entry }) => {
    const units = state
      .collectionView(answers, ['commodityLines', index, 'animalIdentifiers'])
      .map(({ entry: unit }) => unit)
    return {
      title: speciesCardTitle(entry),
      actions: {
        items: [
          {
            href: changeHref('commodityLines'),
            text: 'Change',
            visuallyHiddenText: `commodity ${index + 1}`
          },
          ...(units.length
            ? [
                {
                  href: withChange(
                    pagePath(`commodities/${index}/identifiers`)
                  ),
                  text: 'Change',
                  visuallyHiddenText: `animal identifiers for commodity ${index + 1}`
                }
              ]
            : [])
        ]
      },
      rows: [
        readOnlyRow(
          'Commodity code',
          commodities.commodityCodeFor(entry.commoditySelection)
        ),
        readOnlyRow('Common name', entry.commoditySelection),
        readOnlyRow('Species', speciesText(entry)),
        readOnlyRow('Number of animals', entry.numberOfAnimalsQuantity),
        ...(packagesApply(entry.commoditySelection)
          ? [readOnlyRow('Number of packages', entry.numberOfPackages)]
          : [])
      ],
      identifierTable: identifierTable(units)
    }
  })

const arrivalDetailsCard = (answers) => ({
  title: 'Arrival details',
  rows: [
    row(
      'Port of entry',
      ports.label(answers.portOfEntry) ?? answers.portOfEntry,
      'portOfEntry'
    ),
    row(
      'Arrival date at port of entry',
      dateText(answers.arrivalDateAtPort),
      'arrivalDateAtPort'
    ),
    row('Means of transport', answers.meansOfTransport, 'meansOfTransport'),
    ...(transportReference.overlandMeans().includes(answers.meansOfTransport)
      ? [
          row(
            'Countries that the consignment will travel through',
            []
              .concat(answers.transitedCountries ?? [])
              .map((code) => countries.originLabel(code) ?? code)
              .join(', '),
            'transitedCountries'
          )
        ]
      : []),
    row(
      'Transport identification',
      answers.transportIdentification,
      'transportIdentification'
    ),
    row(
      'Transport document reference',
      answers.transportDocumentReference,
      'transportDocumentReference'
    )
  ]
})

const activeTransporter = (answers) => {
  if (answers.transporterType === 'Commercial') {
    return { party: answers.commercialTransporter, id: 'commercialTransporter' }
  }
  if (answers.transporterType === 'Private') {
    return { party: answers.privateTransporter, id: 'privateTransporter' }
  }
  return null
}

const transporterAddressRow = (party, id) => {
  const lines = addressLines(party?.address).map(escapeHtml)
  return {
    key: { text: 'Address' },
    value: lines.length ? { html: lines.join('<br>') } : { text: NOT_PROVIDED },
    actions: {
      items: [
        {
          href: changeHref(id),
          text: 'Change',
          visuallyHiddenText: 'transporter address'
        }
      ]
    }
  }
}

const transportDetailsCard = (answers) => {
  const active = activeTransporter(answers)
  return {
    title: 'Transport details',
    rows: [
      ...(active
        ? [
            row('Name', active.party?.name, active.id, 'transporter name'),
            transporterAddressRow(active.party, active.id),
            row(
              'Country',
              active.party?.address?.country,
              active.id,
              'transporter country'
            ),
            ...(isBlank(active.party?.approvalNumber)
              ? []
              : [
                  row(
                    'Approval number',
                    active.party.approvalNumber,
                    active.id,
                    'transporter approval number'
                  )
                ])
          ]
        : []),
      row(
        'Type',
        answers.transporterType,
        'transporterType',
        'transporter type'
      )
    ]
  }
}

const rolesAndAddressesCard = (answers) => ({
  title: 'Roles and addresses',
  rows: [
    partyRow('Place of origin', answers.placeOfOrigin, 'placeOfOrigin'),
    partyRow('Consignor', answers.consignor, 'consignor'),
    partyRow('Consignee', answers.consignee, 'consignee'),
    partyRow('Importer', answers.importer, 'importer'),
    partyRow(
      'Place of destination',
      answers.placeOfDestination,
      'placeOfDestination'
    ),
    ...(cphApplies(answers)
      ? [
          row(
            'County Parish Holding number (CPH)',
            answers.countyParishHoldingCph,
            'countyParishHoldingCph'
          )
        ]
      : [])
  ]
})

const contactAddressCard = (answers) => ({
  title: 'Contact address for this consignment',
  rows: [
    partyRow(
      'Address',
      answers.contactAddress,
      'contactAddress',
      'contact address'
    )
  ]
})

const documentsCard = (answers) => {
  const documents = state
    .collectionView(answers, ['documents'])
    .map(({ index, entry }) => ({
      heading: `Document ${index + 1}`,
      rows: [
        readOnlyRow('Document reference', entry.accompanyingDocumentReference),
        readOnlyRow('Document type', entry.accompanyingDocumentType),
        {
          key: { text: 'Date of issue' },
          value: { text: dateText(entry.accompanyingDocumentDateOfIssue) }
        },
        readOnlyRow('Attachment type', entry.accompanyingDocumentAttachmentType)
      ]
    }))
  if (documents.length === 0) return null
  return {
    title: 'Uploaded documents',
    actions: {
      items: [
        {
          href: changeHref('documents'),
          text: 'Change',
          visuallyHiddenText: 'documents'
        }
      ]
    },
    documents
  }
}

export const buildSections = (answers) => {
  const species = speciesCards(answers)
  const documents = documentsCard(answers)
  return [
    {
      heading: '1. About the consignment',
      groups: [
        { heading: 'Consignment details', cards: [importDetailsCard(answers)] },
        {
          heading: 'Commodity details',
          cards: [additionalAnimalDetailsCard(answers)]
        },
        ...(species.length ? [{ heading: 'Species', cards: species }] : [])
      ]
    },
    {
      heading: '2. Movement',
      groups: [
        {
          heading: null,
          cards: [arrivalDetailsCard(answers), transportDetailsCard(answers)]
        }
      ]
    },
    {
      heading: '3. Addresses',
      groups: [
        {
          heading: null,
          cards: [rolesAndAddressesCard(answers), contactAddressCard(answers)]
        }
      ]
    },
    ...(documents
      ? [
          {
            heading: '4. Documents',
            groups: [{ heading: null, cards: [documents] }]
          }
        ]
      : [])
  ]
}

const renderCya = (h, journey) =>
  h.view(view, {
    pageTitle: 'Check your answers',
    heading: 'Check your answers',
    journeyStrip: journeyStrip(journey),
    sections: buildSections(journey.answers),
    backLink: hubPath(),
    breadcrumbs: breadcrumbs('Check your answers')
  })

const get = async (request, h) => {
  const { journey } = await state.get(request, h)
  return renderCya(h, journey)
}

const post = async (request, h) => {
  const { scope } = await state.get(request, h)
  return h.redirect(nextInSection(page.id, scope))
}

export const routes = pageRoutes(page, { get, post })
