import * as commodities from '../../../../services/commodities/index.js'

// A multi-type commodity (Cow) shows a type select whose choice narrows the
// species offered; before a type is picked, or for single-type commodities, its
// full species set shows and no control is rendered.
export const groupSpecies = (group, typeFilters) => {
  if (!commodities.isMultiType(group.name)) return group.species
  const typeId = typeFilters[group.name]
  return typeId ? commodities.speciesForType(group.name, typeId) : group.species
}

export const typeItemsFor = (name, typeFilters, copy) => {
  const chosen = typeFilters[name] ?? ''
  return [
    { value: '', text: copy.typeFilter.all },
    ...commodities.typeSelectOptions(name)
  ].map((option) => ({ ...option, selected: option.value === chosen }))
}

export const resultGroups = (query, selected, typeFilters, copy) =>
  commodities.search(query).map((group) => {
    const multiType = commodities.isMultiType(group.name)
    return {
      legend: `${group.name} (${group.code})`,
      name: group.name,
      multiType,
      typeItems: multiType ? typeItemsFor(group.name, typeFilters, copy) : [],
      items: groupSpecies(group, typeFilters).map((option) => {
        const key = `${group.name}|${option.value}`
        return {
          value: key,
          text: option.text,
          checked: selected.includes(key)
        }
      })
    }
  })
