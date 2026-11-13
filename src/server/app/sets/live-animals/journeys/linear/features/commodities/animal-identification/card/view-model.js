import {
  hiddenActionsHeading,
  removeActionCell,
  wrappingCell
} from '../../../../../../../../../common/constants/table-cells.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { buildCommodityGroups } from '../../view-model/commodity-groups.js'
import { lineKey } from '../../search/selection/line-key.js'
import { speciesLabel } from '../../species-label.js'
import { fieldName } from '../fields.js'
import { animalLabelOf } from '../animal-label.js'
import { blankValuesFor, scopedFields } from '../identifier/fields.js'
import { identifierCellText, identifierColumns } from '../identifier/table.js'
import { holdsOneAnimal, identifierCapOf, isAtCap } from '../line-cap.js'
import { identificationCardAnchor } from './error-summary.js'

const copy = copyFor({ en, cy }).identification

const overCountTextFor = (cap, label, units) =>
  cap !== null && units > cap
    ? copy.overCount(cap, label, units, units - cap)
    : null

const unitEntries = (key, label, columns, units) =>
  units.map((unit, unitIndex) => ({
    key,
    unitIndex,
    label: animalLabelOf(label, unitIndex + 1),
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
      action: `remove:${unitRow.key}:${unitRow.unitIndex}`,
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

const visibleIdentifierFields = (
  atCap,
  commodityCode,
  speciesLatinName,
  index,
  values,
  errors
) =>
  atCap
    ? []
    : scopedFields(commodityCode, speciesLatinName).map((field) => ({
        ...field,
        id: fieldName(field.id, index),
        value: values[field.id] ?? '',
        error: errors[fieldName(field.id, index)]
      }))

export const buildCard = (answers, line, form, errors, changeCountHref) => {
  const { index, entry } = line
  const commodityCode = entry.commodityCode
  const units = entry.animalIdentifiers ?? []
  const cap = identifierCapOf(answers, index)
  const atCap = isAtCap(cap, units.length)
  const speciesLatinName = entry.speciesLatinName
  const label = speciesLabel(entry)
  const values = form?.values ?? blankValuesFor(commodityCode, speciesLatinName)
  const columns = identifierColumns(commodityCode, speciesLatinName)
  const unitRows = unitEntries(lineKey(entry), label, columns, units)
  return {
    index,
    anchor: identificationCardAnchor(index),
    title: label,
    changeCountHref,
    counter: atCap ? null : copy.counter(label, units.length + 1, cap),
    overCountText: overCountTextFor(cap, label, units.length),
    saveButtonText: atCap ? null : saveButtonTextFor(cap, units.length),
    savedAnimalsTable: savedAnimalsTableOf(
      columns.map(([, columnLabel]) => columnLabel),
      unitRows
    ),
    hasUnits: units.length > 0,
    fields: visibleIdentifierFields(
      atCap,
      commodityCode,
      speciesLatinName,
      index,
      values,
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
