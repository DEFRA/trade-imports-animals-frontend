import { isBlank } from '../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { stubOrganisationOperator } from '../../../../../../services/stub-org.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { copy as en } from '../../copy/copy.en.js'
import { readOnlyRow, row } from '../rows/summary-row.js'
import { countryText, yesNoText } from '../rows/value-text.js'

const copy = copyFor({ en, cy })
const cardCopy = copy.cards.traders

const importerText = () => {
  const importer = stubOrganisationOperator()
  return [
    importer.name,
    importer.address.addressLine1,
    importer.address.addressLine2,
    importer.address.addressLine3,
    importer.address.city,
    importer.address.postcode,
    countryText(importer.address.country)
  ]
    .filter(Boolean)
    .join(', ')
}

const editableRow = (journeyId, answers, scope, label, obligationName, value) =>
  row({ label, value, obligationName, journeyId, scope })

const fields = (prefix) => [
  `${prefix}Name`,
  `${prefix}AddressLine1`,
  `${prefix}AddressLine2`,
  `${prefix}AddressLine3`,
  `${prefix}City`,
  `${prefix}Postcode`,
  `${prefix}Country`
]

const rowsForFields = (
  prefix,
  journeyId,
  answers,
  scope,
  { answeredOnly = false } = {}
) =>
  fields(prefix)
    .filter((name) => !answeredOnly || !isBlank(answers[name]))
    .map((name) =>
      editableRow(
        journeyId,
        answers,
        scope,
        cardCopy.rows[name],
        name,
        name.endsWith('Country') ? countryText(answers[name]) : answers[name]
      )
    )
    .filter(Boolean)

const consignorRows = (journeyId, answers, scope) =>
  [
    'consignorName',
    'consignorAddressLine1',
    'consignorAddressLine2',
    'consignorAddressLine3',
    'consignorCity',
    'consignorPostcode',
    'consignorTelephone',
    'consignorCountry',
    'consignorEmail'
  ]
    .map((name) =>
      editableRow(
        journeyId,
        answers,
        scope,
        cardCopy.rows[name],
        name,
        name === 'consignorCountry' ? countryText(answers[name]) : answers[name]
      )
    )
    .filter(Boolean)

export const tradersCard = (journeyId, answers, scope) => {
  const sameAsImporter = answers.destinationSameAsConsignee === true
  return {
    heading: cardCopy.heading,
    rows: [
      readOnlyRow(cardCopy.rows.importer, importerText()),
      row({
        label: cardCopy.rows.deliveryAddress,
        value: yesNoText(sameAsImporter, copy.yesNo),
        obligationName: 'destinationSameAsConsignee',
        journeyId,
        scope
      }),
      ...(sameAsImporter
        ? [
            readOnlyRow(
              cardCopy.sameAsConsignee,
              `${importerText()} (${cardCopy.sameAsConsignee})`
            )
          ]
        : rowsForFields('destination', journeyId, answers, scope)),
      ...consignorRows(journeyId, answers, scope),
      ...rowsForFields('packer', journeyId, answers, scope, {
        answeredOnly: true
      })
    ].filter(Boolean),
    tables: []
  }
}
