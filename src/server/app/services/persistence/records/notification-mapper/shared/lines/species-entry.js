import { speciesLabel } from '../../../../../commodities/index.js'
import { compact } from '../compact.js'

// Species value → display name via the prototype's commodity reference data,
// falling back to the raw value for unknown codes — matching the skeleton's
// `speciesByValue.get(value) ?? value` resolution. One entry per line; the
// skeleton pairs one earTag/passport per species row, so the entry carries the
// line's first identifier unit.
export const speciesEntryFromLine = (line) => {
  const unit = line.animalIdentifiers?.[0] ?? {}
  return compact({
    value: line.speciesSelection,
    text: speciesLabel(line.speciesSelection) ?? line.speciesSelection,
    noOfAnimals: line.numberOfAnimalsQuantity,
    noOfPackages: line.numberOfPackages,
    earTag: unit.animalIdentifierEarTag,
    passport: unit.animalIdentifierPassport
  })
}
