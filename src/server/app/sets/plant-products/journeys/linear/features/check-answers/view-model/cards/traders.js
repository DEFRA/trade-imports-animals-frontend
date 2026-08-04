import { isBlank } from '../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { placeholderOrganisationOperator } from '../../../../../../services/placeholder-org.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { copy as en } from '../../copy/copy.en.js'
import { readOnlyRow, row } from '../rows/summary-row.js'
import { countryText, yesNoText } from '../rows/value-text.js'

const copy = copyFor({ en, cy })
const cardCopy = copy.cards.traders

const importerText = () => {
  const importer = placeholderOrganisationOperator()
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

const editableRow = (
  journeyId,
  answers,
  scope,
  label,
  obligationName,
  value,
  readOnly
) => row({ label, value, obligationName, journeyId, scope, readOnly })

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
  { answeredOnly = false, readOnly = false } = {}
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
        name.endsWith('Country') ? countryText(answers[name]) : answers[name],
        readOnly
      )
    )
    .filter(Boolean)

const consignorRows = (journeyId, answers, scope, readOnly = false) =>
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
        name === 'consignorCountry'
          ? countryText(answers[name])
          : answers[name],
        readOnly
      )
    )
    .filter(Boolean)

export const tradersCard = (journeyId, answers, scope, readOnly = false) => {
  const sameAsImporter = answers.destinationSameAsConsignee
  return {
    heading: cardCopy.heading,
    rows: [
      readOnlyRow(cardCopy.rows.importer, importerText()),
      row({
        label: cardCopy.rows.deliveryAddress,
        value: yesNoText(sameAsImporter, copy.yesNo),
        obligationName: 'destinationSameAsConsignee',
        journeyId,
        scope,
        readOnly
      }),
      ...(sameAsImporter === true
        ? [
            readOnlyRow(
              cardCopy.sameAsConsignee,
              `${importerText()} (${cardCopy.sameAsConsignee})`
            )
          ]
        : rowsForFields('destination', journeyId, answers, scope, {
            readOnly
          })),
      ...consignorRows(journeyId, answers, scope, readOnly),
      ...rowsForFields('packer', journeyId, answers, scope, {
        answeredOnly: true,
        readOnly
      })
    ].filter(Boolean),
    tables: []
  }
}
