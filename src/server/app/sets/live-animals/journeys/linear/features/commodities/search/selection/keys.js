import * as commodities from '../../../../../../../../services/commodities/index.js'

export const splitKey = (key) => {
  const separator = key.indexOf('|')
  return [key.slice(0, separator), key.slice(separator + 1)]
}

export const isValidKey = (key) => {
  const [name, species] = splitKey(key)
  return commodities.isCommoditySpecies(name, species)
}

// Canonical selection order: commodity list order, then that commodity's
// species order — so the details page renders deterministic groups whatever
// order the boxes were ticked in.
export const canonicalKeys = () =>
  commodities
    .list()
    .flatMap((name) =>
      commodities.speciesFor(name).map((option) => `${name}|${option.value}`)
    )

export const normaliseKeys = (keys) => {
  const wanted = new Set(keys.filter(isValidKey))
  return canonicalKeys().filter((key) => wanted.has(key))
}
