import * as state from '../../../../../../../../engine/index.js'
import * as commodities from '../../../../../../services/commodities/index.js'
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

const copy = copyFor({ en, cy }).identification

const speciesTextOf = (entry) =>
  commodities.speciesLabel(entry.speciesSelection) ??
  entry.speciesSelection ??
  ''

const cardTitleOf = (entry) => {
  const name = (entry.commoditySelection ?? '').trim()
  const code = commodities.commodityCodeFor(name)
  const commodity = code ? `${name} (${code})` : name
  const species = speciesTextOf(entry)
  return species ? `${commodity} — ${species}` : commodity
}

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

// The row is keyed by the animal, not by its place in the list: on a page
// holding four commodity lines "Animal 1" heads the first row of every one of
// them, where "Bos taurus 1" says which animal of which species it is.
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

const visibleIdentifierFields = (atMax, commodity, index, values, errors) =>
  atMax
    ? []
    : scopedFields(commodity).map((field) => ({
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

export const buildCard = (answers, line, form, errors) => {
  const { index, entry } = line
  const commodity = entry.commoditySelection
  const units = entry.animalIdentifiers ?? []
  const { cap, atMax, overBy } = capacityStateFor(answers, index, units.length)
  const species = speciesTextOf(entry)
  const values = form?.values ?? blankValuesFor(commodity)
  const addressValues = form?.addressValues ?? blankAddress()
  const showAddress = permanentAddressApplies(commodity)
  const columns = identifierColumns(commodity)
  return {
    index,
    anchor: `identification-card-${index}`,
    title: cardTitleOf(entry),
    species,
    counter: atMax ? null : counterOf(species, units.length, cap),
    maxReachedText: maxReachedTextFor(
      cap,
      species,
      units.length,
      overBy,
      atMax
    ),
    atMax,
    identifierColumns: columns.map(([, label]) => label),
    units: unitEntries(index, species, columns, units),
    hasUnits: units.length > 0,
    fields: visibleIdentifierFields(atMax, commodity, index, values, errors),
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
