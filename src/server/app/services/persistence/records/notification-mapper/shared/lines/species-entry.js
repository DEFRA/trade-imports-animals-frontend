import { speciesLabel } from '../../commodity-reference.js'
import { compact } from '../compact.js'

// Species value → display name via the prototype's commodity reference data,
// falling back to the raw value for unknown codes — matching the skeleton's
// `speciesByValue.get(value) ?? value` resolution. One entry per line; the
// skeleton pairs one earTag/passport per species row, so the entry carries the
// line's first identifier unit. The microchip joins ear tag and passport as an
// identifier the backend species entry has a home for; the tattoo, the horse
// name, the two free-text identifiers and the permanent address still have
// none and are dropped.
export const speciesEntryFromLine = (line) => {
  const unit = line.animalIdentifiers?.[0] ?? {}
  return compact({
    value: line.speciesSelection,
    text: speciesLabel(line.speciesSelection) ?? line.speciesSelection,
    noOfAnimals: line.numberOfAnimalsQuantity,
    noOfPackages: line.numberOfPackages,
    earTag: unit.animalIdentifierEarTag,
    passport: unit.animalIdentifierPassport,
    microchip: unit.animalIdentifierMicrochip
  })
}
