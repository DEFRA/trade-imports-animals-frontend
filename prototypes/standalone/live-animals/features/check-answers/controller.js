import { breadcrumbs, hubPath, pagePath, TEMPLATES } from '../../config.js'
import { pageOfObligation, slugOfPage } from '../../flow/dispatch.js'
import { nextInSection } from '../../flow/navigation.js'
import * as state from '../../engine/index.js'
import { isBlank } from '../../lib/answered.js'
import { journeyStrip, pageRoutes } from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { notificationViewPage as page } from './page.js'
import * as countries from '../../services/countries/index.js'
import * as commodities from '../../services/commodities/index.js'
import {
  animalIdentificationPage,
  consignmentDetailsPage
} from '../commodities/page.js'
import { IDENTIFIER_LABELS } from '../commodities/animal-identification.controller.js'
import * as importReasonPurpose from '../../services/import-reason-purpose/index.js'
import * as certification from '../../services/certification-purposes/index.js'
import * as ports from '../../services/ports/index.js'
import { appliesForCommodity } from '../../bridge/applicability.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'
import { copy as sharedEn } from '../../shared/copy.en.js'
import { copy as sharedCy } from '../../shared/copy.cy.js'

const view = `${TEMPLATES}/features/check-answers/template`

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const NOT_PROVIDED = copy.notProvided

const anyLineApplies = (answers, name) =>
  []
    .concat(answers.commodityLines ?? [])
    .some((line) => appliesForCommodity(name, line?.commoditySelection))

const regionCodeApplies = (answers, scope) => scope.has('regionOfOriginCode')

const purposeApplies = (answers, scope) => scope.has('purposeInInternalMarket')

const transitedCountriesApplies = (answers, scope) =>
  scope.has('transitedCountries')

const unweanedGate = (answers) =>
  anyLineApplies(answers, 'containsUnweanedAnimals')

const cphGate = (answers) => anyLineApplies(answers, 'countyParishHoldingCph')

const packagesGate = (commoditySelection) =>
  appliesForCommodity('numberOfPackages', commoditySelection)

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
        text: copy.change,
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
          text: copy.change,
          visuallyHiddenText: visuallyHiddenText ?? key.toLowerCase()
        }
      ]
    }
  }
}

const importDetailsCard = (answers, scope) => ({
  title: copy.cards.importDetails,
  rows: [
    row(
      copy.rows.countryOfOrigin,
      countries.originLabel(answers.countryOfOrigin) ?? '',
      'countryOfOrigin'
    ),
    row(
      copy.rows.regionCodeRequired,
      copy.yesNo[answers.regionOfOriginCodeRequirement] ?? '',
      'regionOfOriginCodeRequirement'
    ),
    ...(regionCodeApplies(answers, scope)
      ? [
          row(
            copy.rows.regionCode,
            answers.regionOfOriginCode,
            'regionOfOriginCode'
          )
        ]
      : []),
    row(
      copy.rows.internalReference,
      answers.internalReferenceNumber,
      'internalReferenceNumber'
    )
  ]
})

const additionalAnimalDetailsCard = (answers, scope) => ({
  title: copy.cards.additionalAnimalDetails,
  rows: [
    row(
      copy.rows.certifiedFor,
      certification.certificationLabel(answers.animalsCertifiedFor) ?? '',
      'animalsCertifiedFor'
    ),
    ...(unweanedGate(answers)
      ? [
          row(
            copy.rows.unweaned,
            copy.yesNo[answers.containsUnweanedAnimals] ?? '',
            'containsUnweanedAnimals'
          )
        ]
      : []),
    row(
      copy.rows.reasonForImport,
      importReasonPurpose.reasonLabel(answers.reasonForImport) ?? '',
      'reasonForImport'
    ),
    ...(purposeApplies(answers, scope)
      ? [
          row(
            copy.rows.purpose,
            importReasonPurpose.purposeLabel(answers.purposeInInternalMarket) ??
              '',
            'purposeInInternalMarket'
          )
        ]
      : [])
  ]
})

// One card per commodity line = one per species (inc-062); the title carries
// both the commodity and the species so same-commodity cards stay distinct.
const speciesCardTitle = (entry) => {
  const name = (entry.commoditySelection ?? '').trim()
  if (!name) return NOT_PROVIDED
  const code = commodities.commodityCodeFor(name)
  const commodity = code ? `${name} (${code})` : name
  const species = speciesText(entry)
  return species ? `${commodity} — ${species}` : commodity
}

const speciesText = (entry) =>
  entry.speciesSelection === undefined
    ? ''
    : (commodities.speciesLabel(entry.speciesSelection) ??
      entry.speciesSelection)

const readOnlyRow = (key, value) => ({
  key: { text: key },
  value: { text: valueText(value) }
})

const identifierColumns = (units) => [
  ...Object.entries(IDENTIFIER_LABELS).filter(([id]) =>
    units.some((unit) => !isBlank(unit[id]))
  ),
  ...(units.some((unit) => !isBlank(unit.permanentAddress?.name))
    ? [['permanentAddress', copy.identifierTable.permanentAddress]]
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
      { text: copy.identifierTable.animalColumn },
      ...columns.map(([, label]) => ({ text: label }))
    ],
    rows: units.map((unit, unitIndex) => [
      { text: copy.identifierTable.animalN(unitIndex + 1) },
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
            // The consolidated details page is the editing surface for a
            // line's quantities and its table manages the selection itself.
            href: withChange(pagePath(consignmentDetailsPage.slug)),
            text: copy.change,
            visuallyHiddenText: copy.hidden.commodity(index + 1)
          },
          ...(units.length
            ? [
                {
                  // The single identification surface (inc-063, D16); the
                  // fragment lands on this species' card.
                  href: `${withChange(
                    pagePath(animalIdentificationPage.slug)
                  )}#identification-card-${index}`,
                  text: copy.change,
                  visuallyHiddenText: copy.hidden.identifiersForCommodity(
                    index + 1
                  )
                }
              ]
            : [])
        ]
      },
      rows: [
        readOnlyRow(
          copy.rows.commodityCode,
          commodities.commodityCodeFor(entry.commoditySelection)
        ),
        readOnlyRow(copy.rows.commonName, entry.commoditySelection),
        readOnlyRow(copy.rows.species, speciesText(entry)),
        readOnlyRow(copy.rows.numberOfAnimals, entry.numberOfAnimalsQuantity),
        ...(packagesGate(entry.commoditySelection)
          ? [readOnlyRow(copy.rows.numberOfPackages, entry.numberOfPackages)]
          : [])
      ],
      identifierTable: identifierTable(units)
    }
  })

const arrivalDetailsCard = (answers, scope) => ({
  title: copy.cards.arrivalDetails,
  rows: [
    row(
      copy.rows.portOfEntry,
      ports.label(answers.portOfEntry) ?? answers.portOfEntry,
      'portOfEntry'
    ),
    row(
      copy.rows.arrivalDate,
      dateText(answers.arrivalDateAtPort),
      'arrivalDateAtPort'
    ),
    row(
      copy.rows.meansOfTransport,
      answers.meansOfTransport,
      'meansOfTransport'
    ),
    ...(transitedCountriesApplies(answers, scope)
      ? [
          row(
            copy.rows.transitedCountries,
            []
              .concat(answers.transitedCountries ?? [])
              .map((code) => countries.originLabel(code) ?? code)
              .join(', '),
            'transitedCountries'
          )
        ]
      : []),
    row(
      copy.rows.transportIdentification,
      answers.transportIdentification,
      'transportIdentification'
    ),
    row(
      copy.rows.transportDocumentReference,
      answers.transportDocumentReference,
      'transportDocumentReference'
    )
  ]
})

const activeTransporter = (answers, scope) => {
  if (scope.has('commercialTransporter')) {
    return {
      party: answers.commercialTransporter,
      id: 'commercialTransporter'
    }
  }
  if (scope.has('privateTransporter')) {
    return { party: answers.privateTransporter, id: 'privateTransporter' }
  }
  return null
}

const transporterAddressRow = (party, id) => {
  const lines = addressLines(party?.address).map(escapeHtml)
  return {
    key: { text: copy.rows.address },
    value: lines.length ? { html: lines.join('<br>') } : { text: NOT_PROVIDED },
    actions: {
      items: [
        {
          href: changeHref(id),
          text: copy.change,
          visuallyHiddenText: copy.hidden.transporterAddress
        }
      ]
    }
  }
}

const transportDetailsCard = (answers, scope) => {
  const active = activeTransporter(answers, scope)
  return {
    title: copy.cards.transportDetails,
    rows: [
      ...(active
        ? [
            row(
              copy.rows.name,
              active.party?.name,
              active.id,
              copy.hidden.transporterName
            ),
            transporterAddressRow(active.party, active.id),
            row(
              copy.rows.country,
              active.party?.address?.country,
              active.id,
              copy.hidden.transporterCountry
            ),
            ...(isBlank(active.party?.approvalNumber)
              ? []
              : [
                  row(
                    copy.rows.approvalNumber,
                    active.party.approvalNumber,
                    active.id,
                    copy.hidden.transporterApprovalNumber
                  )
                ])
          ]
        : []),
      row(
        copy.rows.type,
        answers.transporterType,
        'transporterType',
        copy.hidden.transporterType
      )
    ]
  }
}

const rolesAndAddressesCard = (answers) => ({
  title: copy.cards.rolesAndAddresses,
  rows: [
    partyRow(copy.rows.placeOfOrigin, answers.placeOfOrigin, 'placeOfOrigin'),
    partyRow(copy.rows.consignor, answers.consignor, 'consignor'),
    partyRow(copy.rows.consignee, answers.consignee, 'consignee'),
    partyRow(copy.rows.importer, answers.importer, 'importer'),
    partyRow(
      copy.rows.placeOfDestination,
      answers.placeOfDestination,
      'placeOfDestination'
    ),
    ...(cphGate(answers)
      ? [
          row(
            copy.rows.cph,
            answers.countyParishHoldingCph,
            'countyParishHoldingCph'
          )
        ]
      : [])
  ]
})

const contactAddressCard = (answers) => ({
  title: copy.cards.contactAddress,
  rows: [
    partyRow(
      copy.rows.address,
      answers.contactAddress,
      'contactAddress',
      copy.hidden.contactAddress
    )
  ]
})

const documentsCard = (answers) => {
  const documents = state
    .collectionView(answers, ['documents'])
    .map(({ index, entry }) => ({
      heading: copy.documentN(index + 1),
      rows: [
        readOnlyRow(
          copy.rows.documentReference,
          entry.accompanyingDocumentReference
        ),
        readOnlyRow(copy.rows.documentType, entry.accompanyingDocumentType),
        {
          key: { text: copy.rows.dateOfIssue },
          value: { text: dateText(entry.accompanyingDocumentDateOfIssue) }
        },
        readOnlyRow(
          copy.rows.attachmentType,
          entry.accompanyingDocumentAttachmentType
        )
      ]
    }))
  if (documents.length === 0) return null
  return {
    title: copy.cards.documents,
    actions: {
      items: [
        {
          href: changeHref('documents'),
          text: copy.change,
          visuallyHiddenText: copy.hidden.documents
        }
      ]
    },
    documents
  }
}

export const buildSections = (answers, scope) => {
  const species = speciesCards(answers)
  const documents = documentsCard(answers)
  return [
    {
      heading: copy.sections.aboutTheConsignment,
      groups: [
        {
          heading: copy.groups.consignmentDetails,
          cards: [importDetailsCard(answers, scope)]
        },
        {
          heading: copy.groups.commodityDetails,
          cards: [additionalAnimalDetailsCard(answers, scope)]
        },
        ...(species.length
          ? [{ heading: copy.groups.species, cards: species }]
          : [])
      ]
    },
    {
      heading: copy.sections.movement,
      groups: [
        {
          heading: null,
          cards: [
            arrivalDetailsCard(answers, scope),
            transportDetailsCard(answers, scope)
          ]
        }
      ]
    },
    {
      heading: copy.sections.addresses,
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
            heading: copy.sections.documents,
            groups: [{ heading: null, cards: [documents] }]
          }
        ]
      : [])
  ]
}

const renderCya = (h, journey, scope) =>
  h.view(view, {
    pageTitle: copy.title,
    heading: copy.title,
    copy,
    sharedCopy,
    journeyStrip: journeyStrip(journey),
    sections: buildSections(journey.answers, scope),
    backLink: hubPath(),
    breadcrumbs: breadcrumbs(copy.title)
  })

const get = async (request, h) => {
  const { journey, scope } = await state.get(request, h)
  return renderCya(h, journey, scope)
}

const post = async (request, h) => {
  const { scope } = await state.get(request, h)
  return h.redirect(nextInSection(page.id, scope))
}

export const routes = pageRoutes(page, { get, post })
