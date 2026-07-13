import { breadcrumbs, hubPath, pagePath, TEMPLATES } from '../../config.js'
import { pageOfObligation, slugOfPage } from '../../flow/dispatch.js'
import { nextInSection } from '../../flow/navigation.js'
import * as state from '../../engine/index.js'
import { isBlank } from '../../lib/answered.js'
import { pageRoutes } from '../../shared/kit.js'
import { notificationViewPage as page } from './page.js'
import * as countries from '../../services/countries/index.js'
import { commodityLineValue } from '../commodities/list.controller.js'
import { animalIdentifierSummary } from '../commodities/animal-identifiers.list.controller.js'
import { documentValue } from '../documents/list.controller.js'
import * as importReasonPurpose from '../../services/import-reason-purpose/index.js'
import { unweanedApplies } from '../additional-details/controller.js'
import * as certification from '../../services/certification-purposes/index.js'
import { cphApplies } from '../cph-number/controller.js'
import * as transportReference from '../../services/transport-reference/index.js'

const view = `${TEMPLATES}/features/check-answers/template`
const NOT_PROVIDED = 'Not provided'

const YES_NO_LABEL = { yes: 'Yes', no: 'No' }

const changeHref = (obligationId) =>
  `${pagePath(slugOfPage(pageOfObligation(obligationId)))}?change=1`

const commodityRows = (answers) =>
  state
    .collectionView(answers, ['commodityLines'])
    .flatMap(({ index, entry }) => [
      {
        key: { text: `Commodity ${index + 1}` },
        value: { text: commodityLineValue(entry) },
        actions: {
          items: [
            {
              href: pagePath(slugOfPage(pageOfObligation('commodityLines'))),
              text: 'Change',
              visuallyHiddenText: `commodity ${index + 1}`
            }
          ]
        }
      },
      ...state
        .collectionView(answers, ['commodityLines', index, 'animalIdentifiers'])
        .map(({ index: unitIndex, entry: unit }) => ({
          key: { text: `Commodity ${index + 1} — animal ${unitIndex + 1}` },
          value: { text: animalIdentifierSummary(unit) },
          actions: {
            items: [
              {
                href: pagePath(`commodities/${index}/identifiers`),
                text: 'Change',
                visuallyHiddenText: `commodity ${index + 1} animal ${unitIndex + 1}`
              }
            ]
          }
        }))
    ])

const documentRows = (answers) =>
  state.collectionView(answers, ['documents']).map(({ index, entry }) => ({
    key: { text: `Document ${index + 1}` },
    value: { text: documentValue(entry) },
    actions: {
      items: [
        {
          href: pagePath(slugOfPage(pageOfObligation('documents'))),
          text: 'Change',
          visuallyHiddenText: `document ${index + 1}`
        }
      ]
    }
  }))

const dateText = (value) =>
  isBlank(value) ? NOT_PROVIDED : `${value.day}/${value.month}/${value.year}`

const buildRows = (answers) => {
  const answerOf = (id) => answers[id]
  const row = (key, value, obligationId) => ({
    key: { text: key },
    value: { text: isBlank(value) ? NOT_PROVIDED : value },
    actions: {
      items: [
        {
          href: changeHref(obligationId),
          text: 'Change',
          visuallyHiddenText: key.toLowerCase()
        }
      ]
    }
  })

  const rows = [
    row(
      'Country of origin',
      countries.originLabel(answerOf('countryOfOrigin')) ?? '',
      'countryOfOrigin'
    ),
    row(
      'Region of origin code required',
      YES_NO_LABEL[answerOf('regionOfOriginCodeRequirement')] ?? '',
      'regionOfOriginCodeRequirement'
    ),
    ...(answerOf('regionOfOriginCodeRequirement') === 'yes'
      ? [
          row(
            'Region of origin code',
            answerOf('regionOfOriginCode'),
            'regionOfOriginCode'
          )
        ]
      : []),
    row(
      'Internal reference number',
      answerOf('internalReferenceNumber'),
      'internalReferenceNumber'
    ),
    ...commodityRows(answers),
    row(
      'Reason for import',
      importReasonPurpose.reasonLabel(answerOf('reasonForImport')) ?? '',
      'reasonForImport'
    ),
    ...(answerOf('reasonForImport') === 'internalMarket'
      ? [
          row(
            'Purpose in the internal market',
            importReasonPurpose.purposeLabel(
              answerOf('purposeInInternalMarket')
            ) ?? '',
            'purposeInInternalMarket'
          )
        ]
      : []),
    row(
      'Animals certified for',
      certification.certificationLabel(answerOf('animalsCertifiedFor')) ?? '',
      'animalsCertifiedFor'
    ),
    ...(unweanedApplies(answers)
      ? [
          row(
            'Contains unweaned animals',
            YES_NO_LABEL[answerOf('containsUnweanedAnimals')] ?? '',
            'containsUnweanedAnimals'
          )
        ]
      : []),
    ...documentRows(answers),
    row('Place of origin', answerOf('placeOfOrigin')?.name, 'placeOfOrigin'),
    row('Consignor', answerOf('consignor')?.name, 'consignor'),
    row('Consignee', answerOf('consignee')?.name, 'consignee'),
    row('Importer', answerOf('importer')?.name, 'importer'),
    row(
      'Place of destination',
      answerOf('placeOfDestination')?.name,
      'placeOfDestination'
    ),
    ...(cphApplies(answers)
      ? [
          row(
            'County Parish Holding (CPH)',
            answerOf('countyParishHoldingCph'),
            'countyParishHoldingCph'
          )
        ]
      : []),
    row('Port of entry', answerOf('portOfEntry'), 'portOfEntry'),
    row(
      'Arrival date at port of entry',
      dateText(answerOf('arrivalDateAtPort')),
      'arrivalDateAtPort'
    ),
    row('Means of transport', answerOf('meansOfTransport'), 'meansOfTransport'),
    row(
      'Transport identification',
      answerOf('transportIdentification'),
      'transportIdentification'
    ),
    row(
      'Transport document reference',
      answerOf('transportDocumentReference'),
      'transportDocumentReference'
    ),
    ...(transportReference
      .overlandMeans()
      .includes(answerOf('meansOfTransport'))
      ? [
          row(
            'Transited countries',
            []
              .concat(answerOf('transitedCountries') ?? [])
              .map((code) => countries.originLabel(code) ?? code)
              .join(', '),
            'transitedCountries'
          )
        ]
      : []),
    row('Transporter type', answerOf('transporterType'), 'transporterType'),
    ...(answerOf('transporterType') === 'Commercial transporter'
      ? [
          row(
            'Commercial transporter',
            answerOf('commercialTransporter')?.name,
            'commercialTransporter'
          )
        ]
      : []),
    ...(answerOf('transporterType') === 'Private transporter'
      ? [
          row(
            'Private transporter',
            answerOf('privateTransporter')?.name,
            'privateTransporter'
          )
        ]
      : []),
    row('Contact address', answerOf('contactAddress')?.name, 'contactAddress')
  ]

  return rows
}

const renderCya = (h, answers) =>
  h.view(view, {
    pageTitle: 'Check your answers',
    heading: 'Check your answers',
    rows: buildRows(answers),
    backLink: hubPath(),
    breadcrumbs: breadcrumbs('Check your answers')
  })

const get = async (request, h) => {
  const { answers } = await state.get(request, h)
  return renderCya(h, answers)
}

const post = async (request, h) => {
  const { scope } = await state.get(request, h)
  return h.redirect(nextInSection(page.id, scope))
}

export const routes = pageRoutes(page, { get, post })
