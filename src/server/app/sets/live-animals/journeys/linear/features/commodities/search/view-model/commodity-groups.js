import * as commodities from '../../../../../../services/commodities/index.js'

export const commodityGroups = (selected) =>
  commodities.list().map((name) => ({
    legend: `${name} (${commodities.commodityCodeFor(name)})`,
    items: commodities.speciesFor(name).map((option) => {
      const key = `${name}|${option.value}`
      return {
        value: key,
        text: option.text,
        checked: selected.includes(key)
      }
    })
  }))
