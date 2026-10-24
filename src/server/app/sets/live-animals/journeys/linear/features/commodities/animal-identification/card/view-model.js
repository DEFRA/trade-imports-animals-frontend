import * as state from '../../../../../../../../engine/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { addressFieldsFor, blankAddress } from '../address/fields.js'
import { fieldName } from '../fields.js'
import {
  blankValuesFor,
  permanentAddressApplies,
  scopedFields
} from '../identifier/fields.js'
import { identifierCellText, identifierColumns } from '../identifier/table.js'
import { lineTitle } from '../../line-title.js'
import { speciesLabel } from '../../species-label.js'

const copy = copyFor({ en, cy }).identification

const counterOf = (species, records, cap) =>
  cap === null
    ? copy.counterNoCap(species)
    : copy.counter(species, records + 1, cap)

const maxReachedTextFor = (cap, species, units, overBy, atMax) => {
  if (overBy > 0) {
    return copy.overCount(cap, species, units, overBy)
  }
  if (atMax) {
    return copy.allEntered(cap, species)
  }
  return null
}

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

const capacityStateFor = (answers, index, unitCount) => {
  const cap = state.collectionCapAt(answers, [
    'commodityLines',
    index,
    'animalIdentifiers'
  ])
  const atMax = cap !== null && unitCount >= cap
  const overBy = cap !== null ? unitCount - cap : 0
  return { cap, atMax, overBy }
}

const saveButtonTextFor = (cap, records) => {
  if (cap === null) {
    return copy.saveAndAddAnother
  }
  if (cap <= 1) {
    return null
  }
  return cap - records === 1 ? copy.saveAndFinish : copy.saveAndAddAnother
}

const visibleIdentifierFields = (
  atMax,
  commodityCode,
  index,
  values,
  errors
) =>
  atMax
    ? []
    : scopedFields(commodityCode).map((field) => ({
        ...field,
        id: fieldName(field.id, index),
        value: values[field.id] ?? '',
        error: errors[fieldName(field.id, index)]
      }))

const visibleAddressFields = (
  showAddress,
  atMax,
  index,
  addressValues,
  errors
) =>
  showAddress && !atMax ? addressFieldsFor(index, addressValues, errors) : []

export const buildCard = (answers, line, form, errors, changeCountHref) => {
  const { index, entry } = line
  const commodityCode = entry.commodityCode
  const units = entry.animalIdentifiers ?? []
  const { cap, atMax, overBy } = capacityStateFor(answers, index, units.length)
  const species = speciesLabel(entry)
  const values = form?.values ?? blankValuesFor(commodityCode)
  const addressValues = form?.addressValues ?? blankAddress()
  const showAddress = permanentAddressApplies(commodityCode, species)
  const columns = identifierColumns(commodityCode, species)
  return {
    index,
    anchor: `identification-card-${index}`,
    title: lineTitle(entry),
    species,
    changeCountHref,
    counter: atMax ? null : counterOf(species, units.length, cap),
    maxReachedText: maxReachedTextFor(
      cap,
      species,
      units.length,
      overBy,
      atMax
    ),
    atMax,
    saveButtonText: atMax ? null : saveButtonTextFor(cap, units.length),
    identifierColumns: columns.map(([, label]) => label),
    units: unitEntries(index, species, columns, units),
    hasUnits: units.length > 0,
    fields: visibleIdentifierFields(
      atMax,
      commodityCode,
      index,
      values,
      errors
    ),
    showAddress: showAddress && !atMax,
    addressFields: visibleAddressFields(
      showAddress,
      atMax,
      index,
      addressValues,
      errors
    )
  }
}
