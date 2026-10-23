import {
  hiddenActionsHeading,
  removeActionCell,
  wrappingCell
} from '../../../../../../../../../common/constants/table-cells.js'
import * as commodities from '../../../../../../services/commodities/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { buildCommodityGroups } from '../../view-model/commodity-groups.js'
import { addressFieldsFor, blankAddress } from '../address/fields.js'
import { fieldName } from '../fields.js'
import {
  blankValuesFor,
  permanentAddressApplies,
  scopedFields
} from '../identifier/fields.js'
import { identifierCellText, identifierColumns } from '../identifier/table.js'
import { holdsOneAnimal, identifierCapOf, isAtCap } from '../line-cap.js'
import { identificationCardAnchor } from './error-summary.js'

const copy = copyFor({ en, cy }).identification

const speciesTextOf = (entry) =>
  commodities.speciesLatinName(entry.speciesSelection) ?? ''

const overCountTextFor = (cap, species, units) =>
  cap !== null && units > cap
    ? copy.overCount(cap, species, units, units - cap)
    : null

const animalLabelOf = (species, number) =>
  species ? copy.animalRowNamed(species, number) : copy.animalRow(number)

const unitEntries = (index, species, columns, units) =>
  units.map((unit, unitIndex) => ({
    line: index,
    unitIndex,
    label: animalLabelOf(species, unitIndex + 1),
    cells: columns.map(([id]) => identifierCellText(unit, id)),
    removeAria: copy.removeRowAria(unitIndex + 1)
  }))

const wrappingCells = (texts) => texts.map((text) => wrappingCell({ text }))

const savedAnimalsTableOf = (columns, unitRows) => ({
  head: [
    ...wrappingCells([copy.table.animalColumn, ...columns]),
    hiddenActionsHeading(copy.table.actionsHidden)
  ],
  rows: unitRows.map((unitRow) => [
    ...wrappingCells([unitRow.label, ...unitRow.cells]),
    removeActionCell({
      action: `remove:${unitRow.line}:${unitRow.unitIndex}`,
      text: copy.removeRow,
      hiddenText: unitRow.removeAria
    })
  ])
})

const saveButtonTextFor = (cap, records) => {
  if (holdsOneAnimal(cap)) {
    return null
  }
  return cap - records === 1 ? copy.saveAndFinish : copy.saveAndAddAnother
}

const visibleIdentifierFields = (atCap, commodity, index, values, errors) =>
  atCap
    ? []
    : scopedFields(commodity).map((field) => ({
        ...field,
        id: fieldName(field.id, index),
        value: values[field.id] ?? '',
        error: errors[fieldName(field.id, index)]
      }))

const visibleAddressFields = (
  showAddress,
  atCap,
  index,
  addressValues,
  errors
) =>
  showAddress && !atCap ? addressFieldsFor(index, addressValues, errors) : []

export const buildCard = (answers, line, form, errors, changeCountHref) => {
  const { index, entry } = line
  const commodity = entry.commoditySelection
  const units = entry.animalIdentifiers ?? []
  const cap = identifierCapOf(answers, index)
  const atCap = isAtCap(cap, units.length)
  const species = speciesTextOf(entry)
  const values = form?.values ?? blankValuesFor(commodity)
  const addressValues = form?.addressValues ?? blankAddress()
  const showAddress = permanentAddressApplies(commodity)
  const columns = identifierColumns(commodity)
  const unitRows = unitEntries(index, species, columns, units)
  return {
    index,
    anchor: identificationCardAnchor(index),
    title: species,
    changeCountHref,
    counter: atCap ? null : copy.counter(species, units.length + 1, cap),
    overCountText: overCountTextFor(cap, species, units.length),
    saveButtonText: atCap ? null : saveButtonTextFor(cap, units.length),
    savedAnimalsTable: savedAnimalsTableOf(
      columns.map(([, label]) => label),
      unitRows
    ),
    hasUnits: units.length > 0,
    fields: visibleIdentifierFields(atCap, commodity, index, values, errors),
    showAddress: showAddress && !atCap,
    addressFields: visibleAddressFields(
      showAddress,
      atCap,
      index,
      addressValues,
      errors
    )
  }
}

export const buildSections = (
  answers,
  cardLines,
  forms,
  errors,
  changeCountHref
) =>
  buildCommodityGroups(cardLines).map(({ heading, lines }) => ({
    heading,
    cards: lines.map((line) =>
      buildCard(answers, line, forms.get(line.index), errors, changeCountHref)
    )
  }))
